package com.retailflow.pos.common;

public class InvalidBackupFileException extends RuntimeException {
  public InvalidBackupFileException(String reason) { super(reason); }
}
