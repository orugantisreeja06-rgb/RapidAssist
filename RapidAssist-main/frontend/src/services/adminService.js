import { apiRequest } from "../utils/api.js";

export const adminService = {
  dashboard() {
    return apiRequest("/admin/dashboard");
  },
  users(search = "") {
    return apiRequest(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`);
  },
  workers(params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/admin/workers${q ? `?${q}` : ""}`);
  },
  complaints() {
    return apiRequest("/admin/complaints");
  },
  reports() {
    return apiRequest("/admin/reports");
  },
  verifyWorker(id, isVerified, verificationNote = "") {
    return apiRequest(`/admin/verify-worker/${id}`, {
      method: "PUT",
      body: { isVerified, verificationNote },
    });
  },
  deleteUser(id) {
    return apiRequest(`/admin/users/${id}`, { method: "DELETE" });
  },
  deleteWorker(id) {
    return apiRequest(`/admin/workers/${id}`, { method: "DELETE" });
  },
};
