package com.retailflow.pos.customer;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name="customers")
public class Customer {
  @Id private String id; @Column(nullable=false) private String name; private String phone; private String email;
  @Lob private String address; private String gstin; @Lob private String notes; private LocalDateTime createdAt;
  @PrePersist void create(){if(id==null)id=UUID.randomUUID().toString();createdAt=LocalDateTime.now();}
}
