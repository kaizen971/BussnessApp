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

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('userToken');
      const storedUser = await AsyncStorage.getItem('userData');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
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
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const updateUser = async (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
    setUser(updatedUser);
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
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager' || user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
