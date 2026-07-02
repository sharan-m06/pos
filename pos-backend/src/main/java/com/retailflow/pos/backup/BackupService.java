package com.retailflow.pos.backup;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.retailflow.pos.backup.dto.BackupManifest;
import com.retailflow.pos.common.*;
import com.retailflow.pos.customer.*;
import com.retailflow.pos.expense.*;
import com.retailflow.pos.ledger.*;
import com.retailflow.pos.product.*;
import com.retailflow.pos.productserial.*;
import com.retailflow.pos.purchasebill.*;
import com.retailflow.pos.purchaseorder.*;
import com.retailflow.pos.sales.*;
import com.retailflow.pos.staff.*;
import com.retailflow.pos.stock.*;
import com.retailflow.pos.supplier.*;
import java.io.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Stream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class BackupService {
  public record BackupResult(String filename,String path,long sizeBytes,Instant createdAt,String checksum){}
  public record DriveInfo(String path,String name,BigDecimal freeSpaceGB,BigDecimal totalSpaceGB,boolean removable){}
  private final ObjectMapper mapper=new ObjectMapper().registerModule(new JavaTimeModule()).disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
  private final String defaultPath;
  private final ProductRepository products;private final ProductSerialRepository serials;private final SupplierRepository suppliers;
  private final PurchaseOrderRepository orders;private final PurchaseBillRepository bills;private final InvoiceRepository invoices;
  private final StockMovementRepository movements;private final ExpenseRepository expenses;private final LedgerRepository ledger;
  private final CustomerRepository customers;private final StaffRepository staff;private final AttendanceRepository attendance;
  public BackupService(@Value("${backup.default-path}")String defaultPath,ProductRepository products,ProductSerialRepository serials,
    SupplierRepository suppliers,PurchaseOrderRepository orders,PurchaseBillRepository bills,InvoiceRepository invoices,
    StockMovementRepository movements,ExpenseRepository expenses,LedgerRepository ledger,CustomerRepository customers,
    StaffRepository staff,AttendanceRepository attendance){
    this.defaultPath=defaultPath;this.products=products;this.serials=serials;this.suppliers=suppliers;this.orders=orders;
    this.bills=bills;this.invoices=invoices;this.movements=movements;this.expenses=expenses;this.ledger=ledger;
    this.customers=customers;this.staff=staff;this.attendance=attendance;
  }
  public BackupResult exportToLocal(String requestedPath){
    try{
      var target=Path.of(requestedPath==null||requestedPath.isBlank()?defaultPath:requestedPath).toAbsolutePath().normalize();
      Files.createDirectories(target);var tables=readTables();var checksum=checksum(tables);var now=Instant.now();
      var manifest=new BackupManifest(2,"RetailFlowPOS",now,deviceId(),tables,counts(tables),checksum);
      var name="retailflow-backup-"+DateTimeFormatter.ofPattern("yyyy-MM-dd-HHmmss").withZone(ZoneId.systemDefault()).format(now)+".json";
      var file=target.resolve(name);mapper.writerWithDefaultPrettyPrinter().writeValue(file.toFile(),manifest);
      Files.copy(file,target.resolve("retailflow-backup-LATEST.json"),StandardCopyOption.REPLACE_EXISTING);
      return new BackupResult(name,file.toString(),Files.size(file),now,checksum);
    }catch(Exception e){throw new BackupException(e.getMessage(),e);}
  }
  private Map<String,JsonNode> readTables(){
    var tables=new LinkedHashMap<String,JsonNode>();
    tables.put("products",mapper.valueToTree(products.findAll()));tables.put("productSerials",mapper.valueToTree(serials.findAll()));
    tables.put("suppliers",mapper.valueToTree(suppliers.findAll()));tables.put("purchaseOrders",mapper.valueToTree(orders.findAll()));
    tables.put("purchaseBills",mapper.valueToTree(bills.findAll()));tables.put("invoices",mapper.valueToTree(invoices.findAll()));
    tables.put("stockMovements",mapper.valueToTree(movements.findAll()));tables.put("expenses",mapper.valueToTree(expenses.findAll()));
    tables.put("ledgerEntries",mapper.valueToTree(ledger.findAll()));tables.put("customers",mapper.valueToTree(customers.findAll()));
    var safeStaff=staff.findAll().stream().map(s->Map.of("id",s.getId(),"name",s.getName(),"email",s.getEmail(),"role",s.getRole(),"active",s.isActive(),"createdAt",s.getCreatedAt())).toList();
    tables.put("staff",mapper.valueToTree(safeStaff));tables.put("attendanceRecords",mapper.valueToTree(attendance.findAll()));return tables;
  }
  private Map<String,Long> counts(Map<String,JsonNode> tables){var result=new LinkedHashMap<String,Long>();tables.forEach((k,v)->result.put(k,(long)v.size()));return result;}
  private String checksum(Map<String,JsonNode> tables)throws Exception{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(mapper.writeValueAsBytes(tables)));}
  private String deviceId()throws IOException{
    var root=Path.of(System.getProperty("user.home"),"RetailFlowPOS");Files.createDirectories(root);var file=root.resolve("retailflow.properties");
    var props=new Properties();if(Files.exists(file))try(var in=Files.newInputStream(file)){props.load(in);}
    var id=props.getProperty("device.id");if(id==null){id=UUID.randomUUID().toString();props.setProperty("device.id",id);try(var out=Files.newOutputStream(file)){props.store(out,"RetailFlow POS device identity");}}return id;
  }
  @Transactional public Map<String,Object> importFromFile(MultipartFile file){
    try{
      var manifest=mapper.readValue(file.getBytes(),BackupManifest.class);
      if(manifest.version()!=2)throw new InvalidBackupFileException("Unsupported backup version");
      if(!MessageDigest.isEqual(manifest.checksum().getBytes(StandardCharsets.UTF_8),checksum(manifest.tables()).getBytes(StandardCharsets.UTF_8)))throw new InvalidBackupFileException("Checksum mismatch");
      upsert(manifest.tables());return Map.of("tablesRestored",manifest.tables().keySet(),"recordCounts",manifest.counts(),"warnings",List.of());
    }catch(InvalidBackupFileException e){throw e;}catch(Exception e){throw new BackupException(e.getMessage(),e);}
  }
  private void upsert(Map<String,JsonNode> t)throws Exception{
    products.saveAll(read(t,"products",Product[].class));suppliers.saveAll(read(t,"suppliers",Supplier[].class));
    customers.saveAll(read(t,"customers",Customer[].class));expenses.saveAll(read(t,"expenses",Expense[].class));
    ledger.saveAll(read(t,"ledgerEntries",LedgerEntry[].class));orders.saveAll(read(t,"purchaseOrders",PurchaseOrder[].class));
    bills.saveAll(read(t,"purchaseBills",PurchaseBill[].class));invoices.saveAll(read(t,"invoices",Invoice[].class));
    movements.saveAll(read(t,"stockMovements",StockMovement[].class));attendance.saveAll(read(t,"attendanceRecords",AttendanceRecord[].class));
  }
  private <T> List<T> read(Map<String,JsonNode> tables,String name,Class<T[]> type)throws Exception{
    var node=tables.get(name);return node==null?List.of():Arrays.asList(mapper.treeToValue(node,type));
  }
  public List<Map<String,Object>> listLocal(String requestedPath){
    var path=Path.of(requestedPath==null||requestedPath.isBlank()?defaultPath:requestedPath);
    if(!Files.exists(path))return List.of();
    try(Stream<Path> stream=Files.list(path)){return stream.filter(p->p.getFileName().toString().endsWith(".json")).sorted(Comparator.reverseOrder()).map(p->{try{return Map.<String,Object>of("name",p.getFileName().toString(),"path",p.toString(),"size",Files.size(p),"modifiedAt",Files.getLastModifiedTime(p).toInstant());}catch(IOException e){return Map.<String,Object>of();}}).toList();}catch(IOException e){throw new BackupException(e.getMessage(),e);}
  }
  public List<DriveInfo> listAvailableDrives(){
    var roots=new LinkedHashSet<File>(Arrays.asList(File.listRoots()));for(var parent:List.of(new File("/Volumes"),new File("/media/"+System.getProperty("user.name")))){var files=parent.listFiles();if(files!=null)roots.addAll(Arrays.asList(files));}
    return roots.stream().filter(File::canWrite).filter(f->f.getFreeSpace()>10_000_000).map(f->new DriveInfo(f.getAbsolutePath(),f.getName().isBlank()?f.getAbsolutePath():f.getName(),gb(f.getFreeSpace()),gb(f.getTotalSpace()),!f.getAbsolutePath().toLowerCase().startsWith(System.getProperty("user.home").toLowerCase()))).toList();
  }
  private BigDecimal gb(long bytes){return BigDecimal.valueOf(bytes).divide(BigDecimal.valueOf(1_000_000_000L),2,java.math.RoundingMode.HALF_UP);}
  public void deleteOld(int keepCount,int keepDays){
    var files=listLocal(null);for(int i=keepCount;i<files.size();i++){var row=files.get(i);if(((Instant)row.get("modifiedAt")).isBefore(Instant.now().minus(Duration.ofDays(keepDays))))try{Files.deleteIfExists(Path.of((String)row.get("path")));}catch(IOException ignored){}}
  }
}
