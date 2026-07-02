package com.retailflow.pos.productserial;
import com.retailflow.pos.common.ApiResponse;import org.springframework.security.access.prepost.PreAuthorize;import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/products/{productId}/serials") public class ProductSerialController{
 private final ProductSerialService service;public ProductSerialController(ProductSerialService service){this.service=service;}
 @GetMapping public ApiResponse<?> list(@PathVariable String productId){return ApiResponse.ok(service.list(productId));}
 @PostMapping("/generate") @PreAuthorize("hasAnyRole('OWNER','MANAGER')") public ApiResponse<?> generate(@PathVariable String productId,@RequestParam(defaultValue="10")int quantity){return ApiResponse.ok(service.generate(productId,quantity));}
}
