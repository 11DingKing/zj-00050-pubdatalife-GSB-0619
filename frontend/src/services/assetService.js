import { request, API_BASE } from "./httpClient";

export const assetService = {
  async getDepartments() {
    return request(`${API_BASE}/departments`);
  },

  async getAssets() {
    return request(`${API_BASE}/assets`);
  },

  async getAssetDetail(id) {
    return request(`${API_BASE}/assets/${id}`);
  },

  async createAsset(data) {
    return request(`${API_BASE}/assets`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async completeStage(id, data) {
    return request(`${API_BASE}/assets/${id}/complete-stage`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
