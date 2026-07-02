package com.retailflow.pos.product;
import com.retailflow.pos.common.ApiResponse;import com.retailflow.pos.product.dto.ProductDTO;import com.retailflow.pos.stock.StockMovement;import jakarta.validation.Valid;import java.math.BigDecimal;import java.security.Principal;import java.util.Map;import org.springframework.security.access.prepost.PreAuthorize;import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/products")
public class ProductController{
 private final ProductService service;public ProductController(ProductService service){this.service=service;}
 @GetMapping public ApiResponse<?> list(@RequestParam(required=false)String search){return ApiResponse.ok(service.list(search));}
 @GetMapping("/{id}") public ApiResponse<?> get(@PathVariable String id){return ApiResponse.ok(service.get(id));}
 @GetMapping("/barcode/{barcode}") public ApiResponse<?> barcode(@PathVariable String barcode){return ApiResponse.ok(service.barcode(barcode));}
 @GetMapping("/sku/{sku}") public ApiResponse<?> sku(@PathVariable String sku){return ApiResponse.ok(service.sku(sku));}
 @PostMapping @PreAuthorize("hasAnyRole('OWNER','MANAGER')") public ApiResponse<?> create(@Valid @RequestBody ProductDTO dto){return ApiResponse.ok(service.save(dto));}
 @PutMapping("/{id}") @PreAuthorize("hasAnyRole('OWNER','MANAGER')") public ApiResponse<?> update(@PathVariable String id,@Valid @RequestBody ProductDTO dto){return ApiResponse.ok(service.save(new ProductDTO(id,dto.name(),dto.sku(),dto.category(),dto.gstRate(),dto.price(),dto.mrp(),dto.description(),dto.stock(),dto.costPrice(),dto.unitType(),dto.barcode())));}
 @DeleteMapping("/{id}") @PreAuthorize("hasAnyRole('OWNER','MANAGER')") public ApiResponse<Void> delete(@PathVariable String id){service.delete(id);return ApiResponse.ok(null,"Product deleted");}
 @PostMapping("/{id}/adjust-stock") @PreAuthorize("hasAnyRole('OWNER','MANAGER')") public ApiResponse<?> adjust(@PathVariable String id,@RequestBody Map<String,String> body,Principal p){return ApiResponse.ok(service.adjust(id,new BigDecimal(body.get("quantity")),StockMovement.Type.valueOf(body.getOrDefault("type","ADJUSTMENT")),body.get("notes"),p.getName()));}
}
