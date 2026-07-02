package com.retailflow.pos.product;

import com.retailflow.pos.product.dto.ProductDTO;
import com.retailflow.pos.stock.*;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductService {
  private final ProductRepository repo; private final StockMovementService stock;
  public ProductService(ProductRepository repo,StockMovementService stock){this.repo=repo;this.stock=stock;}
  public List<Product> list(String search){return search==null||search.isBlank()?repo.findAll():repo.findByNameContainingIgnoreCaseOrSkuContainingIgnoreCase(search,search);}
  public Product get(String id){return repo.findById(id).orElseThrow(()->new EntityNotFoundException("Product not found"));}
  public Product barcode(String value){return repo.findByBarcode(value).orElseThrow(()->new EntityNotFoundException("Product not found"));}
  public Product sku(String value){return repo.findBySku(value).orElseThrow(()->new EntityNotFoundException("Product not found"));}
  @Transactional public Product save(ProductDTO dto){
    var p=dto.id()==null?new Product():get(dto.id());p.setName(dto.name());p.setSku(dto.sku());p.setCategory(dto.category());
    p.setGstRate(Objects.requireNonNullElse(dto.gstRate(),BigDecimal.ZERO));p.setPrice(dto.price());p.setMrp(dto.mrp());p.setDescription(dto.description());
    p.setStock(Objects.requireNonNullElse(dto.stock(),BigDecimal.ZERO));p.setCostPrice(Objects.requireNonNullElse(dto.costPrice(),BigDecimal.ZERO));
    p.setUnitType(dto.unitType());p.setBarcode(dto.barcode());return repo.save(p);
  }
  public void delete(String id){repo.delete(get(id));}
  public Product adjust(String id,BigDecimal quantity,StockMovement.Type type,String notes,String actor){stock.move(id,quantity,type,null,"ADJUSTMENT",notes,actor);return get(id);}
}
