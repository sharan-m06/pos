import { useEffect, useState } from "react";

export function useOnlineStatus() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

export function queueOfflineOperation(operation: unknown) {
  if (typeof localStorage === "undefined") return;
  const current = JSON.parse(localStorage.getItem("retailflow-offline-queue") || "[]") as unknown[];
  localStorage.setItem("retailflow-offline-queue", JSON.stringify([{ operation, queuedAt: new Date().toISOString() }, ...current]));
}
