import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { CurrencyProvider } from './src/contexts/CurrencyContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { SimulationScreen } from './src/screens/SimulationScreen';
import { SalesScreen } from './src/screens/SalesScreen';
import { ExpensesScreen } from './src/screens/ExpensesScreen';
import { StockScreen } from './src/screens/StockScreen';
import { CustomersScreen } from './src/screens/CustomersScreen';
import { FeedbackScreen } from './src/screens/FeedbackScreen';
import { ProductsScreen } from './src/screens/ProductsScreen';
import { TeamScreen } from './src/screens/TeamScreen';
import { ProjectsScreen } from './src/screens/ProjectsScreen';
import { PlanningScreen } from './src/screens/PlanningScreen';
import { CommissionsScreen } from './src/screens/CommissionsScreen';
import { TutorialScreen } from './src/screens/TutorialScreen';
import { CategoriesScreen } from './src/screens/CategoriesScreen';
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
      name="Onboarding"
      component={OnboardingScreen}
      options={{ headerShown: false }}
    />
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
      name="Products"
      component={ProductsScreen}
      options={{ title: 'Produits', headerShown: false }}
    />
    <Stack.Screen
      name="Customers"
      component={CustomersScreen}
      options={{ title: 'Clients CRM' }}
    />
    <Stack.Screen
      name="Team"
      component={TeamScreen}
      options={{ title: 'Équipe', headerShown: false }}
    />
    <Stack.Screen
      name="Feedback"
      component={FeedbackScreen}
      options={{ title: 'Feedback' }}
    />
    <Stack.Screen
      name="Projects"
      component={ProjectsScreen}
      options={{ title: 'Projets', headerShown: false }}
    />
    <Stack.Screen
      name="Planning"
      component={PlanningScreen}
      options={{ title: 'Planning', headerShown: false }}
    />
    <Stack.Screen
      name="Commissions"
      component={CommissionsScreen}
      options={{ title: 'Commissions', headerShown: false }}
    />
    <Stack.Screen
      name="Tutorial"
      component={TutorialScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Categories"
      component={CategoriesScreen}
      options={{ headerShown: false }}
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
      <CurrencyProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </CurrencyProvider>
    </AuthProvider>
  );
}
