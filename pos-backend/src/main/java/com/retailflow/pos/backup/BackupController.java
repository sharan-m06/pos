package com.retailflow.pos.backup;
import com.retailflow.pos.common.ApiResponse;import java.nio.file.*;import java.util.Map;import org.springframework.security.access.prepost.PreAuthorize;import org.springframework.web.bind.annotation.*;import org.springframework.web.multipart.MultipartFile;
@RestController @RequestMapping("/api/v1/backup") @PreAuthorize("hasRole('OWNER')") public class BackupController{
 private final BackupService backup;private final GoogleDriveService drive;public BackupController(BackupService backup,GoogleDriveService drive){this.backup=backup;this.drive=drive;}
 @PostMapping("/export/local")public ApiResponse<?>local(@RequestBody(required=false)Map<String,String>b){return ApiResponse.ok(backup.exportToLocal(b==null?null:b.get("path")));}
 @GetMapping("/list/local")public ApiResponse<?>list(@RequestParam(required=false)String path){return ApiResponse.ok(backup.listLocal(path));}
 @PostMapping("/import/local")public ApiResponse<?>restore(@RequestParam MultipartFile file){return ApiResponse.ok(backup.importFromFile(file));}
 @GetMapping("/available-drives")public ApiResponse<?>drives(){return ApiResponse.ok(backup.listAvailableDrives());}
 @GetMapping("/auth/google/status")public ApiResponse<?>status(){return ApiResponse.ok(Map.of("authorized",drive.isAuthorized()));}
 @GetMapping("/auth/google/url")public ApiResponse<?>url(){return ApiResponse.ok(Map.of("authUrl",drive.initiateAuth()));}
 @GetMapping("/auth/google/callback")public ApiResponse<?>callbackGet(@RequestParam String code){drive.handleAuthCallback(code);return ApiResponse.ok(null,"Google Drive connected");}
 @PostMapping("/auth/google/callback")public ApiResponse<?>callback(@RequestBody Map<String,String>b){drive.handleAuthCallback(b.get("code"));return ApiResponse.ok(null);}
 @PostMapping("/export/drive")public ApiResponse<?>drive(){var result=backup.exportToLocal(null);return ApiResponse.ok(Map.of("backup",result,"fileId",drive.uploadBackup(result.path())));}
 @GetMapping("/list/drive")public ApiResponse<?>driveList(){return ApiResponse.ok(drive.listBackups());}
 @DeleteMapping("/drive/{fileId}")public ApiResponse<Void>driveDelete(@PathVariable String fileId){drive.delete(fileId);return ApiResponse.ok(null);}
}
