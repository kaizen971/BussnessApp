import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { colors, gradients } from '../utils/colors';

export const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    const result = await login(username, password);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Erreur de connexion', result.error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={gradients.primary} style={styles.gradient}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="business-outline" size={60} color="#fff" />
            </View>
            <Text style={styles.title}>BussnessApp</Text>
            <Text style={styles.subtitle}>Gérez votre business intelligemment</Text>
          </View>

          <Card style={styles.loginCard}>
            <Text style={styles.loginTitle}>Connexion</Text>

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
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
            />

            <Button
              title="Créer un compte"
              onPress={() => navigation.navigate('Register')}
              variant="outline"
              style={styles.registerButton}
            />
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              En vous connectant, vous acceptez nos conditions d'utilisation
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  loginCard: {
    marginBottom: 24,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 24,
    textAlign: 'center',
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
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
});
