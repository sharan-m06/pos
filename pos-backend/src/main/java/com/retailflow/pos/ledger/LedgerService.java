package com.retailflow.pos.ledger;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LedgerService {
  private final LedgerRepository repo;
  public LedgerService(LedgerRepository repo){this.repo=repo;}
  @Transactional public LedgerEntry create(LedgerEntry entry){
    var previous=repo.findTopByAccountTypeOrderByCreatedAtDesc(entry.getAccountType()).map(LedgerEntry::getBalance).orElse(BigDecimal.ZERO);
    var debit=Objects.requireNonNullElse(entry.getDebit(),BigDecimal.ZERO);
    var credit=Objects.requireNonNullElse(entry.getCredit(),BigDecimal.ZERO);
    entry.setDebit(debit);entry.setCredit(credit);entry.setBalance(previous.add(debit).subtract(credit));
    return repo.save(entry);
  }
  public List<LedgerEntry> list(LocalDate from,LocalDate to){return from!=null&&to!=null?repo.findByEntryDateBetween(from,to):repo.findAll();}
  public Map<String,Map<String,BigDecimal>> summary(){
    var result=new LinkedHashMap<String,Map<String,BigDecimal>>();
    repo.findAll().forEach(e->{var row=result.computeIfAbsent(e.getAccountType(),k->new HashMap<>(Map.of("debit",BigDecimal.ZERO,"credit",BigDecimal.ZERO,"balance",BigDecimal.ZERO)));
      row.put("debit",row.get("debit").add(e.getDebit()));row.put("credit",row.get("credit").add(e.getCredit()));row.put("balance",e.getBalance());});
    return result;
  }
}
