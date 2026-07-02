package com.retailflow.pos.purchasebill;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name="purchase_bill_items")
public class PurchaseBillItem {
  @Id private String id;
  @JsonIgnore @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="purchase_bill_id",nullable=false) @ToString.Exclude private PurchaseBill purchaseBill;
  private String productId; private String productName; private String sku;
  private BigDecimal quantity; private String unit; private BigDecimal unitCost;
  private BigDecimal gstRate; private BigDecimal cgst; private BigDecimal sgst;
  private BigDecimal igst; private BigDecimal lineTotal; private boolean updateStock;
  @PrePersist void create(){if(id==null)id=UUID.randomUUID().toString();}
}
