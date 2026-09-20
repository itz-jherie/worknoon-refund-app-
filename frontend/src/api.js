const API = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  listCustomers: () => request("/customers"),
  getCustomer: (id) => request(`/customers/${id}`),
  getPolicy: () => request("/policy"),
  submitRefund: (body) => request("/refunds", { method: "POST", body: JSON.stringify(body) }),
  adminRequests: (limit = 50) => request(`/admin/requests?limit=${limit}`),
};
