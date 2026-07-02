package com.retailflow.pos.common;

import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.ValidationException;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(EntityNotFoundException.class)
  ResponseEntity<ApiResponse<Void>> notFound(EntityNotFoundException exception) {
    return ResponseEntity.status(404).body(ApiResponse.error(exception.getMessage()));
  }
  @ExceptionHandler(InsufficientStockException.class)
  ResponseEntity<ApiResponse<Void>> stock(InsufficientStockException exception) {
    return ResponseEntity.status(409).body(ApiResponse.error(exception.getMessage()));
  }
  @ExceptionHandler({ValidationException.class, MethodArgumentNotValidException.class})
  ResponseEntity<?> validation(Exception exception) {
    if (exception instanceof MethodArgumentNotValidException invalid) {
      var errors = invalid.getBindingResult().getFieldErrors().stream()
          .map(error -> Map.of("field", error.getField(), "message", error.getDefaultMessage())).toList();
      return ResponseEntity.badRequest().body(Map.of("success", false, "errors", errors));
    }
    return ResponseEntity.badRequest().body(ApiResponse.error(exception.getMessage()));
  }
  @ExceptionHandler({BackupException.class, InvalidBackupFileException.class})
  ResponseEntity<ApiResponse<Void>> backup(RuntimeException exception) {
    return ResponseEntity.status(500).body(ApiResponse.error("Backup failed: " + exception.getMessage()));
  }
  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<ApiResponse<Void>> conflict(DataIntegrityViolationException exception) {
    return ResponseEntity.status(409).body(ApiResponse.error("Duplicate or conflicting data"));
  }
  @ExceptionHandler(AccessDeniedException.class)
  ResponseEntity<ApiResponse<Void>> forbidden(AccessDeniedException exception) {
    return ResponseEntity.status(403).body(ApiResponse.error("Insufficient permissions"));
  }
  @ExceptionHandler(Exception.class)
  ResponseEntity<ApiResponse<Void>> general(Exception exception) {
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(exception.getMessage()));
  }
}
