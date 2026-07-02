package com.retailflow.pos.stock;

import com.retailflow.pos.product.Product;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name="stock_movements")
public class StockMovement {
  public enum Type { SALE, PURCHASE, ADJUSTMENT, RETURN, DAMAGE }
  @Id private String id;
  @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="product_id") private Product product;
  private String productName; @Enumerated(EnumType.STRING) private Type type;
  private BigDecimal quantity; private BigDecimal balanceAfter; private String referenceId; private String referenceType;
  private LocalDate movementDate; @Lob private String notes; private String createdBy; private LocalDateTime createdAt;
  @PrePersist void create(){if(id==null)id=UUID.randomUUID().toString();createdAt=LocalDateTime.now();if(movementDate==null)movementDate=LocalDate.now();}
}
