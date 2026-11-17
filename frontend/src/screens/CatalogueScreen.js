import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, useThemedStyles } from '../contexts/ThemeContext';
import { EmptyState, SearchField } from '../components/AppPrimitives';
import { AppHeader } from '../components/AppHeader';
import { productsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { radius, spacing } from '../utils/designSystem';
import { t, useLanguage } from '../i18n';

const GRID_GAP = spacing.sm;
const CARD_WIDTH = (Dimensions.get('window').width - spacing.md * 2 - GRID_GAP) / 2;

// Le serveur ne renvoie aux salariés que la disponibilité (jamais les quantités) ;
// un produit sans stock suivi (service…) est disponible
const isOutOfStock = (product) => !!product.isOutOfStock;

// Catalogue à montrer au client : prix de vente et disponibilité uniquement
export const CatalogueScreen = ({ navigation, route }) => {
  useLanguage();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const { format: formatPrice } = useCurrency();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getAll(user?.projectId);
      setProducts((response.data?.data || []).filter((product) => product.isActive !== false));
    } catch (error) {
      Alert.alert(t('Erreur'), t('Impossible de charger les produits'));
    } finally {
      setLoading(false);
    }
  }, [user?.projectId]);

  // Rechargé à chaque affichage : la disponibilité suit les ventes
  useFocusEffect(useCallback(() => { loadProducts(); }, [loadProducts]));

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category).filter(Boolean))].sort(),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((product) =>
      (!category || product.category === category) &&
      (!q ||
        product.name?.toLowerCase().includes(q) ||
        product.category?.toLowerCase().includes(q) ||
        product.description?.toLowerCase().includes(q))
    );
  }, [products, searchQuery, category]);

  const sell = (product) => {
    setSelectedProduct(null);
    navigation.navigate('Main', { screen: 'Sales', params: { addProductId: product._id } });
  };

  const renderAvailability = (product, large = false) => {
    const outOfStock = isOutOfStock(product);
    const color = outOfStock ? colors.error : colors.success;
    return (
      <View style={[styles.availability, large && styles.availabilityLarge, { backgroundColor: color + '1A', borderColor: color }]}>
        <Ionicons name={outOfStock ? 'close-circle' : 'checkmark-circle'} size={large ? 16 : 13} color={color} />
        <Text style={[styles.availabilityText, large && styles.availabilityTextLarge, { color }]}>
          {outOfStock ? t('Rupture') : t('Disponible')}
        </Text>
      </View>
    );
  };

  const renderProduct = ({ item }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => setSelectedProduct(item)}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.imagePlaceholder]}>
          <Ionicons name="cube-outline" size={36} color={colors.primary} />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.cardPrice}>{formatPrice(item.unitPrice)}</Text>
        {renderAvailability(item)}
      </View>
      <TouchableOpacity
        style={styles.sellButton}
        onPress={() => sell(item)}
        accessibilityRole="button"
        accessibilityLabel={t('Vendre {name}', { name: item.name })}
      >
        <Ionicons name="cart-outline" size={16} color={colors.onPrimary} />
        <Text style={styles.sellButtonText}>{t('Vendre')}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <AppHeader
        title={t('Catalogue')}
        subtitle={t('{count} produit(s)', { count: filteredProducts.length })}
        onBack={route?.name === 'CatalogueView' ? () => navigation.goBack() : undefined}
      />
      <SearchField
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={t('Rechercher un produit...')}
        style={styles.search}
      />
      {categories.length > 0 && (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {[null, ...categories].map((cat) => (
              <TouchableOpacity
                key={cat || '__all'}
                style={[styles.chip, category === cat && styles.chipSelected]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextSelected]}>{cat || t('Tout')}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item._id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={loadProducts}
        ListEmptyComponent={
          <EmptyState
            icon={searchQuery ? 'search-outline' : 'pricetags-outline'}
            title={searchQuery ? t('Aucun résultat trouvé') : t('Catalogue vide')}
            description={searchQuery ? t('Aucun produit ne correspond à "{searchQuery}"', { searchQuery }) : t('Aucun produit à présenter pour le moment.')}
          />
        }
      />

      {/* Fiche plein écran à montrer au client */}
      <Modal visible={!!selectedProduct} animationType="slide" onRequestClose={() => setSelectedProduct(null)}>
        {selectedProduct && (
          <View style={styles.detail}>
            <ScrollView contentContainerStyle={styles.detailContent}>
              {selectedProduct.image ? (
                <Image source={{ uri: selectedProduct.image }} style={styles.detailImage} resizeMode="cover" />
              ) : (
                <View style={[styles.detailImage, styles.imagePlaceholder]}>
                  <Ionicons name="cube-outline" size={72} color={colors.primary} />
                </View>
              )}
              <View style={styles.detailBody}>
                {selectedProduct.category ? <Text style={styles.detailCategory}>{selectedProduct.category}</Text> : null}
                <Text style={styles.detailName}>{selectedProduct.name}</Text>
                <Text style={styles.detailPrice}>{formatPrice(selectedProduct.unitPrice)}</Text>
                {renderAvailability(selectedProduct, true)}
                {selectedProduct.description ? <Text style={styles.detailDescription}>{selectedProduct.description}</Text> : null}
              </View>
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedProduct(null)}
              accessibilityRole="button"
              accessibilityLabel={t('Fermer')}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.detailFooter}>
              <TouchableOpacity
                style={styles.detailSellButton}
                onPress={() => sell(selectedProduct)}
                accessibilityRole="button"
              >
                <Ionicons name="cart" size={20} color={colors.onPrimary} />
                <Text style={styles.detailSellText}>{t('Vendre ce produit')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
};

const createStyles = (colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  search: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  chips: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.onPrimary,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  row: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.surfaceLight,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '12',
  },
  cardBody: {
    padding: spacing.sm,
    gap: 6,
    flexGrow: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  cardPrice: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
  },
  availability: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  availabilityLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  availabilityTextLarge: {
    fontSize: 14,
  },
  sellButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    margin: spacing.sm,
    marginTop: 0,
    paddingVertical: 9,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  sellButtonText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  detail: {
    flex: 1,
    backgroundColor: colors.background,
  },
  detailContent: {
    paddingBottom: 120,
  },
  detailImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.surfaceLight,
  },
  detailBody: {
    padding: spacing.xl,
    gap: spacing.sm,
  },
  detailCategory: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  detailName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  detailPrice: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
  },
  detailDescription: {
    marginTop: spacing.xs,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  closeButton: {
    position: 'absolute',
    top: 54,
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailSellButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  detailSellText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
