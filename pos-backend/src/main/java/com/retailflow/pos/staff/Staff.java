package com.retailflow.pos.staff;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name="staff")
public class Staff {
  public enum Role { OWNER, MANAGER, CASHIER, STAFF }
  @Id private String id; @Column(nullable=false) private String name; @Column(nullable=false,unique=true) private String email;
  @JsonIgnore @Column(nullable=false) private String passwordHash; @Enumerated(EnumType.STRING) private Role role;
  private boolean active; private LocalDateTime createdAt;
  @PrePersist void create(){if(id==null)id=UUID.randomUUID().toString();createdAt=LocalDateTime.now();active=true;}
}
