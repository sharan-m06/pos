package com.retailflow.pos.auth;

import com.retailflow.pos.auth.dto.*;
import com.retailflow.pos.staff.*;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService implements UserDetailsService {
  private final StaffRepository staff; private final PasswordEncoder encoder; private final JwtUtil jwt;
  public AuthService(StaffRepository staff,PasswordEncoder encoder,JwtUtil jwt){this.staff=staff;this.encoder=encoder;this.jwt=jwt;}
  public LoginResponse login(LoginRequest request){
    var user=staff.findByEmailIgnoreCase(request.email()).orElseThrow(()->new BadCredentialsException("Invalid credentials"));
    if(!user.isActive()||!encoder.matches(request.password(),user.getPasswordHash()))throw new BadCredentialsException("Invalid credentials");
    return new LoginResponse(jwt.generate(user),user);
  }
  public Staff current(String email){return staff.findByEmailIgnoreCase(email).orElseThrow(()->new EntityNotFoundException("Staff not found"));}
  @Override public UserDetails loadUserByUsername(String email){
    var user=current(email);
    return User.withUsername(user.getEmail()).password(user.getPasswordHash()).roles(user.getRole().name()).disabled(!user.isActive()).build();
  }
}
