import { apiRequest } from "../utils/api.js";

export const userService = {
  profile() {
    return apiRequest("/users/profile");
  },
  updateProfile(payload) {
    return apiRequest("/users/profile", { method: "PUT", body: payload });
  },
  history() {
    return apiRequest("/users/history");
  },
  savedWorkers() {
    return apiRequest("/users/saved-workers");
  },
  saveWorker(workerId) {
    return apiRequest(`/users/save-worker/${workerId}`, { method: "POST" });
  },
  removeSavedWorker(workerId) {
    return apiRequest(`/users/saved-workers/${workerId}`, { method: "DELETE" });
  },
};
