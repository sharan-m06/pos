package com.retailflow.pos.config;

import com.retailflow.pos.product.*;
import com.retailflow.pos.staff.*;
import com.retailflow.pos.supplier.*;
import java.math.BigDecimal;
import java.util.List;
import org.slf4j.*;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements ApplicationRunner {
  private static final Logger log=LoggerFactory.getLogger(DataSeeder.class);
  private final StaffRepository staff;private final ProductRepository products;private final SupplierRepository suppliers;private final PasswordEncoder encoder;
  public DataSeeder(StaffRepository staff,ProductRepository products,SupplierRepository suppliers,PasswordEncoder encoder){this.staff=staff;this.products=products;this.suppliers=suppliers;this.encoder=encoder;}
  @Override public void run(ApplicationArguments args){
    if(staff.count()==0)staff.save(Staff.builder().name("Admin Owner").email("owner@retailflow.local").passwordHash(encoder.encode("Admin@1234")).role(Staff.Role.OWNER).active(true).build());
    if(products.count()==0){
      products.saveAll(List.of(
        product("Premium Cotton T-Shirt","TS-001","Apparel","31.49","29.99","5","45"),
        product("Slim Fit Jeans","JN-002","Apparel","62.99","59.99","5","28"),
        product("Running Sneakers","SN-003","Footwear","100.79","89.99","12","12"),
        product("Leather Wallet","WL-004","Accessories","39.19","34.99","12","15"),
        product("Sunglasses","SG-005","Accessories","153.39","129.99","18","8")
      ));
    }
    if(suppliers.count()==0)suppliers.save(Supplier.builder().name("Northstar Textiles").contactPerson("Ravi Mehta").phone("9876543210").paymentTerms(Supplier.PaymentTerms.NET_15).active(true).build());
    log.info("RetailFlow POS initialized. Login: owner@retailflow.local / Admin@1234");
  }
  private Product product(String name,String sku,String category,String price,String cost,String gst,String stock){
    return Product.builder().name(name).sku(sku).category(category).price(new BigDecimal(price)).mrp(new BigDecimal(price)).costPrice(new BigDecimal(cost)).gstRate(new BigDecimal(gst)).stock(new BigDecimal(stock)).unitType(Product.UnitType.PIECE).barcode("890"+sku.replace("-","")).build();
  }
}
