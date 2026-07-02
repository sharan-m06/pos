package com.retailflow.pos.product;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ProductRepository extends JpaRepository<Product,String>{
  Optional<Product> findBySku(String sku); Optional<Product> findByBarcode(String barcode);
  List<Product> findByNameContainingIgnoreCaseOrSkuContainingIgnoreCase(String name,String sku);
}
