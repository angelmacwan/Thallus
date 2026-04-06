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

// ── Waitlist ─────────────────────────────────────────────────────────
export const waitlist = {
  join: (email) => api.post('/auth/waitlist', { email }),
};

// ── Auth ──────────────────────────────────────────────────────────────
export const authApi = {
  sendSignupOtp: (email) => api.post('/auth/send-signup-otp', { email }),
  register: (email, password, otp) =>
    api.post('/auth/register', { email, password, otp }),
  sendResetOtp: (email) => api.post('/auth/send-reset-otp', { email }),
  resetPassword: (email, otp, newPassword) =>
    api.post('/auth/reset-password', { email, otp, new_password: newPassword }),
};

// ── Small World API ─────────────────────────────────────────────────
export const swAgents = {
  list: (worldId) => api.get(`/small-world/worlds/${worldId}/agents/`),
  graph: (worldId) => api.get(`/small-world/worlds/${worldId}/agents/graph`),
  get: (worldId, id) => api.get(`/small-world/worlds/${worldId}/agents/${id}`),
  create: (worldId, data) => api.post(`/small-world/worlds/${worldId}/agents/`, data),
  update: (worldId, id, data) => api.put(`/small-world/worlds/${worldId}/agents/${id}`, data),
  delete: (worldId, id) => api.delete(`/small-world/worlds/${worldId}/agents/${id}`),
  generate: (worldId, data) => api.post(`/small-world/worlds/${worldId}/agents/generate`, data),
  bulkImport: (worldId, formData) => api.post(`/small-world/worlds/${worldId}/agents/bulk-import`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  template: (worldId) => api.get(`/small-world/worlds/${worldId}/agents/template`, { responseType: 'blob' }),
  getRelationships: (worldId, id) => api.get(`/small-world/worlds/${worldId}/agents/${id}/relationships`),
  createRelationship: (worldId, id, data) => api.post(`/small-world/worlds/${worldId}/agents/${id}/relationships`, data),
  deleteRelationship: (worldId, id, relId) => api.delete(`/small-world/worlds/${worldId}/agents/${id}/relationships/${relId}`),
  updateRelationship: (worldId, id, relId, data) => api.patch(`/small-world/worlds/${worldId}/agents/${id}/relationships/${relId}`, data),
  autoSuggest: (worldId, agentIds) => api.post(`/small-world/worlds/${worldId}/agents/auto-suggest-relationships`, { agent_ids: agentIds }),
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
    resimulate: (worldId, scenId) => api.post(`/small-world/worlds/${worldId}/scenarios/${scenId}/resimulate`),
  },
};

// ── Admin API ─────────────────────────────────────────────────────────────────
export const adminApi = {
  me: () => api.get('/admin/me'),
  users: {
    list: () => api.get('/admin/users'),
    update: (id, data) => api.patch(`/admin/users/${id}`, data),
    delete: (id) => api.delete(`/admin/users/${id}`),
  },
  sessions: {
    list: () => api.get('/admin/sessions'),
    update: (id, data) => api.patch(`/admin/sessions/${id}`, data),
    delete: (id) => api.delete(`/admin/sessions/${id}`),
  },
  reports: {
    list: () => api.get('/admin/reports'),
    delete: (id) => api.delete(`/admin/reports/${id}`),
  },
  transactions: {
    list: () => api.get('/admin/transactions'),
    delete: (id) => api.delete(`/admin/transactions/${id}`),
  },
  unauthorizedAttempts: {
    list: () => api.get('/admin/unauthorized-attempts'),
    delete: (id) => api.delete(`/admin/unauthorized-attempts/${id}`),
  },
};

