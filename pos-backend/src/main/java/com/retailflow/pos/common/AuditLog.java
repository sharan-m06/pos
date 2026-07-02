package com.retailflow.pos.common;

import java.time.Instant;

public record AuditLog(Instant timestamp, String action, String actor, String details) {
  public static AuditLog system(String action, String details) {
    return new AuditLog(Instant.now(), action, "SYSTEM", details);
  }
}
