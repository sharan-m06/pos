package com.retailflow.pos.sales;

import com.retailflow.pos.ledger.*;
import com.retailflow.pos.product.ProductRepository;
import com.retailflow.pos.stock.*;
import jakarta.persistence.EntityNotFoundException;
import java.math.*;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SalesService {
  private final InvoiceRepository invoices; private final ProductRepository products; private final StockMovementService stock; private final LedgerService ledger;
  public SalesService(InvoiceRepository invoices,ProductRepository products,StockMovementService stock,LedgerService ledger){this.invoices=invoices;this.products=products;this.stock=stock;this.ledger=ledger;}
  public Invoice get(String id){return invoices.findById(id).orElseThrow(()->new EntityNotFoundException("Invoice not found"));}
  public List<Invoice> list(LocalDate from,LocalDate to,String salespersonId,String customerId){
    if(salespersonId!=null)return invoices.findBySalespersonIdOrderByInvoiceDateDesc(salespersonId);
    if(customerId!=null)return invoices.findByCustomerIdOrderByInvoiceDateDesc(customerId);
    return from!=null&&to!=null?invoices.findByInvoiceDateBetween(from.atStartOfDay(),to.plusDays(1).atStartOfDay().minusNanos(1)):invoices.findAll();
  }
  @Transactional public Invoice create(Invoice invoice,String actor){
    if(invoice.getInvoiceNo()==null)invoice.setInvoiceNo("INV-"+System.currentTimeMillis());
    BigDecimal subtotal=BigDecimal.ZERO,gst=BigDecimal.ZERO,total=BigDecimal.ZERO;
    for(var item:invoice.getItems()){
      var product=products.findById(item.getProductId()).orElseThrow(()->new EntityNotFoundException("Product not found"));
      var quantity=item.getQuantity();var base=item.getUnitPrice().multiply(quantity);
      var tax=base.multiply(item.getGstRate()).divide(new BigDecimal("100"),2,RoundingMode.HALF_UP);
      item.setProductName(product.getName());item.setGstAmount(tax);item.setLineTotal(base.add(tax));subtotal=subtotal.add(base);gst=gst.add(tax);total=total.add(item.getLineTotal());
    }
    invoice.setSubtotal(subtotal);invoice.setGstAmount(gst);invoice.setTotal(total.subtract(Objects.requireNonNullElse(invoice.getDiscount(),BigDecimal.ZERO)));invoice.setStatus(Invoice.Status.COMPLETED);
    var saved=invoices.save(invoice);
    for(var item:saved.getItems())stock.move(item.getProductId(),item.getQuantity().negate(),StockMovement.Type.SALE,saved.getId(),"INVOICE","Sale",actor);
    ledger.create(LedgerEntry.builder().accountType("SALES").accountName("Sales Revenue").credit(saved.getTotal()).debit(BigDecimal.ZERO).referenceId(saved.getId()).referenceType("INVOICE").description(saved.getInvoiceNo()).build());
    return saved;
  }
  @Transactional public Invoice refund(String id,String actor){
    var invoice=get(id);if(invoice.getStatus()==Invoice.Status.REFUNDED)return invoice;
    invoice.getItems().forEach(i->stock.move(i.getProductId(),i.getQuantity(),StockMovement.Type.RETURN,id,"INVOICE_REFUND","Refund",actor));
    ledger.create(LedgerEntry.builder().accountType("SALES").accountName("Sales Returns").debit(invoice.getTotal()).credit(BigDecimal.ZERO).referenceId(id).referenceType("REFUND").description(invoice.getInvoiceNo()).build());
    invoice.setStatus(Invoice.Status.REFUNDED);return invoices.save(invoice);
  }
}
