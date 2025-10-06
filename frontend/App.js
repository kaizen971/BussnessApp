import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { SimulationScreen } from './src/screens/SimulationScreen';
import { SalesScreen } from './src/screens/SalesScreen';
import { ExpensesScreen } from './src/screens/ExpensesScreen';
import { StockScreen } from './src/screens/StockScreen';
import { CustomersScreen } from './src/screens/CustomersScreen';
import { FeedbackScreen } from './src/screens/FeedbackScreen';
import { colors } from './src/utils/colors';

const Stack = createStackNavigator();

const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: colors.background },
    }}
  >
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const MainStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: colors.primary,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
      cardStyle: { backgroundColor: colors.background },
    }}
  >
    <Stack.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{ title: 'Tableau de bord' }}
    />
    <Stack.Screen
      name="Simulation"
      component={SimulationScreen}
      options={{ title: 'Simulation Business Plan' }}
    />
    <Stack.Screen
      name="Sales"
      component={SalesScreen}
      options={{ title: 'Ventes' }}
    />
    <Stack.Screen
      name="Expenses"
      component={ExpensesScreen}
      options={{ title: 'Dépenses' }}
    />
    <Stack.Screen
      name="Stock"
      component={StockScreen}
      options={{ title: 'Stock' }}
    />
    <Stack.Screen
      name="Customers"
      component={CustomersScreen}
      options={{ title: 'Clients CRM' }}
    />
    <Stack.Screen
      name="Feedback"
      component={FeedbackScreen}
      options={{ title: 'Feedback' }}
    />
  </Stack.Navigator>
);

const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null; // You could add a splash screen here
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </AuthProvider>
  );
}
