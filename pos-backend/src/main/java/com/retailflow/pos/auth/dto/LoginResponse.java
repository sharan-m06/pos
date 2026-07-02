package com.retailflow.pos.auth.dto;
import com.retailflow.pos.staff.Staff;
public record LoginResponse(String token,Staff staff){}
