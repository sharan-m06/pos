package com.retailflow.pos.purchaseorder;

import com.retailflow.pos.supplier.Supplier;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name="purchase_orders")
public class PurchaseOrder {
  public enum Status { DRAFT, SENT, RECEIVED, PARTIAL, CANCELLED }
  @Id private String id;
  @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="supplier_id") private Supplier supplier;
  private String supplierName;
  private String supplierGstin;
  @Enumerated(EnumType.STRING) private Status status;
  private BigDecimal subtotal;
  private BigDecimal totalCgst;
  private BigDecimal totalSgst;
  private BigDecimal totalIgst;
  private BigDecimal totalGst;
  private BigDecimal grandTotal;
  private LocalDate orderDate;
  private LocalDate expectedDate;
  private LocalDate receivedDate;
  @Lob private String notes;
  private String createdBy;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  @OneToMany(mappedBy="purchaseOrder", cascade=CascadeType.ALL, orphanRemoval=true)
  @Builder.Default private List<PurchaseOrderItem> items = new ArrayList<>();
  @PrePersist void create(){ if(id==null)id=UUID.randomUUID().toString(); createdAt=updatedAt=LocalDateTime.now(); if(status==null)status=Status.DRAFT; }
  @PreUpdate void update(){updatedAt=LocalDateTime.now();}
  public void setItems(List<PurchaseOrderItem> values){ items.clear(); if(values!=null) values.forEach(i->{i.setPurchaseOrder(this);items.add(i);}); }
}
