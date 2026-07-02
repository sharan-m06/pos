package com.retailflow.pos.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
  @Bean
  OpenAPI retailFlowOpenApi() {
    return new OpenAPI().info(new Info().title("RetailFlow POS API").version("v1")
        .description("Local-first REST API for RetailFlow POS"));
  }
}
