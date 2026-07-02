package com.retailflow.pos.supplier;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name="suppliers")
public class Supplier {
  public enum PaymentTerms { IMMEDIATE, NET_7, NET_15, NET_30 }
  @Id private String id;
  @Column(nullable=false) private String name;
  private String contactPerson;
  private String phone;
  private String email;
  @Lob private String address;
  private String gstin;
  @Enumerated(EnumType.STRING) private PaymentTerms paymentTerms;
  @Lob private String notes;
  private boolean active;
  private LocalDateTime createdAt;
  @PrePersist void create(){ if(id==null) id=UUID.randomUUID().toString(); createdAt=LocalDateTime.now(); active=true; }
}
