import { request, API_BASE } from "./httpClient";

export const statisticsService = {
  async getDashboard() {
    return request(`${API_BASE}/dashboard`);
  },

  async getRevenue() {
    return request(`${API_BASE}/revenue`);
  },
};
