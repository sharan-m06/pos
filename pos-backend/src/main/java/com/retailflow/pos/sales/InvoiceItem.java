package com.retailflow.pos.sales;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name="invoice_items")
public class InvoiceItem {
  @Id private String id;
  @JsonIgnore @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="invoice_id",nullable=false) @ToString.Exclude private Invoice invoice;
  private String productId; private String productName; private BigDecimal quantity; private BigDecimal unitPrice;
  private BigDecimal gstRate; private BigDecimal gstAmount; private BigDecimal lineTotal;
  @PrePersist void create(){if(id==null)id=UUID.randomUUID().toString();}
}
