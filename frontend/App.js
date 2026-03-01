import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { CurrencyProvider } from './src/contexts/CurrencyContext';
import { SubscriptionProvider, useSubscription } from './src/contexts/SubscriptionContext';
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
import { SubscriptionScreen } from './src/screens/SubscriptionScreen';
import { PaywallScreen } from './src/screens/PaywallScreen';
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

function PremiumGate(WrappedComponent, screenName, featureName) {
  return function GatedScreen(props) {
    const { canAccessScreen } = useSubscription();
    if (!canAccessScreen(screenName)) {
      return <PaywallScreen {...props} route={{ ...props.route, params: { ...props.route?.params, featureName } }} />;
    }
    return <WrappedComponent {...props} />;
  };
}

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
      name="Subscription"
      component={SubscriptionScreen}
      options={{ title: 'Mon abonnement' }}
    />
    <Stack.Screen
      name="Paywall"
      component={PaywallScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Simulation"
      component={PremiumGate(SimulationScreen, 'Simulation', 'Simulation Business Plan')}
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
      component={PremiumGate(StockScreen, 'Stock', 'Gestion de stock')}
      options={{ title: 'Stock' }}
    />
    <Stack.Screen
      name="Products"
      component={ProductsScreen}
      options={{ title: 'Produits', headerShown: false }}
    />
    <Stack.Screen
      name="Customers"
      component={PremiumGate(CustomersScreen, 'Customers', 'CRM Clients')}
      options={{ title: 'Clients CRM' }}
    />
    <Stack.Screen
      name="Team"
      component={PremiumGate(TeamScreen, 'Team', 'Gestion d\'équipe')}
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
      component={PremiumGate(PlanningScreen, 'Planning', 'Planning')}
      options={{ title: 'Planning', headerShown: false }}
    />
    <Stack.Screen
      name="Commissions"
      component={PremiumGate(CommissionsScreen, 'Commissions', 'Commissions')}
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
    return null;
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
        <SubscriptionProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </SubscriptionProvider>
      </CurrencyProvider>
    </AuthProvider>
  );
}
