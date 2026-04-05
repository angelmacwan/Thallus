import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// ── Small World API ─────────────────────────────────────────────────
export const swAgents = {
  list: () => api.get('/small-world/agents/'),
  graph: () => api.get('/small-world/agents/graph'),
  get: (id) => api.get(`/small-world/agents/${id}`),
  create: (data) => api.post('/small-world/agents/', data),
  update: (id, data) => api.put(`/small-world/agents/${id}`, data),
  delete: (id) => api.delete(`/small-world/agents/${id}`),
  generate: (data) => api.post('/small-world/agents/generate', data),
  bulkImport: (formData) => api.post('/small-world/agents/bulk-import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  template: () => api.get('/small-world/agents/template', { responseType: 'blob' }),
  allRelationships: () => api.get('/small-world/agents-relationships/all'),
  getRelationships: (id) => api.get(`/small-world/agents/${id}/relationships`),
  createRelationship: (id, data) => api.post(`/small-world/agents/${id}/relationships`, data),
  deleteRelationship: (id, relId) => api.delete(`/small-world/agents/${id}/relationships/${relId}`),
  autoSuggest: (agentIds) => api.post('/small-world/agents/auto-suggest-relationships', { agent_ids: agentIds }),
};

export const swWorlds = {
  list: () => api.get('/small-world/worlds/'),
  get: (id) => api.get(`/small-world/worlds/${id}`),
  create: (data) => api.post('/small-world/worlds/', data),
  update: (id, data) => api.put(`/small-world/worlds/${id}`, data),
  delete: (id) => api.delete(`/small-world/worlds/${id}`),
  agents: (id) => api.get(`/small-world/worlds/${id}/agents`),
  healthCheck: (id) => api.get(`/small-world/worlds/${id}/health-check`),
  scenarios: {
    list: (worldId) => api.get(`/small-world/worlds/${worldId}/scenarios/`),
    get: (worldId, scenId) => api.get(`/small-world/worlds/${worldId}/scenarios/${scenId}`),
    create: (worldId, data) => api.post(`/small-world/worlds/${worldId}/scenarios/`, data),
    run: (worldId, scenId) => api.post(`/small-world/worlds/${worldId}/scenarios/${scenId}/run`),
    report: (worldId, scenId) => api.post(`/small-world/worlds/${worldId}/scenarios/${scenId}/report`),
    diff: (worldId, data) => api.post(`/small-world/worlds/${worldId}/scenarios/diff`, data),
    chat: (worldId, scenId, msg) => api.post(`/small-world/worlds/${worldId}/scenarios/${scenId}/chat`, { message: msg }),
    chatHistory: (worldId, scenId) => api.get(`/small-world/worlds/${worldId}/scenarios/${scenId}/chat`),
  },
};

