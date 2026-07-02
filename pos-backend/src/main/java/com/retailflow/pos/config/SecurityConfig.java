package com.retailflow.pos.config;

import com.retailflow.pos.auth.*;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.List;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.*;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration @EnableMethodSecurity
public class SecurityConfig {
  @Bean PasswordEncoder passwordEncoder(){return new BCryptPasswordEncoder();}
  @Bean CorsConfigurationSource cors(){
    var c=new CorsConfiguration();
    c.setAllowedOrigins(List.of("http://localhost:19006","http://localhost:8081","http://localhost:3000"));
    c.setAllowedMethods(List.of("GET","POST","PUT","DELETE","OPTIONS"));c.setAllowedHeaders(List.of("*"));c.setAllowCredentials(true);
    var source=new UrlBasedCorsConfigurationSource();source.registerCorsConfiguration("/**",c);return source;
  }
  @Bean SecurityFilterChain chain(HttpSecurity http,JwtFilter filter)throws Exception{
    return http.csrf(csrf->csrf.disable()).cors(cors->{}).sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(a->a.requestMatchers("/api/v1/auth/login","/actuator/health","/swagger-ui/**","/v3/api-docs/**","/h2-console/**").permitAll().anyRequest().authenticated())
        .headers(h->h.frameOptions(f->f.sameOrigin())).addFilterBefore(filter,UsernamePasswordAuthenticationFilter.class).build();
  }
}

@Component
class JwtFilter extends OncePerRequestFilter {
  private final JwtUtil jwt; private final AuthService auth;
  JwtFilter(JwtUtil jwt,AuthService auth){this.jwt=jwt;this.auth=auth;}
  @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)throws ServletException,IOException{
    var header=req.getHeader(HttpHeaders.AUTHORIZATION);
    if(header!=null&&header.startsWith("Bearer ")){
      var token=header.substring(7);
      if(jwt.valid(token)&&SecurityContextHolder.getContext().getAuthentication()==null){
        var details=auth.loadUserByUsername(jwt.subject(token));
        var authentication=new UsernamePasswordAuthenticationToken(details,null,details.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(authentication);
      }
    }
    chain.doFilter(req,res);
  }
}
