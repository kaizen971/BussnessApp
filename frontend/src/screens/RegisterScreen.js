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

export const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = async () => {
    const { username, email, password, confirmPassword, fullName } = formData;

    if (!username || !email || !password || !fullName) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    const result = await register({ username, email, password, fullName });
    setLoading(false);

    if (!result.success) {
      Alert.alert('Erreur d\'inscription', result.error);
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
              <Ionicons name="person-add-outline" size={50} color="#fff" />
            </View>
            <Text style={styles.title}>Créer un compte</Text>
            <Text style={styles.subtitle}>Rejoignez BussnessApp dès aujourd'hui</Text>
          </View>

          <Card style={styles.registerCard}>
            <Input
              label="Nom complet"
              value={formData.fullName}
              onChangeText={(value) => updateField('fullName', value)}
              placeholder="Entrez votre nom complet"
              icon="person-outline"
            />

            <Input
              label="Nom d'utilisateur"
              value={formData.username}
              onChangeText={(value) => updateField('username', value)}
              placeholder="Choisissez un nom d'utilisateur"
              icon="at-outline"
              autoCapitalize="none"
            />

            <Input
              label="Email"
              value={formData.email}
              onChangeText={(value) => updateField('email', value)}
              placeholder="votre.email@exemple.com"
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label="Mot de passe"
              value={formData.password}
              onChangeText={(value) => updateField('password', value)}
              placeholder="Minimum 6 caractères"
              icon="lock-closed-outline"
              secureTextEntry
            />

            <Input
              label="Confirmer le mot de passe"
              value={formData.confirmPassword}
              onChangeText={(value) => updateField('confirmPassword', value)}
              placeholder="Retapez votre mot de passe"
              icon="lock-closed-outline"
              secureTextEntry
            />

            <Button
              title="S'inscrire"
              onPress={handleRegister}
              loading={loading}
              style={styles.registerButton}
            />

            <Button
              title="Retour à la connexion"
              onPress={() => navigation.goBack()}
              variant="ghost"
              style={styles.backButton}
            />
          </Card>
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
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  registerCard: {
    marginBottom: 24,
  },
  registerButton: {
    marginTop: 8,
  },
  backButton: {
    marginTop: 12,
  },
});
