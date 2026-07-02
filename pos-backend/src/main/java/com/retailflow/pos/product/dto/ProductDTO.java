package com.retailflow.pos.product.dto;
import com.retailflow.pos.product.Product.UnitType;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
public record ProductDTO(String id,@NotBlank String name,@NotBlank String sku,String category,
 BigDecimal gstRate,@NotNull BigDecimal price,BigDecimal mrp,String description,BigDecimal stock,
 BigDecimal costPrice,UnitType unitType,String barcode){}
