import { api } from "./api";
import { getReports, saveReport } from "./db";

let syncing = false;
export async function syncPending(onChange = () => {}) {
  if (syncing || !navigator.onLine) return { synced: 0, failed: 0 };
  syncing = true;
  let synced = 0, failed = 0;
  try {
    const reports = await getReports();
    for (const report of reports.filter(r => r.syncState === "Pending" || r.syncState === "Failed")) {
      try {
        const result = await api.create(report);
        const now = new Date().toISOString();
        await saveReport({
          ...report,
          _id: result.report?._id || report._id,
          syncState: "Synchronized",
          syncedAt: now,
          lastSyncError: null,
          history: [...(report.history || []), { id: crypto.randomUUID(), type: "sync", message: result.duplicate ? "Synchronization confirmed (existing server record)" : "Report synchronized with server", actor: "System", at: now }]
        });
        synced++;
      } catch (error) {
        const now = new Date().toISOString();
        await saveReport({
          ...report,
          syncState: "Failed",
          lastSyncError: error.message,
          retryCount: (report.retryCount || 0) + 1,
          history: [...(report.history || []), { id: crypto.randomUUID(), type: "sync-error", message: `Synchronization failed: ${error.message}`, actor: "System", at: now }]
        });
        failed++;
      }
      onChange();
    }
  } finally { syncing = false; }
  return { synced, failed };
}
