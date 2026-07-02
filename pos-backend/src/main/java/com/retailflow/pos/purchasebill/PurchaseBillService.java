package com.retailflow.pos.purchasebill;

import com.retailflow.pos.ledger.*;
import com.retailflow.pos.stock.*;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PurchaseBillService {
  public record PaymentRequest(BigDecimal amount,String paymentMode,LocalDate paymentDate){}
  private final PurchaseBillRepository repo; private final StockMovementService stock; private final LedgerService ledger;
  public PurchaseBillService(PurchaseBillRepository repo,StockMovementService stock,LedgerService ledger){this.repo=repo;this.stock=stock;this.ledger=ledger;}
  public PurchaseBill get(String id){return repo.findById(id).orElseThrow(()->new EntityNotFoundException("Purchase bill not found"));}
  public PurchaseBill save(PurchaseBill bill){if(bill.getBillNo()==null)bill.setBillNo("PB-"+System.currentTimeMillis());return repo.save(bill);}
  @Transactional public PurchaseBill confirm(String id,String actor){
    var bill=get(id);if(bill.getStatus()!=PurchaseBill.Status.DRAFT)return bill;
    bill.getItems().stream().filter(PurchaseBillItem::isUpdateStock).forEach(i->stock.move(i.getProductId(),i.getQuantity(),StockMovement.Type.PURCHASE,id,"PURCHASE_BILL","Bill "+bill.getBillNo(),actor));
    bill.setStockAppliedAt(LocalDateTime.now());bill.setStatus(PurchaseBill.Status.CONFIRMED);bill.setBalanceDue(bill.getGrandTotal().subtract(Objects.requireNonNullElse(bill.getAmountPaid(),BigDecimal.ZERO)));
    ledger.create(LedgerEntry.builder().accountType("PURCHASES").accountName("Purchases").debit(bill.getGrandTotal()).credit(BigDecimal.ZERO).partyId(bill.getSupplier()==null?null:bill.getSupplier().getId()).referenceId(id).referenceType("PURCHASE_BILL").description(bill.getBillNo()).build());
    return repo.save(bill);
  }
  @Transactional public PurchaseBill markPaid(String id,PaymentRequest payment){
    var bill=get(id);var paid=Objects.requireNonNullElse(bill.getAmountPaid(),BigDecimal.ZERO).add(payment.amount()).min(bill.getGrandTotal());
    bill.setAmountPaid(paid);bill.setBalanceDue(bill.getGrandTotal().subtract(paid).max(BigDecimal.ZERO));bill.setStatus(bill.getBalanceDue().signum()==0?PurchaseBill.Status.PAID:PurchaseBill.Status.PARTIAL_PAID);
    bill.setPaymentMode(payment.paymentMode());bill.setPaymentDate(payment.paymentDate());
    ledger.create(LedgerEntry.builder().accountType("SUPPLIER").accountName(bill.getSupplierName()).debit(payment.amount()).credit(BigDecimal.ZERO).referenceId(id).referenceType("BILL_PAYMENT").description(bill.getBillNo()).build());
    ledger.create(LedgerEntry.builder().accountType(payment.paymentMode()).accountName(payment.paymentMode()).debit(BigDecimal.ZERO).credit(payment.amount()).referenceId(id).referenceType("BILL_PAYMENT").description(bill.getBillNo()).build());
    return repo.save(bill);
  }
}
