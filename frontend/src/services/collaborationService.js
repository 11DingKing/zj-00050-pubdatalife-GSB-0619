import { request, API_BASE } from "./httpClient";

export const collaborationService = {
  async getTodos(deptId) {
    const url = deptId
      ? `${API_BASE}/todos?dept_id=${deptId}`
      : `${API_BASE}/todos`;
    return request(url);
  },

  async getCollaborations() {
    return request(`${API_BASE}/collaborations`);
  },

  async urgeCollaboration(collabId) {
    return request(`${API_BASE}/collaborations/${collabId}/urge`, {
      method: "POST",
    });
  },
};
