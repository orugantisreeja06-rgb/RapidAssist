import { apiRequest } from "../utils/api.js";

export const bookingService = {
  create(payload) {
    return apiRequest("/bookings", { method: "POST", body: payload });
  },
  emergency(payload) {
    return apiRequest("/bookings/emergency", { method: "POST", body: payload });
  },
  userBookings(status = "") {
    return apiRequest(`/bookings/user${status ? `?status=${encodeURIComponent(status)}` : ""}`);
  },
  workerBookings(status = "") {
    return apiRequest(`/bookings/worker${status ? `?status=${encodeURIComponent(status)}` : ""}`);
  },
  get(id) {
    return apiRequest(`/bookings/${id}`);
  },
  updateStatus(id, status) {
    return apiRequest(`/bookings/status/${id}`, {
      method: "PUT",
      body: { status },
    });
  },
  cancel(id) {
    return apiRequest(`/bookings/${id}`, { method: "DELETE" });
  },
};
