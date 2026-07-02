package com.retailflow.pos.common;

public record ApiResponse<T>(boolean success, T data, String message) {
  public static <T> ApiResponse<T> ok(T data) { return new ApiResponse<>(true, data, "Success"); }
  public static <T> ApiResponse<T> ok(T data, String message) { return new ApiResponse<>(true, data, message); }
  public static ApiResponse<Void> error(String message) { return new ApiResponse<>(false, null, message); }
}
