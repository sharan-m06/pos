package com.retailflow.pos.common;

public class BackupException extends RuntimeException {
  public BackupException(String reason, Throwable cause) { super(reason, cause); }
}
