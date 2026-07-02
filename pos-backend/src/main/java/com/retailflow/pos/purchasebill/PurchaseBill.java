package com.retailflow.pos.purchasebill;

import com.retailflow.pos.purchaseorder.PurchaseOrder;
import com.retailflow.pos.supplier.Supplier;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name="purchase_bills")
public class PurchaseBill {
  public enum Status { DRAFT, CONFIRMED, PAID, PARTIAL_PAID, CANCELLED }
  @Id private String id;
  @Column(nullable=false,unique=true) private String billNo;
  @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="supplier_id") private Supplier supplier;
  private String supplierName;
  private String supplierGstin;
  private String supplierInvoiceNo;
  @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="linked_po_id") private PurchaseOrder linkedPo;
  @Enumerated(EnumType.STRING) private Status status;
  private BigDecimal subtotal;
  private BigDecimal totalCgst;
  private BigDecimal totalSgst;
  private BigDecimal totalIgst;
  private BigDecimal totalGst;
  private BigDecimal grandTotal;
  private BigDecimal amountPaid;
  private BigDecimal balanceDue;
  private LocalDate billDate;
  private LocalDate dueDate;
  private String paymentMode;
  private LocalDate paymentDate;
  private String paymentStatus;
  private String paidVia;
  private LocalDateTime stockAppliedAt;
  private LocalDateTime stockReversedAt;
  private boolean reminderEnabled;
  private LocalDate remindOn;
  @Lob private String notes;
  private String createdBy;
  private LocalDateTime createdAt;
  @OneToMany(mappedBy="purchaseBill",cascade=CascadeType.ALL,orphanRemoval=true)
  @Builder.Default private List<PurchaseBillItem> items=new ArrayList<>();
  @OneToMany(mappedBy="purchaseBill",cascade=CascadeType.ALL,orphanRemoval=true)
  @Builder.Default private List<PurchaseBillAttachment> attachments=new ArrayList<>();
  @PrePersist void create(){if(id==null)id=UUID.randomUUID().toString();createdAt=LocalDateTime.now();if(status==null)status=Status.DRAFT;if(amountPaid==null)amountPaid=BigDecimal.ZERO;}
  public void setItems(List<PurchaseBillItem> values){items.clear();if(values!=null)values.forEach(i->{i.setPurchaseBill(this);items.add(i);});}
}
