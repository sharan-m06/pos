package com.retailflow.pos.expense;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name="expenses")
public class Expense {
  public enum Category { RENT,UTILITIES,SALARY,INVENTORY,MARKETING,MAINTENANCE,TRANSPORT,MISCELLANEOUS,OTHER }
  public enum PaymentMode { CASH,BANK_TRANSFER,UPI,CARD,CHEQUE }
  @Id private String id; @Enumerated(EnumType.STRING) private Category category; private String description;
  private BigDecimal amount; @Enumerated(EnumType.STRING) private PaymentMode paymentMode; private String vendor;
  private LocalDate expenseDate; private String receiptNo; @Lob private String notes; private String createdBy; private LocalDateTime createdAt;
  @PrePersist void create(){if(id==null)id=UUID.randomUUID().toString();createdAt=LocalDateTime.now();if(expenseDate==null)expenseDate=LocalDate.now();}
}
