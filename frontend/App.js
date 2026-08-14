import 'react-native-gesture-handler';
import React from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { CurrencyProvider } from './src/contexts/CurrencyContext';
import { SubscriptionProvider, useSubscription } from './src/contexts/SubscriptionContext';
import { IAPProvider } from './src/contexts/IAPContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { ThemePicker } from './src/components/ThemePicker';
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
import { MoreScreen } from './src/screens/MoreScreen';
import { CsvImportScreen } from './src/screens/CsvImportScreen';
import { SubscriptionScreen } from './src/screens/SubscriptionScreen';
import { PaywallScreen } from './src/screens/PaywallScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => {
  const { colors } = useTheme();

  return (
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
};

function PremiumGate(WrappedComponent, screenName, featureName) {
  return function GatedScreen(props) {
    const { canAccessScreen } = useSubscription();
    if (!canAccessScreen(screenName)) {
      return <PaywallScreen {...props} route={{ ...props.route, params: { ...props.route?.params, featureName } }} />;
    }
    return <WrappedComponent {...props} />;
  };
}

const TAB_ICONS = {
  Dashboard: ['home', 'home-outline'],
  Sales: ['cart', 'cart-outline'],
  Products: ['pricetag', 'pricetag-outline'],
  Customers: ['people', 'people-outline'],
  More: ['grid', 'grid-outline'],
};

const MainTabs = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 3,
        },
        tabBarItemStyle: {
          paddingTop: 5,
        },
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingTop: 4,
          paddingBottom: Platform.OS === 'ios' ? 20 : 4,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarIcon: ({ color, focused, size }) => {
          const icons = TAB_ICONS[route.name];
          return <Ionicons name={focused ? icons[0] : icons[1]} size={Math.min(size, 22)} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Accueil' }} />
      <Tab.Screen name="Sales" component={SalesScreen} options={{ title: 'Ventes' }} />
      <Tab.Screen name="Products" component={ProductsScreen} options={{ title: 'Produits' }} />
      <Tab.Screen
        name="Customers"
        component={PremiumGate(CustomersScreen, 'Customers', 'CRM Clients')}
        options={{
          title: 'Clients',
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontSize: 20, fontWeight: '700' },
          headerShadowVisible: false,
        }}
      />
      <Tab.Screen name="More" component={MoreScreen} options={{ title: 'Plus' }} />
    </Tab.Navigator>
  );
};

const MainStack = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="Main"
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '700',
        },
        headerRight: () => <ThemePicker />,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
    <Stack.Screen
      name="Main"
      component={MainTabs}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Onboarding"
      component={OnboardingScreen}
      options={{ headerShown: false }}
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
    <Stack.Screen
      name="CsvImport"
      component={CsvImportScreen}
      options={{ title: 'Import CSV' }}
    />
    </Stack.Navigator>
  );
};

const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();
  const { colors, isDark } = useTheme();

  if (loading) {
    return null;
  }

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.error,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

const ThemedStatusBar = () => {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CurrencyProvider>
          <SubscriptionProvider>
            <IAPProvider>
              <ThemedStatusBar />
              <AppNavigator />
            </IAPProvider>
          </SubscriptionProvider>
        </CurrencyProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
