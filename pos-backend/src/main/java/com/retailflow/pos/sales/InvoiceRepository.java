package com.retailflow.pos.sales;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface InvoiceRepository extends JpaRepository<Invoice,String>{
  List<Invoice> findByInvoiceDateBetween(LocalDateTime from,LocalDateTime to);
  List<Invoice> findByCustomerIdOrderByInvoiceDateDesc(String customerId);
  List<Invoice> findBySalespersonIdOrderByInvoiceDateDesc(String salespersonId);
}
