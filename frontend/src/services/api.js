import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// URL du serveur AWS Lightsail (HTTPS)
const API_BASE_URL = 'https://businessapp.installpostiz.com/bussnessapp';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error('API Error Response:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      });
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
  getCurrentUser: () => api.get('/auth/me'),
  changePassword: (oldPassword, newPassword) => api.post('/auth/change-password', { oldPassword, newPassword }),
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

// Feedback API
export const feedbackAPI = {
  getAll: (filters) => api.get('/feedback', { params: filters }),
  create: (data) => api.post('/feedback', data),
  updateStatus: (id, status) => api.put(`/feedback/${id}`, { status }),
};

// Products API
export const productsAPI = {
  getAll: (projectId) => api.get('/products', { params: { projectId } }),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

// Simulation API
export const simulationAPI = {
  calculate: (data) => api.post('/simulation', data),
};

// Export API
export const exportAPI = {
  exportToExcel: async (projectId, startDate, endDate) => {
    try {
      const response = await api.post(`/export-excel/${projectId}`,
        { startDate, endDate },
        {
          responseType: 'blob',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      console.log('Export response:', response);
      return response;
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  },
};

export default api;
