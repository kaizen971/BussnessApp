import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { ToneSurface as LinearGradient } from '../components/ToneSurface';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../contexts/ThemeContext';
import { t, useLanguage } from '../i18n';

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

export const TutorialScreen = ({ navigation }) => {
  useLanguage();
  const { colors, gradients } = useTheme();
  const styles = useThemedStyles(createStyles);
    const [expandedStep, setExpandedStep] = useState(0);
    const [completedSteps, setCompletedSteps] = useState([]);

    const steps = [
        {
            id: 1,
            title: t('Créer votre business'),
            icon: 'briefcase',
            description: t("Configurez l'identité de votre commerce."),
            details: [
                t('Depuis l\'écran "Projets", cliquez sur "Créer un business".'),
                t("Renseignez le nom, la devise et le secteur d'activité."),
                t('(Admin uniquement) Ajoutez un logo pour personnaliser votre espace.')
            ],
            action: t('Aller aux Projets'),
            route: 'Projects'
        },
        {
            id: 2,
            title: t('Ajouter votre équipe'),
            icon: 'people',
            description: t('Invitez vos collaborateurs.'),
            details: [
                t('Accédez au menu "Équipe".'),
                t('Ajoutez un membre avec son rôle (manager, vendeur...).'),
                t("Définissez son niveau d'accès (lecture, ventes, admin)."),
                t('(Admin uniquement) Personnalisez la photo de profil de chaque membre.')
            ],
            action: t("Gérer l'équipe"),
            route: 'Team'
        },
        {
            id: 3,
            title: t('Créer les catégories'),
            icon: 'grid',
            description: t('Organisez vos produits et services.'),
            details: [
                t('Dans le menu "Produits", allez sur "Gérer les catégories".'),
                t('Créez des familles : Soins, Boissons, Accessoires...'),
                t('Cela facilitera la navigation lors des ventes.')
            ],
            action: t('Créer une catégorie'),
            route: 'CREATE_CATEGORY'
        },
        {
            id: 4,
            title: t('Ajouter vos produits'),
            icon: 'pricetag',
            description: t('Remplissez votre catalogue.'),
            details: [
                t('Ajoutez vos produits ou services un par un.'),
                t('Indiquez le nom, le prix unitaire et la catégorie.'),
                t('Ajoutez une description si nécessaire.')
            ],
            action: t('Ajouter un produit'),
            route: 'Products'
        },
        {
            id: 5,
            title: t('Configurer le stock'),
            icon: 'cube',
            description: t('Initialisez vos quantités.'),
            details: [
                t('Dans le menu "Stock", ajustez les quantités disponibles.'),
                t('Vous pourrez ensuite suivre les entrées et sorties.'),
                t('Gérez les réapprovisionnements facilement.')
            ],
            action: t('Gérer le Stock'),
            route: 'Stock'
        },
        {
            id: 6,
            title: t('Paramètres de vente'),
            icon: 'settings',
            description: t("Personnalisez l'expérience de vente."),
            details: [
                t('Activez les retours ou annulations si besoin.'),
                t("Configurez l'affichage de l'historique pour les employés."),
                t("Gérez les options d'export et de partage de tickets.")
            ],
            action: t('Tableau de bord'),
            route: 'Dashboard'
        },

        {
            id: 8,
            title: t('Lancer votre activité'),
            icon: 'rocket',
            description: t('Vous êtes prêt !'),
            details: [
                t('Enregistrez vos premières ventes.'),
                t('Suivez vos performances en temps réel.'),
                t('Exportez vos données comptables.')
            ],
            action: t('Commencer'),
            route: 'Dashboard'
        }
    ];

    const toggleStep = (index) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedStep(expandedStep === index ? null : index);
    };

    const markAsDone = (index) => {
        if (!completedSteps.includes(index)) {
            setCompletedSteps([...completedSteps, index]);
            // Auto expand next step
            if (index < steps.length - 1) {
                setTimeout(() => {
                    toggleStep(index + 1);
                }, 300);
            }
        }
    };

    const handleAction = (route) => {
        if (route === 'CREATE_CATEGORY') {
            navigation.navigate('Categories');
        } else if (['Dashboard', 'Sales', 'Products', 'Customers'].includes(route)) {
            navigation.navigate('Main', { screen: route });
        } else {
            navigation.navigate(route);
        }
    };

    const renderStep = (step, index) => {
        const isExpanded = expandedStep === index;
        const isCompleted = completedSteps.includes(index);

        return (
            <View key={step.id} style={styles.stepContainer}>
                <TouchableOpacity
                    style={[styles.stepHeader, isExpanded && styles.stepHeaderExpanded]}
                    onPress={() => toggleStep(index)}
                    activeOpacity={0.8}
                >
                    <View style={styles.stepIconContainer}>
                        <LinearGradient
                            colors={isCompleted ? [colors.success, colors.success] : (isExpanded ? gradients.gold : [colors.surfaceLight, colors.surfaceLight])}
                            style={styles.stepIcon}
                        >
                            <Ionicons
                                name={isCompleted ? "checkmark" : step.icon}
                                size={24}
                                color={isCompleted || isExpanded ? colors.secondary : colors.textSecondary}
                            />
                        </LinearGradient>
                        {index < steps.length - 1 && (
                            <View style={[styles.connector, isCompleted && { backgroundColor: colors.success }]} />
                        )}
                    </View>

                    <View style={styles.stepContent}>
                        <Text style={[styles.stepTitle, isCompleted && styles.stepTitleCompleted]}>
                            {step.title}
                        </Text>
                        <Text style={styles.stepDescription}>{step.description}</Text>
                    </View>

                    <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={20}
                        color={colors.textSecondary}
                    />
                </TouchableOpacity>

                {isExpanded && (
                    <View style={styles.stepDetails}>
                        {step.details.map((detail, i) => (
                            <View key={i} style={styles.detailItem}>
                                <Ionicons name="ellipse" size={6} color={colors.primary} style={{ marginTop: 6, marginRight: 8 }} />
                                <Text style={styles.detailText}>{detail}</Text>
                            </View>
                        ))}

                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handleAction(step.route)}
                            >
                                <LinearGradient
                                    colors={gradients.gold}
                                    style={styles.actionGradient}
                                >
                                    <Text style={styles.actionButtonText}>{step.action}</Text>
                                    <Ionicons name="arrow-forward" size={16} color={colors.secondary} />
                                </LinearGradient>
                            </TouchableOpacity>

                            {!isCompleted && (
                                <TouchableOpacity
                                    style={styles.doneButton}
                                    onPress={() => markAsDone(index)}
                                >
                                    <Text style={styles.doneButtonText}>{t('Marquer comme fait')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}
            </View>
        );
    };

    const progress = completedSteps.length / steps.length;

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.background, colors.background]} style={styles.background} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('Tutoriel de Démarrage')}</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.progressBarContainer}>
                <Text style={styles.progressText}>{t('{round}% complété', { round: Math.round(progress * 100) })}</Text>
                <View style={styles.progressBarBackground}>
                    <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.introText}>
                    {t('Bienvenue dans EAS ! Suivez ces étapes pour configurer votre espace de gestion et lancer votre activité sereinement.')}
                </Text>

                <View style={styles.stepsList}>
                    {steps.map(renderStep)}
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>{t("Besoin d'aide supplémentaire ? Contactez le support.")}</Text>
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
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: colors.surface,
        zIndex: 10,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    progressBarContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    progressText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'right',
    },
    progressBarBackground: {
        height: 6,
        backgroundColor: colors.surfaceLight,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 3,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    introText: {
        color: colors.textSecondary,
        fontSize: 16,
        marginBottom: 24,
        lineHeight: 24,
    },
    stepsList: {
        marginBottom: 20,
    },
    stepContainer: {
        marginBottom: 0,
    },
    stepHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: colors.surface,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    stepHeaderExpanded: {
        borderColor: colors.primary,
        backgroundColor: colors.surfaceLight,
    },
    stepIconContainer: {
        alignItems: 'center',
        marginRight: 16,
        width: 40,
    },
    stepIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    connector: {
        width: 2,
        height: 40,
        backgroundColor: colors.border,
        position: 'absolute',
        top: 40,
        zIndex: 1,
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    stepTitleCompleted: {
        color: colors.success,
        textDecorationLine: 'line-through',
    },
    stepDescription: {
        fontSize: 13,
        color: colors.textLight,
    },
    stepDetails: {
        marginLeft: 56,
        marginRight: 16,
        padding: 14,
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    detailText: {
        fontSize: 14,
        color: colors.text,
        lineHeight: 20,
        flex: 1,
    },
    actionButtons: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
    },
    actionButton: {
        borderRadius: 8,
        overflow: 'hidden',
    },
    actionGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        gap: 8,
    },
    actionButtonText: {
        color: colors.secondary,
        fontWeight: '700',
        fontSize: 14,
    },
    doneButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    doneButtonText: {
        color: colors.textLight,
        fontSize: 14,
    },
    footer: {
        alignItems: 'center',
        marginTop: 20,
    },
    footerText: {
        color: colors.textLight,
        fontSize: 12,
    },
});
