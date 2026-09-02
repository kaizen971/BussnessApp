import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Animated,
  Image,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { useTheme, useThemedStyles } from '../contexts/ThemeContext';

const logo = require('../assets/icon/dashboard.png');

export const LoginScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    const result = await login(username, password);
    setLoading(false);

    if (!result.success) {
      // Affichage détaillé de l'erreur avec le code et les détails
      let errorTitle = 'Erreur de connexion';
      let errorMessage = result.error;

      if (result.code) {
        errorMessage += `\n\nCode: ${result.code}`;
      }
      if (result.field) {
        errorMessage += `\nChamp concerné: ${result.field}`;
      }
      if (result.details) {
        errorMessage += `\n\nDétails techniques: ${result.details}`;
      }

      Alert.alert(errorTitle, errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.background}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.iconContainer}>
              <Image source={logo} style={styles.logo} />
            </View>
            <Text style={styles.title}>EAS</Text>
            <Text style={styles.subtitle}>Pilotez votre activité avec clarté</Text>
          </Animated.View>

          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <Card style={styles.loginCard}>
              <Text style={styles.loginTitle}>Connexion</Text>
              <Text style={styles.loginSubtitle}>Accédez à votre espace professionnel</Text>

              <Input
                label="Nom d'utilisateur ou Email"
                value={username}
                onChangeText={setUsername}
                placeholder="Entrez votre identifiant"
                icon="person-outline"
                autoCapitalize="none"
              />

              <Input
                label="Mot de passe"
                value={password}
                onChangeText={setPassword}
                placeholder="Entrez votre mot de passe"
                icon="lock-closed-outline"
                secureTextEntry
              />

              <Button
                title="Se connecter"
                icon="log-in-outline"
                onPress={handleLogin}
                loading={loading}
                style={styles.loginButton}
              />

              <Button
                title="Créer un compte"
                icon="person-add-outline"
                onPress={() => navigation.navigate('Register')}
                variant="outline"
                style={styles.registerButton}
              />
            </Card>
          </Animated.View>

          <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
            <Text style={styles.footerText}>
              En vous connectant, vous acceptez nos conditions d'utilisation
            </Text>
          </Animated.View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors) => ({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textLight,
    fontWeight: '400',
  },
  loginCard: {
    marginBottom: 24,
    padding: 20,
  },
  loginTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  loginSubtitle: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 4,
    marginBottom: 24,
  },
  loginButton: {
    marginTop: 8,
  },
  registerButton: {
    marginTop: 12,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
  },
  logo: {
    width: 58,
    height: 58,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
