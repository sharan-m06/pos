package com.retailflow.pos.staff;

import jakarta.persistence.*;
import java.time.*;
import java.util.UUID;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name="attendance_records",uniqueConstraints=@UniqueConstraint(columnNames={"staff_id","record_date"}))
public class AttendanceRecord {
  public enum Status { PRESENT,ABSENT,HALF_DAY,LATE,LEAVE }
  @Id private String id; @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="staff_id") private Staff staff;
  private String staffName; private LocalDate recordDate; @Enumerated(EnumType.STRING) private Status status;
  @Lob private String notes; private LocalDateTime createdAt;
  @PrePersist void create(){if(id==null)id=UUID.randomUUID().toString();createdAt=LocalDateTime.now();}
}
