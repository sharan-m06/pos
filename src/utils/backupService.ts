export interface RetailFlowBackup {
  version: 1;
  createdAt: string;
  data: Record<string, unknown>;
}

export function createBackup(data: Record<string, unknown>): RetailFlowBackup {
  return { version: 1, createdAt: new Date().toISOString(), data };
}

export function downloadBackupFile(data: Record<string, unknown>) {
  const backup = createBackup(data);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `retailflow-backup-${backup.createdAt.slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readBackupFile(file: File): Promise<RetailFlowBackup> {
  return JSON.parse(await file.text()) as RetailFlowBackup;
}
