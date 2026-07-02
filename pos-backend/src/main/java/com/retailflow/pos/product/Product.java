package com.retailflow.pos.product;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "products")
public class Product {
  public enum UnitType { PIECE, KG, METER, LITER }
  @Id private String id;
  @Column(nullable=false) private String name;
  @Column(nullable=false, unique=true) private String sku;
  private String category;
  @Column(nullable=false, precision=12, scale=2) private BigDecimal gstRate;
  @Column(nullable=false, precision=14, scale=2) private BigDecimal price;
  @Column(precision=14, scale=2) private BigDecimal mrp;
  @Lob private String description;
  @Column(nullable=false, precision=14, scale=3) private BigDecimal stock;
  @Column(nullable=false, precision=14, scale=2) private BigDecimal costPrice;
  @Enumerated(EnumType.STRING) private UnitType unitType;
  @Column(unique=true) private String barcode;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  @PrePersist void create() {
    if (id == null) id = UUID.randomUUID().toString();
    createdAt = updatedAt = LocalDateTime.now();
    if (stock == null) stock = BigDecimal.ZERO;
    if (gstRate == null) gstRate = BigDecimal.ZERO;
    if (costPrice == null) costPrice = BigDecimal.ZERO;
  }
  @PreUpdate void update() { updatedAt = LocalDateTime.now(); }
}
