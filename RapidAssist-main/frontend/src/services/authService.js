import { apiRequest, setStoredAuth } from "../utils/api.js";

const normalizeAuth = (data) => ({
  token: data.token,
  account: data.user || data.worker,
  role: data.user?.role || data.worker?.role || "customer",
});

export const authService = {
  async login(credentials) {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: credentials,
    });
    const auth = normalizeAuth(data);
    setStoredAuth(auth);
    return auth;
  },

  async register(payload) {
    const data = await apiRequest("/auth/register", {
      method: "POST",
      body: payload,
    });
    const auth = normalizeAuth(data);
    setStoredAuth(auth);
    return auth;
  },

  async registerWorker(payload) {
    const data = await apiRequest("/auth/register-worker", {
      method: "POST",
      body: payload,
    });
    const auth = normalizeAuth(data);
    setStoredAuth(auth);
    return auth;
  },

  forgotPassword(payload) {
    return apiRequest("/auth/forgot-password", { method: "POST", body: payload });
  },

  resetPassword(token, payload) {
    return apiRequest(`/auth/reset-password/${token}`, {
      method: "POST",
      body: payload,
    });
  },

  logout() {
    setStoredAuth(null);
  },
};
