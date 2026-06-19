import { request, API_BASE } from "./httpClient";

export const riskService = {
  async getRiskWarnings(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const url = params
      ? `${API_BASE}/risk/warnings?${params}`
      : `${API_BASE}/risk/warnings`;
    return request(url);
  },

  async getAssetRiskInfo(assetId) {
    return request(`${API_BASE}/risk/asset/${assetId}`);
  },

  async handleWarning(warningId, data) {
    return request(`${API_BASE}/risk/warnings/${warningId}/handle`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async reviewWarning(warningId, data) {
    return request(`${API_BASE}/risk/warnings/${warningId}/review`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async recalculateRisk(assetId) {
    return request(`${API_BASE}/risk/asset/${assetId}/recalculate`, {
      method: "POST",
    });
  },

  async getRiskOverview(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const url = params
      ? `${API_BASE}/risk/overview?${params}`
      : `${API_BASE}/risk/overview`;
    return request(url);
  },

  async getAssetsWithWarnings() {
    return request(`${API_BASE}/risk/assets-with-warnings`);
  },
};
