import { apiRequest } from "../utils/api.js";

const query = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, value);
  });
  const str = search.toString();
  return str ? `?${str}` : "";
};

export const workerService = {
  search(params) {
    return apiRequest(`/workers/search${query(params)}`);
  },
  topRated(params) {
    return apiRequest(`/workers/top-rated${query(params)}`);
  },
  nearby(params) {
    return apiRequest(`/workers/nearby${query(params)}`);
  },
  getById(id) {
    return apiRequest(`/workers/${id}`);
  },
  createProfile(payload) {
    return apiRequest("/workers", { method: "POST", body: payload });
  },
  updateProfile(id, payload) {
    return apiRequest(`/workers/${id}`, { method: "PUT", body: payload });
  },
  updateAvailability(availability) {
    return apiRequest("/workers/availability", {
      method: "PUT",
      body: { availability },
    });
  },
};
