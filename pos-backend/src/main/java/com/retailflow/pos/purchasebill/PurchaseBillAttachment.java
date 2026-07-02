package com.retailflow.pos.purchasebill;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name="purchase_bill_attachments")
public class PurchaseBillAttachment {
  @Id private String id;
  @JsonIgnore @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="purchase_bill_id",nullable=false) @ToString.Exclude private PurchaseBill purchaseBill;
  private String name; private String fileType; private Long fileSize; private String filePath; private LocalDateTime uploadedAt;
  @PrePersist void create(){if(id==null)id=UUID.randomUUID().toString();uploadedAt=LocalDateTime.now();}
}
