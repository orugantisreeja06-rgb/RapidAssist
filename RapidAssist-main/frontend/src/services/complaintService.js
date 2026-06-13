import { apiRequest } from "../utils/api.js";

export const complaintService = {
  submit(payload) {
    return apiRequest("/complaints", { method: "POST", body: payload });
  },
  userComplaints() {
    return apiRequest("/complaints/user");
  },
  get(id) {
    return apiRequest(`/complaints/${id}`);
  },
  updateStatus(id, status) {
    return apiRequest(`/complaints/status/${id}`, {
      method: "PUT",
      body: { status },
    });
  },
  resolve(id, payload) {
    return apiRequest(`/complaints/resolve/${id}`, {
      method: "PUT",
      body: payload,
    });
  },
};
