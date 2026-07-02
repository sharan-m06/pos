package com.retailflow.pos.purchaseorder;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name="purchase_order_items")
public class PurchaseOrderItem {
  @Id private String id;
  @JsonIgnore @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="purchase_order_id",nullable=false) @ToString.Exclude private PurchaseOrder purchaseOrder;
  private String productId;
  private String productName;
  private String sku;
  private BigDecimal orderedQty;
  private BigDecimal receivedQty;
  private BigDecimal unitCost;
  private BigDecimal gstRate;
  private BigDecimal cgst;
  private BigDecimal sgst;
  private BigDecimal igst;
  private BigDecimal lineTotal;
  @PrePersist void create(){if(id==null)id=UUID.randomUUID().toString();if(receivedQty==null)receivedQty=BigDecimal.ZERO;}
}
