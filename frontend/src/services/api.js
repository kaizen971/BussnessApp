import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// URL du serveur AWS Lightsail (HTTPS)
const API_BASE_URL = 'https://businessapp.installpostiz.com/bussnessapp';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15s max — évite d'attendre indéfiniment si le serveur est lent
  headers: {
    'Content-Type': 'application/json',
  },
});

// Cache en mémoire pour éviter de lire AsyncStorage à chaque requête
let cachedToken = null;
let refreshPromise = null;

export const setCachedToken = (token) => { cachedToken = token; };
export const clearCachedToken = () => { cachedToken = null; };

const refreshAuthToken = async () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const token = cachedToken || await AsyncStorage.getItem('userToken');
    if (!token) throw new Error('No token to refresh');

    const response = await api.post('/auth/refresh', null, {
      headers: { Authorization: `Bearer ${token}` },
      skipAuthRefresh: true,
    });

    const { token: newToken, user } = response.data || {};
    if (!newToken || !user) throw new Error('Invalid refresh response');

    cachedToken = newToken;
    await Promise.all([
      AsyncStorage.setItem('userToken', newToken),
      AsyncStorage.setItem('userData', JSON.stringify(user)),
    ]);

    return { token: newToken, user };
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

// Préchargement unique au démarrage — partagé avec l'intercepteur
const tokenPreload = AsyncStorage.getItem('userToken').then(t => { cachedToken = t; });

// Add token to requests
api.interceptors.request.use(
  async (config) => {
    // Attend la fin du préchargement si pas encore terminé (évite double lecture)
    if (!cachedToken) await tokenPreload;
    if (cachedToken) {
      config.headers.Authorization = `Bearer ${cachedToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      // Server responded with error status
      console.error('API Error Response:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
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
          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('userData');
          cachedToken = null;
          return Promise.reject(refreshError);
        }
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('API No Response:', error.request);
    } else {
      // Error setting up the request
      console.error('API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  register: (userData) => api.post('/auth/register', userData),
  refreshToken: () => refreshAuthToken(),
  getCurrentUser: () => api.get('/auth/me'),
  changePassword: (oldPassword, newPassword) => api.post('/auth/change-password', { oldPassword, newPassword }),
  updateProfilePhoto: (imageUri) => {
    const formData = new FormData();
    formData.append('profilePhoto', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'profile.jpg',
    });
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
  getAll: (projectId) => api.get('/sales', { params: { projectId } }),
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

// Products API
export const productsAPI = {
  getAll: (projectId) => api.get('/products', { params: { projectId } }),
  create: (data, imageUri) => {
    if (imageUri) {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (key !== 'image') formData.append(key, data[key]);
      });
      formData.append('productImage', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'product.jpg',
      });
      return api.post('/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.post('/products', data);
  },
  update: (id, data, imageUri) => {
    if (imageUri) {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (key !== 'image') formData.append(key, data[key]);
      });
      formData.append('productImage', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'product.jpg',
      });
      return api.put(`/products/${id}`, formData, {
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

// Export API
export const exportAPI = {
  exportToExcel: async (projectId, startDate, endDate) => {
    const response = await api.post(`/export-excel/${projectId}`,
      { startDate, endDate },
      { responseType: 'blob' }
    );
    return response;
  },
  exportToPdf: async (projectId, startDate, endDate) => {
    const response = await api.post(`/export-pdf/${projectId}`,
      { startDate, endDate },
      { responseType: 'blob' }
    );
    return response;
  },
};

// Subscription API
export const subscriptionAPI = {
  getMySubscription: () => api.get('/subscription/my'),
  getPlans: () => api.get('/subscription/plans'),
};

// Legal API (pas besoin d'authentification)
export const legalAPI = {
  getCGU: () => api.get('/legal/cgu'),
};

export default api;
