import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/icon/dashboard.png';

export const OnboardingScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const handleModuleChoice = (module) => {
    if (module === 'simulation') {
      navigation.navigate('Simulation');
    } else if (module === 'business') {
      navigation.navigate('Main', { screen: 'Dashboard' });
    } else if (module === 'tutorial') {
      navigation.navigate('Tutorial');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Image source={logo} style={styles.logo} />
          <Text style={styles.appName}>Entreprendre avec succès - EAS</Text>
          {isAdmin && (
            <Text style={styles.slogan}>Valide ton idée. Pilote ton business. Simplement.</Text>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.question}>Que veux-tu faire aujourd'hui ?</Text>
          {isAdmin && (
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleModuleChoice('tutorial')}
              activeOpacity={0.8}
            >
              <View style={styles.cardIcon}>
                <Ionicons name="school-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Guide de démarrage</Text>
                <Text style={styles.cardDescription}>Configurez votre business étape par étape</Text>
              </View>
              <View style={styles.cardArrow}>
                <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
              </View>
            </TouchableOpacity>
          )}
          {isAdmin && (
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleModuleChoice('simulation')}
              activeOpacity={0.8}
            >
              <View style={styles.cardIcon}>
                <Ionicons name="calculator-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Simuler une activité</Text>
                <Text style={styles.cardDescription}>Rentabilité, point mort et business plan</Text>
              </View>
              <View style={styles.cardArrow}>
                <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.card}
            onPress={() => handleModuleChoice('business')}
            activeOpacity={0.8}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="analytics-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Accéder à mon activité</Text>
              <Text style={styles.cardDescription}>Ventes, dépenses, stock et clients</Text>
            </View>
            <View style={styles.cardArrow}>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    paddingTop: 64,
    paddingBottom: 28,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 14,
    textAlign: 'center',
  },
  slogan: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  question: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  card: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.primary + '18',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  cardDescription: {
    fontSize: 12,
    color: colors.textLight,
    lineHeight: 17,
    marginTop: 3,
  },
  cardArrow: {
    marginLeft: 8,
  },
  logo: {
    width: 72,
    height: 72,
    resizeMode: 'contain',
    borderRadius: 12,
    overflow: 'hidden',
  },
});
