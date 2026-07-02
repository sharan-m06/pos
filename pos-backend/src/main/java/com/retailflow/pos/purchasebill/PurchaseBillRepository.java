package com.retailflow.pos.purchasebill;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface PurchaseBillRepository extends JpaRepository<PurchaseBill,String>{
  List<PurchaseBill> findByStatus(PurchaseBill.Status status);
  List<PurchaseBill> findByBillDateBetween(LocalDate from,LocalDate to);
}
