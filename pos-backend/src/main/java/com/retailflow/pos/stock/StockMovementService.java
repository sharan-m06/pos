package com.retailflow.pos.stock;

import com.retailflow.pos.common.InsufficientStockException;
import com.retailflow.pos.product.*;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StockMovementService {
  private final ProductRepository products; private final StockMovementRepository movements;
  public StockMovementService(ProductRepository products,StockMovementRepository movements){this.products=products;this.movements=movements;}
  @Transactional public StockMovement move(String productId,BigDecimal quantity,StockMovement.Type type,String referenceId,String referenceType,String notes,String actor){
    var product=products.findById(productId).orElseThrow(()->new jakarta.persistence.EntityNotFoundException("Product not found"));
    var next=product.getStock().add(quantity);
    if(next.signum()<0)throw new InsufficientStockException(product.getName(),quantity.abs(),product.getStock());
    product.setStock(next);products.save(product);
    return movements.save(StockMovement.builder().product(product).productName(product.getName()).quantity(quantity).balanceAfter(next)
        .type(type).referenceId(referenceId).referenceType(referenceType).notes(notes).createdBy(actor).build());
  }
  public List<StockMovement> recent(int limit){return movements.findAllByOrderByCreatedAtDesc(PageRequest.of(0,Math.min(limit,100)));}
  public List<Map<String,Object>> valuation(){return products.findAll().stream().map(p->Map.<String,Object>of("productId",p.getId(),"productName",p.getName(),"stock",p.getStock(),"costPrice",p.getCostPrice(),"value",p.getStock().multiply(p.getCostPrice()))).toList();}
}
