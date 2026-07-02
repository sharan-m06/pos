package com.retailflow.pos.common;

import java.math.BigDecimal;

public class InsufficientStockException extends RuntimeException {
  public InsufficientStockException(String productName, BigDecimal required, BigDecimal available) {
    super("Insufficient stock for: " + productName + " (required " + required + ", available " + available + ")");
  }
}
