const BASE = import.meta.env.VITE_API_BASE_URL || "/api";
async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || `Request failed (${response.status})`);
  return body;
}
export const api = {
  list: () => request("/reports"),
  create: (report) => request("/reports", { method: "POST", body: JSON.stringify(report) }),
  updateStatus: (id, status, actor) => request(`/reports/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, actor }) })
};
