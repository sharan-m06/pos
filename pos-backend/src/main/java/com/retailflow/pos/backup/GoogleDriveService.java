package com.retailflow.pos.backup;

import com.google.api.client.googleapis.auth.oauth2.*;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.FileContent;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.store.FileDataStoreFactory;
import com.google.api.services.drive.*;
import com.google.api.services.drive.model.File;
import com.retailflow.pos.common.BackupException;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class GoogleDriveService {
  public record DriveFileInfo(String fileId,String name,Long sizeBytes,String createdAt,String modifiedAt){}
  private static final GsonFactory JSON=GsonFactory.getDefaultInstance();
  private final Path credentials;private final String folderName;private final Path tokens;
  public GoogleDriveService(@Value("${backup.google-drive.credentials-file}")String credentials,@Value("${backup.google-drive.folder-name}")String folderName){
    this.credentials=Path.of(credentials);this.folderName=folderName;this.tokens=Path.of(System.getProperty("user.home"),"RetailFlowPOS","tokens");
  }
  private GoogleAuthorizationCodeFlow flow()throws Exception{
    if(!Files.exists(credentials))throw new IllegalStateException("Google credentials file not found: "+credentials);
    try(var reader=Files.newBufferedReader(credentials)){var secrets=GoogleClientSecrets.load(JSON,reader);return new GoogleAuthorizationCodeFlow.Builder(GoogleNetHttpTransport.newTrustedTransport(),JSON,secrets,List.of(DriveScopes.DRIVE_FILE)).setDataStoreFactory(new FileDataStoreFactory(tokens.toFile())).setAccessType("offline").build();}
  }
  public boolean isAuthorized(){try{return flow().loadCredential("retailflow")!=null;}catch(Exception e){return false;}}
  public String initiateAuth(){try{return flow().newAuthorizationUrl().setRedirectUri("http://localhost:8080/api/v1/backup/auth/google/callback").setState("retailflow").build();}catch(Exception e){throw new BackupException(e.getMessage(),e);}}
  public void handleAuthCallback(String code){try{var f=flow();var response=f.newTokenRequest(code).setRedirectUri("http://localhost:8080/api/v1/backup/auth/google/callback").execute();f.createAndStoreCredential(response,"retailflow");}catch(Exception e){throw new BackupException(e.getMessage(),e);}}
  private Drive drive()throws Exception{var credential=flow().loadCredential("retailflow");if(credential==null)throw new IllegalStateException("Google Drive is not authorized");return new Drive.Builder(GoogleNetHttpTransport.newTrustedTransport(),JSON,credential).setApplicationName("RetailFlowPOS").build();}
  private String folder(Drive d)throws Exception{var files=d.files().list().setQ("mimeType='application/vnd.google-apps.folder' and name='"+folderName.replace("'","\\'")+"' and trashed=false").setFields("files(id)").execute().getFiles();if(!files.isEmpty())return files.get(0).getId();return d.files().create(new File().setName(folderName).setMimeType("application/vnd.google-apps.folder")).setFields("id").execute().getId();}
  public String uploadBackup(String localPath){try{var d=drive();var p=Path.of(localPath);return d.files().create(new File().setName(p.getFileName().toString()).setParents(List.of(folder(d))),new FileContent("application/json",p.toFile())).setFields("id").execute().getId();}catch(Exception e){throw new BackupException(e.getMessage(),e);}}
  public List<DriveFileInfo> listBackups(){try{var d=drive();return d.files().list().setQ("'"+folder(d)+"' in parents and trashed=false").setFields("files(id,name,size,createdTime,modifiedTime)").execute().getFiles().stream().map(f->new DriveFileInfo(f.getId(),f.getName(),f.getSize(),String.valueOf(f.getCreatedTime()),String.valueOf(f.getModifiedTime()))).toList();}catch(Exception e){throw new BackupException(e.getMessage(),e);}}
  public String downloadBackup(String fileId,String localPath){try{var target=Path.of(localPath);Files.createDirectories(target.getParent());try(var out=Files.newOutputStream(target)){drive().files().get(fileId).executeMediaAndDownloadTo(out);}return target.toString();}catch(Exception e){throw new BackupException(e.getMessage(),e);}}
  public void delete(String fileId){try{drive().files().delete(fileId).execute();}catch(Exception e){throw new BackupException(e.getMessage(),e);}}
}
