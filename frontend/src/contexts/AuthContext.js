import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

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
      const storedToken = await AsyncStorage.getItem('userToken');
      const storedUser = await AsyncStorage.getItem('userData');
      const storedProjectId = await AsyncStorage.getItem('selectedProjectId');

      if (storedToken && storedUser) {
        setToken(storedToken);
        const userData = JSON.parse(storedUser);
        setUser(userData);
        console.log(storedProjectId);
        // Charger le projectId sélectionné ou utiliser celui de l'utilisateur
        if (storedProjectId) {
          console.log('storedProjectId', storedProjectId);
          setSelectedProjectId(storedProjectId);
        } else if (userData.projectId) {
          console.log('userData.projectId', userData.projectId);
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

      // Log pour déboguer le projectId
      console.log('Login successful - User data:', {
        id: userData._id,
        username: userData.username,
        projectId: userData.projectId,
        hasProjectId: !!userData.projectId
      });

      await AsyncStorage.setItem('userToken', userToken);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));

      setToken(userToken);
      setUser(userData);

      return { success: true };
    } catch (error) {
      console.log('Login error details:', error.response?.data);
      const errorData = error.response?.data;
      const errorMessage = errorData?.error || 'Échec de la connexion - vérifiez votre connexion';
      const errorCode = errorData?.code || 'UNKNOWN';
      const errorField = errorData?.field;

      return {
        success: false,
        error: errorMessage,
        code: errorCode,
        field: errorField,
        details: errorData?.details
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const { user: newUser, token: userToken } = response.data;

      await AsyncStorage.setItem('userToken', userToken);
      await AsyncStorage.setItem('userData', JSON.stringify(newUser));

      setToken(userToken);
      setUser(newUser);

      return { success: true };
    } catch (error) {
      console.log('Registration error details:', error.response?.data);
      const errorData = error.response?.data;
      const errorMessage = errorData?.error || 'Échec de l\'inscription - vérifiez votre connexion';
      const errorCode = errorData?.code || 'UNKNOWN';
      const errorField = errorData?.field;

      return {
        success: false,
        error: errorMessage,
        code: errorCode,
        field: errorField,
        details: errorData?.details
      };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('selectedProjectId');
      setToken(null);
      setUser(null);
      setSelectedProjectId(null);
      setAvailableProjects([]);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const updateUser = async (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const selectProject = async (projectId) => {
    await AsyncStorage.setItem('selectedProjectId', projectId);
    setSelectedProjectId(projectId);
    //update projectId in user data
    await AsyncStorage.setItem('userData', JSON.stringify({ ...user, projectId }));
    console.log('updatedUser', projectId);
    setUser({ ...user, projectId });

  };

  const loadAvailableProjects = async (projects) => {
    setAvailableProjects(projects);
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
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
