package com.retailflow.pos.staff;
import java.time.LocalDate;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface AttendanceRepository extends JpaRepository<AttendanceRecord,String>{
  List<AttendanceRecord> findByRecordDate(LocalDate date); Optional<AttendanceRecord> findByStaffIdAndRecordDate(String staffId,LocalDate date);
}
