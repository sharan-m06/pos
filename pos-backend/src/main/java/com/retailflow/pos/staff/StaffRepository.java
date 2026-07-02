package com.retailflow.pos.staff;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
public interface StaffRepository extends JpaRepository<Staff,String>{Optional<Staff> findByEmailIgnoreCase(String email);}
