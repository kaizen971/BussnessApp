import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI, clearStoredAuth } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [availableProjects, setAvailableProjects] = useState([]);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = localStorage.getItem('userToken');
      const storedUser = localStorage.getItem('userData');
      const storedProjectId = localStorage.getItem('selectedProjectId');

      if (storedToken && storedUser) {
        let activeToken = storedToken;
        let userData = JSON.parse(storedUser);

        try {
          const refreshed = await authAPI.refreshToken();
          activeToken = refreshed.token;
          userData = refreshed.user;
        } catch (refreshError) {
          const status = refreshError.response?.status;
          console.log('Stored session refresh failed:', refreshError.response?.data || refreshError.message);
          // Ne déconnecter QUE si le token est réellement invalide/expiré (401/403).
          // Sur erreur réseau ou serveur (5xx, timeout), on conserve la session locale.
          if (status === 401 || status === 403) {
            clearStoredAuth();
            return;
          }
        }

        setToken(activeToken);
        setUser(userData);
        if (storedProjectId) {
          setSelectedProjectId(storedProjectId);
        } else if (userData.projectId) {
          setSelectedProjectId(userData.projectId);
        }
      }
    } catch (error) {
      console.error('Error loading auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await authAPI.login(username, password);
      const { user: userData, token: userToken } = response.data;

      localStorage.setItem('userToken', userToken);
      localStorage.setItem('userData', JSON.stringify(userData));

      setToken(userToken);
      setUser(userData);

      return { success: true };
    } catch (error) {
      console.log('Login error details:', error.response?.data);
      const errorData = error.response?.data;
      const errorMessage = errorData?.error || 'Échec de la connexion - vérifiez votre connexion';

      return {
        success: false,
        error: errorMessage,
        code: errorData?.code || 'UNKNOWN',
        field: errorData?.field,
        details: errorData?.details,
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const data = response.data;

      if (data.pendingActivation) {
        return {
          success: true,
          pendingActivation: true,
          message: data.message,
        };
      }

      if (data.token) {
        localStorage.setItem('userToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
      }

      return {
        success: true,
        autoActivated: data.autoActivated,
        pendingActivation: data.pendingActivation,
        message: data.message,
      };
    } catch (error) {
      console.log('Registration error details:', error.response?.data);
      const errorData = error.response?.data;
      const errorMessage = errorData?.error || "Échec de l'inscription - vérifiez votre connexion";

      return {
        success: false,
        error: errorMessage,
        code: errorData?.code || 'UNKNOWN',
        field: errorData?.field,
        details: errorData?.details,
      };
    }
  };

  const logout = () => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
    setSelectedProjectId(null);
    setAvailableProjects([]);
  };

  const updateUser = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    localStorage.setItem('userData', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const selectProject = (projectId) => {
    localStorage.setItem('selectedProjectId', projectId);
    setSelectedProjectId(projectId);
    localStorage.setItem('userData', JSON.stringify({ ...user, projectId }));
    setUser({ ...user, projectId });
  };

  const deleteAccount = async (password) => {
    try {
      await authAPI.deleteAccount(password);
      logout();
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Impossible de supprimer le compte.';
      return { success: false, error: errorMessage };
    }
  };

  const loadAvailableProjects = (projects) => {
    setAvailableProjects(projects);
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    deleteAccount,
    updateUser,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin' || user?.role === 'responsable',
    isManager: user?.role === 'manager' || user?.role === 'admin' || user?.role === 'responsable',
    selectedProjectId,
    selectProject,
    availableProjects,
    loadAvailableProjects,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
