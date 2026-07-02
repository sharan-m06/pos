package com.retailflow.pos.supplier;
import com.retailflow.pos.common.ApiResponse;import org.springframework.security.access.prepost.PreAuthorize;import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/suppliers") @PreAuthorize("hasAnyRole('OWNER','MANAGER')") public class SupplierController{
 private final SupplierService service;public SupplierController(SupplierService service){this.service=service;}
 @GetMapping public ApiResponse<?> list(@RequestParam(required=false)Boolean isActive){return ApiResponse.ok(service.list(isActive));}@GetMapping("/{id}")public ApiResponse<?>get(@PathVariable String id){return ApiResponse.ok(service.get(id));}@PostMapping public ApiResponse<?>create(@RequestBody Supplier v){return ApiResponse.ok(service.save(v));}@PutMapping("/{id}")public ApiResponse<?>update(@PathVariable String id,@RequestBody Supplier v){v.setId(id);return ApiResponse.ok(service.save(v));}@DeleteMapping("/{id}")public ApiResponse<Void>delete(@PathVariable String id){service.delete(id);return ApiResponse.ok(null);}
}
