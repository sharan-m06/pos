package com.retailflow.pos.auth;

import com.retailflow.pos.auth.dto.*;
import com.retailflow.pos.common.ApiResponse;
import jakarta.validation.Valid;
import java.security.Principal;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/auth")
public class AuthController {
  private final AuthService service;
  public AuthController(AuthService service){this.service=service;}
  @PostMapping("/login") ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request){return ApiResponse.ok(service.login(request),"Login successful");}
  @GetMapping("/me") ApiResponse<?> me(Principal principal){return ApiResponse.ok(service.current(principal.getName()));}
  @PostMapping("/logout") ApiResponse<Void> logout(){return ApiResponse.ok(null,"Logged out");}
}
