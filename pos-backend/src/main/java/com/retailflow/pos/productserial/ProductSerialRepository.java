package com.retailflow.pos.productserial;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ProductSerialRepository extends JpaRepository<ProductSerial,String>{List<ProductSerial> findByProductId(String id);}
