package com.retailflow.pos.productserial;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.retailflow.pos.product.Product;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name="product_serials")
public class ProductSerial {
  @Id private String id;
  @JsonIgnore @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="product_id") private Product product;
  private String productName;
  private String sku;
  @Column(unique=true) private String barcode;
  private String serialNo;
  private boolean printed;
  private LocalDateTime printedAt;
  private LocalDateTime createdAt;
  @PrePersist void create() { if(id==null) id=UUID.randomUUID().toString(); createdAt=LocalDateTime.now(); }
}
