package com.retailflow.pos.ledger;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name="ledger_entries")
public class LedgerEntry {
  @Id private String id; private LocalDate entryDate; private String accountType; private String accountName;
  private String partyId; @Lob private String description; private BigDecimal debit; private BigDecimal credit;
  private BigDecimal balance; private String referenceId; private String referenceType; private LocalDateTime createdAt;
  @PrePersist void create(){if(id==null)id=UUID.randomUUID().toString();createdAt=LocalDateTime.now();if(entryDate==null)entryDate=LocalDate.now();}
}
