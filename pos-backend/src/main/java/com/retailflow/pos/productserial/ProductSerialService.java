package com.retailflow.pos.productserial;
import com.retailflow.pos.product.*;import java.util.*;import org.springframework.stereotype.Service;import org.springframework.transaction.annotation.Transactional;
@Service public class ProductSerialService{
 private final ProductSerialRepository repo;private final ProductRepository products;public ProductSerialService(ProductSerialRepository repo,ProductRepository products){this.repo=repo;this.products=products;}
 public List<ProductSerial> list(String productId){return repo.findByProductId(productId);}
 @Transactional public List<ProductSerial> generate(String productId,int quantity){var p=products.findById(productId).orElseThrow();var out=new ArrayList<ProductSerial>();for(int i=0;i<quantity;i++){var n=UUID.randomUUID().toString().substring(0,12).toUpperCase();out.add(ProductSerial.builder().product(p).productName(p.getName()).sku(p.getSku()).serialNo(n).barcode(p.getSku()+"-"+n).build());}return repo.saveAll(out);}
}
