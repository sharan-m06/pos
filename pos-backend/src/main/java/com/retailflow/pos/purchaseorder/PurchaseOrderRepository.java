package com.retailflow.pos.purchaseorder;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder,String>{List<PurchaseOrder> findByStatus(PurchaseOrder.Status status);}
