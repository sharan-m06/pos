package com.retailflow.pos.supplier;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface SupplierRepository extends JpaRepository<Supplier,String>{List<Supplier> findByActive(boolean active);}
