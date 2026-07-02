package com.retailflow.pos.config;

import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DatabaseConfig {
  public DatabaseConfig() {
    try {
      Files.createDirectories(Path.of(System.getProperty("user.home"), "RetailFlowPOS"));
    } catch (Exception exception) {
      throw new IllegalStateException("Unable to create RetailFlow data directory", exception);
    }
  }
}
