package com.retailflow.pos.backup.dto;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.Map;
public record BackupManifest(int version,String appName,Instant createdAt,String deviceId,Map<String,JsonNode> tables,Map<String,Long> counts,String checksum){}
