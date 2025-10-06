import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';

export const OnboardingScreen = ({ navigation }) => {
  const handleModuleChoice = (module) => {
    if (module === 'simulation') {
      navigation.navigate('Simulation');
    } else if (module === 'business') {
      navigation.navigate('Dashboard');
    }
  };

  return (
    <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Ionicons name="briefcase" size={80} color="#fff" />
          <Text style={styles.appName}>BussnessApp</Text>
          <Text style={styles.slogan}>Valide ton idée. Pilote ton business. Simplement.</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.question}>Que veux-tu faire aujourd'hui ?</Text>

          <TouchableOpacity
            style={styles.card}
            onPress={() => handleModuleChoice('simulation')}
            activeOpacity={0.8}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="bulb" size={50} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Valider une idée de business ou de produit</Text>
            <Text style={styles.cardDescription}>
              Simule la rentabilité, calcule ton point mort et crée ton business plan
            </Text>
            <View style={styles.cardArrow}>
              <Ionicons name="arrow-forward" size={24} color={colors.primary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => handleModuleChoice('business')}
            activeOpacity={0.8}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="trending-up" size={50} color={colors.secondary} />
            </View>
            <Text style={styles.cardTitle}>Suivre mon business en cours</Text>
            <Text style={styles.cardDescription}>
              Gère tes ventes, dépenses, stock et clients au quotidien
            </Text>
            <View style={styles.cardArrow}>
              <Ionicons name="arrow-forward" size={24} color={colors.secondary} />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
  },
  slogan: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginTop: 10,
    opacity: 0.9,
    paddingHorizontal: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  question: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardIcon: {
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 10,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 14,
    color: '#333333',
    textAlign: 'center',
    lineHeight: 20,
  },
  cardArrow: {
    alignItems: 'flex-end',
    marginTop: 10,
  },
});
