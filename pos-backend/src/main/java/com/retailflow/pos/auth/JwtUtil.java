package com.retailflow.pos.auth;

import com.retailflow.pos.config.JwtConfig;
import com.retailflow.pos.staff.Staff;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@EnableConfigurationProperties(JwtConfig.class)
public class JwtUtil {
  private final JwtConfig config;
  public JwtUtil(JwtConfig config){this.config=config;}
  private SecretKey key(){return Keys.hmacShaKeyFor(config.secret().getBytes(StandardCharsets.UTF_8));}
  public String generate(Staff staff){
    var now=new Date();
    return Jwts.builder().subject(staff.getEmail()).claim("uid",staff.getId()).claim("role",staff.getRole().name())
        .issuedAt(now).expiration(new Date(now.getTime()+config.expirationMs())).signWith(key()).compact();
  }
  public String subject(String token){return Jwts.parser().verifyWith(key()).build().parseSignedClaims(token).getPayload().getSubject();}
  public boolean valid(String token){try{subject(token);return true;}catch(JwtException|IllegalArgumentException e){return false;}}
}
