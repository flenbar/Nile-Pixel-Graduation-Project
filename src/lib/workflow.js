export const STATUSES = ["Draft", "Submitted", "Assigned", "In Progress", "Resolved", "Rejected"];
const transitions = {
  Draft: ["Submitted"],
  Submitted: ["Assigned", "Rejected"],
  Assigned: ["In Progress", "Rejected"],
  "In Progress": ["Resolved", "Rejected"],
  Resolved: ["In Progress"],
  Rejected: []
};
export function canTransition(from, to) { return Boolean(transitions[from]?.includes(to)); }
export function nextStatuses(status) { return transitions[status] || []; }
export function transitionReport(report, nextStatus, actor = "Coordinator") {
  if (!canTransition(report.status, nextStatus)) {
    throw new Error(`Invalid status transition: ${report.status} → ${nextStatus}`);
  }
  const now = new Date().toISOString();
  return {
    ...report,
    status: nextStatus,
    updatedAt: now,
    history: [...(report.history || []), { id: crypto.randomUUID(), type: "status", message: `Status changed from ${report.status} to ${nextStatus}`, actor, at: now }]
  };
}
