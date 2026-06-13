import { apiRequest } from "../utils/api.js";

export const notificationService = {
  list() {
    return apiRequest("/notifications");
  },
  markRead(id) {
    return apiRequest(`/notifications/${id}/read`, { method: "PUT" });
  },
  markAllRead() {
    return apiRequest("/notifications/read-all", { method: "PUT" });
  },
  remove(id) {
    return apiRequest(`/notifications/${id}`, { method: "DELETE" });
  },
};
