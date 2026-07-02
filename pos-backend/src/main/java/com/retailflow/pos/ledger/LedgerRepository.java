package com.retailflow.pos.ledger;
import java.time.LocalDate;
import java.util.*;
import org.springframework.data.jpa.repository.*;
public interface LedgerRepository extends JpaRepository<LedgerEntry,String>{
  List<LedgerEntry> findByEntryDateBetween(LocalDate from,LocalDate to);
  Optional<LedgerEntry> findTopByAccountTypeOrderByCreatedAtDesc(String accountType);
}
