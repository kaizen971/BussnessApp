import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://mabouya.servegame.com/BussnessApp/BussnessApp';

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
};

// Sales API
export const salesAPI = {
  getAll: (projectId) => api.get('/sales', { params: { projectId } }),
  create: (data) => api.post('/sales', data),
};

// Expenses API
export const expensesAPI = {
  getAll: (projectId) => api.get('/expenses', { params: { projectId } }),
  create: (data) => api.post('/expenses', data),
};

// Stock API
export const stockAPI = {
  getAll: (projectId) => api.get('/stock', { params: { projectId } }),
  create: (data) => api.post('/stock', data),
  update: (id, data) => api.put(`/stock/${id}`, data),
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
  getAll: () => api.get('/products'),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

// Simulation API
export const simulationAPI = {
  calculate: (data) => api.post('/simulation', data),
};

export default api;
