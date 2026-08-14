import React from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useTheme, useThemedStyles } from '../contexts/ThemeContext'
import { ThemePicker } from '../components/ThemePicker'
import { radius, spacing, typography } from '../utils/designSystem'

const GROUPS = [
  {
    title: 'Gestion',
    items: [
      { route: 'Expenses', label: 'Dépenses', detail: 'Charges et paiements', icon: 'wallet-outline', admin: true },
      { route: 'Stock', label: 'Stock', detail: 'Niveaux et mouvements', icon: 'cube-outline', premium: 'Stock' },
      { route: 'Categories', label: 'Catégories', detail: 'Organisation du catalogue', icon: 'grid-outline', admin: true },
      { route: 'CsvImport', label: 'Importer des données', detail: 'Produits, stock, ventes, clients et dépenses', icon: 'document-text-outline', admin: true },
    ],
  },
  {
    title: 'Pilotage',
    items: [
      { route: 'Simulation', label: 'Simulation', detail: 'Rentabilité et point mort', icon: 'calculator-outline', premium: 'Simulation', admin: true },
      { route: 'Planning', label: 'Planning', detail: 'Activités et échéances', icon: 'calendar-outline', premium: 'Planning' },
      { route: 'Commissions', label: 'Commissions', detail: 'Suivi des rémunérations', icon: 'cash-outline', premium: 'Commissions' },
    ],
  },
  {
    title: 'Organisation',
    items: [
      { route: 'Projects', label: 'Mes business', detail: 'Changer ou gérer un business', icon: 'briefcase-outline', admin: true },
      { route: 'Team', label: 'Équipe', detail: 'Membres, rôles et accès', icon: 'people-outline', premium: 'Team', admin: true },
    ],
  },
  {
    title: 'Compte',
    items: [
      { route: 'Subscription', label: 'Abonnement', detail: 'Offre et facturation', icon: 'diamond-outline', admin: true },
      { route: 'Tutorial', label: 'Guide de démarrage', detail: 'Configurer correctement l’application', icon: 'school-outline' },
      { route: 'Feedback', label: 'Nous écrire', detail: 'Question ou suggestion', icon: 'chatbubble-outline' },
    ],
  },
]

export const MoreScreen = ({ navigation }) => {
  const { colors } = useTheme()
  const styles = useThemedStyles(createStyles)
  const { user, logout } = useAuth()
  const { canAccessScreen } = useSubscription()
  const isAdmin = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'responsable'

  const groups = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.admin || isAdmin),
  })).filter((group) => group.items.length > 0)

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.fullName || user?.username || 'U').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.identity}>
            <Text style={styles.title}>Plus</Text>
            <Text style={styles.userName} numberOfLines={1}>{user?.fullName || user?.username}</Text>
          </View>
        </View>

        <ThemePicker mode="row" />

        {groups.map((group) => (
          <View key={group.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{group.title}</Text>
            <View style={styles.list}>
              {group.items.map((item, index) => {
                const locked = item.premium && !canAccessScreen(item.premium)
                return (
                  <TouchableOpacity
                    key={item.route}
                    style={[styles.row, index < group.items.length - 1 && styles.rowBorder]}
                    onPress={() => navigation.navigate(item.route)}
                    activeOpacity={0.72}
                    accessibilityRole="button"
                  >
                    <View style={styles.rowIcon}>
                      <Ionicons name={item.icon} size={20} color={colors.primary} />
                    </View>
                    <View style={styles.rowContent}>
                      <Text style={styles.rowLabel}>{item.label}</Text>
                      <Text style={styles.rowDetail}>{item.detail}</Text>
                    </View>
                    <Ionicons name={locked ? 'lock-closed-outline' : 'chevron-forward'} size={17} color={locked ? colors.warning : colors.textLight} />
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.logout} onPress={logout} activeOpacity={0.72} accessibilityRole="button">
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const createStyles = (colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: 56,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  avatarText: {
    color: colors.onPrimary,
    fontSize: 19,
    fontWeight: '700',
  },
  identity: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  title: {
    ...typography.screenTitle,
    color: colors.text,
  },
  userName: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: 2,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textLight,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xxs,
    textTransform: 'uppercase',
  },
  list: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  row: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: `${colors.primary}16`,
  },
  rowContent: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  rowLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  rowDetail: {
    color: colors.textLight,
    fontSize: 12,
    marginTop: 3,
  },
  logout: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: `${colors.error}55`,
  },
  logoutText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
})
