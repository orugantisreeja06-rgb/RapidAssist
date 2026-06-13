import { apiRequest } from "../utils/api.js";

export const reviewService = {
  add(payload) {
    return apiRequest("/reviews", { method: "POST", body: payload });
  },
  workerReviews(workerId) {
    return apiRequest(`/reviews/worker/${workerId}`);
  },
  average(workerId) {
    return apiRequest(`/reviews/rating/${workerId}`);
  },
  update(reviewId, payload) {
    return apiRequest(`/reviews/${reviewId}`, { method: "PUT", body: payload });
  },
  remove(reviewId) {
    return apiRequest(`/reviews/${reviewId}`, { method: "DELETE" });
  },
};
