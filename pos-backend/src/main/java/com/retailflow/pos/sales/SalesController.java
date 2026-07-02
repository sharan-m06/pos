package com.retailflow.pos.sales;
import com.retailflow.pos.common.ApiResponse;import java.security.Principal;import java.time.LocalDate;import org.springframework.format.annotation.DateTimeFormat;import org.springframework.security.access.prepost.PreAuthorize;import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/sales") public class SalesController{
 private final SalesService s;public SalesController(SalesService s){this.s=s;}
 @GetMapping @PreAuthorize("hasAnyRole('OWNER','MANAGER')")public ApiResponse<?>list(@RequestParam(required=false)@DateTimeFormat(iso=DateTimeFormat.ISO.DATE)LocalDate from,@RequestParam(required=false)@DateTimeFormat(iso=DateTimeFormat.ISO.DATE)LocalDate to,@RequestParam(required=false)String salespersonId,@RequestParam(required=false)String customerId){return ApiResponse.ok(s.list(from,to,salespersonId,customerId));}
 @GetMapping("/{id}")public ApiResponse<?>get(@PathVariable String id){return ApiResponse.ok(s.get(id));}
 @PostMapping @PreAuthorize("hasAnyRole('OWNER','MANAGER','CASHIER')")public ApiResponse<?>create(@RequestBody Invoice v,Principal p){return ApiResponse.ok(s.create(v,p.getName()));}
 @PostMapping("/{id}/refund")@PreAuthorize("hasAnyRole('OWNER','MANAGER')")public ApiResponse<?>refund(@PathVariable String id,Principal p){return ApiResponse.ok(s.refund(id,p.getName()));}
}
