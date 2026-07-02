package com.retailflow.pos.sales;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name="invoices")
public class Invoice {
  public enum Status { COMPLETED, REFUNDED, PENDING }
  @Id private String id;
  @Column(nullable=false,unique=true) private String invoiceNo;
  private String customerId; private String customerName; private String salespersonId; private String salespersonName;
  @Enumerated(EnumType.STRING) private Status status;
  private String paymentMode; private BigDecimal subtotal; private BigDecimal gstAmount; private BigDecimal total;
  private BigDecimal discount; private LocalDateTime invoiceDate; @Lob private String notes; private LocalDateTime createdAt;
  @OneToMany(mappedBy="invoice",cascade=CascadeType.ALL,orphanRemoval=true)
  @Builder.Default private List<InvoiceItem> items=new ArrayList<>();
  @PrePersist void create(){if(id==null)id=UUID.randomUUID().toString();createdAt=LocalDateTime.now();if(invoiceDate==null)invoiceDate=createdAt;if(status==null)status=Status.PENDING;if(discount==null)discount=BigDecimal.ZERO;}
  public void setItems(List<InvoiceItem> values){items.clear();if(values!=null)values.forEach(i->{i.setInvoice(this);items.add(i);});}
}
