import axios from 'axios';

// En dev : proxy Vite '/BussnessApp' → https://businessapp.installpostiz.com/bussnessapp
// En prod : même origine, le reverse proxy route /bussnessapp — on garde le préfixe /BussnessApp
// réécrit côté serveur comme pour le backoffice.
const API_BASE_URL = '/BussnessApp';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15s max — évite d'attendre indéfiniment si le serveur est lent
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise = null;

export const getStoredToken = () => localStorage.getItem('userToken');
export const clearStoredAuth = () => {
  localStorage.removeItem('userToken');
  localStorage.removeItem('userData');
  localStorage.removeItem('selectedProjectId');
};

const refreshAuthToken = async () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const token = getStoredToken();
    if (!token) throw new Error('No token to refresh');

    const response = await api.post('/auth/refresh', null, {
      headers: { Authorization: `Bearer ${token}` },
      skipAuthRefresh: true,
    });

    const { token: newToken, user } = response.data || {};
    if (!newToken || !user) throw new Error('Invalid refresh response');

    localStorage.setItem('userToken', newToken);
    localStorage.setItem('userData', JSON.stringify(user));

    return { token: newToken, user };
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

// Ajoute le token aux requêtes
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Gestion des erreurs + refresh automatique sur token expiré
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      console.error('API Error Response:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
      });

      const originalRequest = error.config;
      const isExpiredToken =
        error.response.status === 403 &&
        error.response.data?.code === 'TOKEN_EXPIRED';

      if (isExpiredToken && originalRequest && !originalRequest._retry && !originalRequest.skipAuthRefresh) {
        originalRequest._retry = true;
        try {
          const refreshed = await refreshAuthToken();
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${refreshed.token}`;
          return api(originalRequest);
        } catch (refreshError) {
          clearStoredAuth();
          return Promise.reject(refreshError);
        }
      }
    } else if (error.request) {
      console.error('API No Response:', error.request);
    } else {
      console.error('API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Télécharge un blob dans le navigateur (remplace expo-file-system/sharing)
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Auth API
export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  register: (userData) => api.post('/auth/register', userData),
  refreshToken: () => refreshAuthToken(),
  getCurrentUser: () => api.get('/auth/me'),
  changePassword: (oldPassword, newPassword) => api.post('/auth/change-password', { oldPassword, newPassword }),
  deleteAccount: (password) => api.post('/auth/delete-account', { password }),
  updateProfilePhoto: (file) => {
    const formData = new FormData();
    formData.append('profilePhoto', file, file.name || 'profile.jpg');
    return api.put('/auth/profile-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Projects API
export const projectsAPI = {
  getAll: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  updateCurrency: (id, currency) => api.put(`/projects/${id}/currency`, { currency }),
};

// Sales API
export const salesAPI = {
  getAll: (projectId, page, limit) => api.get('/sales', { params: { projectId, page, limit } }),
  create: (data) => api.post('/sales', data),
  update: (saleId, data) => api.put(`/sales/${saleId}`, data),
  refund: (saleId) => api.post(`/sales/${saleId}/refund`),
};

// Expenses API
export const expensesAPI = {
  getAll: (projectId) => api.get('/expenses', { params: { projectId } }),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
  getRecurring: (projectId) => api.get('/recurring-expenses', { params: { projectId } }),
  deleteRecurring: (id) => api.delete(`/recurring-expenses/${id}`),
  updateRecurring: (id, data) => api.put(`/recurring-expenses/${id}`, data),
};

// Stock API
export const stockAPI = {
  getAll: (projectId) => api.get('/stock', { params: { projectId } }),
  create: (data) => api.post('/stock', data),
  update: (id, data) => api.put(`/stock/${id}`, data),
  getMovements: (stockId) => api.get(`/stock/${stockId}/movements`),
  getAllMovements: (projectId, filters = {}) => api.get('/stock-movements', { params: { projectId, ...filters } }),
  addMovement: (data) => api.post('/stock-movements', data),
  getStats: (projectId) => api.get(`/stock-stats/${projectId}`),
  linkProduct: (stockId, productId) => api.post(`/stock/${stockId}/link-product`, { productId }),
};

// Customers API
export const customersAPI = {
  getAll: (projectId) => api.get('/customers', { params: { projectId } }),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
};

// Users API
export const usersAPI = {
  getAll: (projectId) => api.get('/users', { params: { projectId } }),
  create: (data) => api.post('/users', data),
};

// Dashboard API
export const dashboardAPI = {
  getStats: (projectId) => api.get(`/dashboard/${projectId}`),
};

// Team Payroll API
export const teamPayrollAPI = {
  getPayroll: (projectId, month, year) => api.get(`/projects/${projectId}/team-payroll`, { params: { month, year } }),
};

// Feedback API
export const feedbackAPI = {
  getAll: (filters) => api.get('/feedback', { params: filters }),
  create: (data) => api.post('/feedback', data),
  updateStatus: (id, status) => api.put(`/feedback/${id}`, { status }),
};

// Products API — image = objet File (input type="file")
const buildProductFormData = (data, file) => {
  const formData = new FormData();
  Object.keys(data).forEach((key) => {
    if (key !== 'image') formData.append(key, data[key]);
  });
  formData.append('productImage', file, file.name || 'product.jpg');
  return formData;
};

export const productsAPI = {
  getAll: (projectId) => api.get('/products', { params: { projectId } }),
  create: (data, file) => {
    if (file) {
      return api.post('/products', buildProductFormData(data, file), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.post('/products', data);
  },
  update: (id, data, file) => {
    if (file) {
      return api.put(`/products/${id}`, buildProductFormData(data, file), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.put(`/products/${id}`, data);
  },
  delete: (id) => api.delete(`/products/${id}`),
};

// Simulation API
export const simulationAPI = {
  calculate: (data) => api.post('/simulation', data),
};

// Import CSV API — csv = contenu texte du fichier
export const importAPI = {
  importCsv: (type, projectId, csv, options = {}) =>
    api.post('/import-csv', { type, projectId, csv, options }),
};

// Export API
export const exportAPI = {
  exportToExcel: (projectId, startDate, endDate) =>
    api.post(`/export-excel/${projectId}`, { startDate, endDate }, { responseType: 'blob' }),
  exportToPdf: (projectId, startDate, endDate) =>
    api.post(`/export-pdf/${projectId}`, { startDate, endDate }, { responseType: 'blob' }),
};

// Subscription API
export const subscriptionAPI = {
  getMySubscription: () => api.get('/subscription/my'),
  getPlans: () => api.get('/subscription/plans'),
  createCheckout: (planId) => api.post('/subscription/checkout', { planId }),
  getCheckoutStatus: (sessionId) => api.get('/subscription/checkout-status', { params: { session_id: sessionId } }),
};

// Legal API (pas besoin d'authentification)
export const legalAPI = {
  getCGU: () => api.get('/legal/cgu'),
};

export default api;
