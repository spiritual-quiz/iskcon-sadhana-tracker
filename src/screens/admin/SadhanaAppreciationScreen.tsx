import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { appreciationService } from '../../services/appreciationService';
import { AppreciationCard, AppreciationCategory } from '../../types/appreciation';

export const SadhanaAppreciationScreen = ({ navigation }: any) => {
  const [cards, setCards] = useState<AppreciationCard[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Edit / Publish Modal
  const [selectedCard, setSelectedCard] = useState<AppreciationCard | null>(null);
  const [customMsg, setCustomMsg] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  useEffect(() => {
    loadAppreciations();
  }, []);

  const loadAppreciations = async () => {
    try {
      const list = await appreciationService.getAllAppreciations();
      setCards(list);
    } catch (e) {
      console.warn('Error fetching appreciations:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleOpenPublish = (card: AppreciationCard) => {
    setSelectedCard(card);
    setCustomMsg(card.message);
  };

  const handlePublish = async () => {
    if (!selectedCard) return;
    setIsPublishing(true);
    try {
      await appreciationService.publishAppreciation(selectedCard.id, customMsg);
      Alert.alert('Recognition Published!', 'Card is now live in the community appreciation sanga.');
      setSelectedCard(null);
      loadAppreciations();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not publish recognition.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Sadhana Appreciation"
        subtitle="Recognize Sincere Devotional Effort"
        showBack
        onBackPress={() => navigation.goBack()}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Fetching appreciation records...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadAppreciations(); }} />}
        >
          <View style={styles.banner}>
            <Ionicons name="sparkles" size={18} color={THEME.colors.goldDark} />
            <Text style={styles.bannerText}>
              Positive recognition inspires steady devotional practice. Recognition is focused on sincere effort,
              not competition or judging spiritual worth.
            </Text>
          </View>

          {cards.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="flower-outline" size={54} color={THEME.colors.gold} />
              <Text style={styles.emptyTitle}>No Appreciation Cards</Text>
              <Text style={styles.emptySubtitle}>
                As counselees complete steady chanting, reading, and morning programmes, milestone suggestions will appear here.
              </Text>
            </View>
          ) : (
            cards.map((card) => (
              <View key={card.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.categoryBadge}>
                    <Ionicons name="sparkles" size={12} color={THEME.colors.goldDark} />
                    <Text style={styles.categoryText}>{card.category}</Text>
                  </View>
                  <Text style={[styles.statusBadge, card.isPublished ? styles.published : styles.suggested]}>
                    {card.isPublished ? 'PUBLISHED' : 'SUGGESTED'}
                  </Text>
                </View>

                <Text style={styles.counseleeName}>{card.counseleeName}</Text>
                <Text style={styles.achievementText}>{card.achievement}</Text>
                <Text style={styles.messageText}>"{card.message}"</Text>

                <View style={styles.footerRow}>
                  <Text style={styles.periodText}>{card.period}</Text>

                  {!card.isPublished && (
                    <TouchableOpacity
                      style={styles.publishBtn}
                      onPress={() => handleOpenPublish(card)}
                    >
                      <Ionicons name="checkmark-done" size={14} color={THEME.colors.textInverse} />
                      <Text style={styles.publishBtnText}>Review & Publish</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Review & Publish Modal */}
      {selectedCard && (
        <Modal visible={!!selectedCard} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Review & Publish Recognition</Text>
                <TouchableOpacity onPress={() => setSelectedCard(null)}>
                  <Ionicons name="close" size={24} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalSub}>
                  Devotee: <Text style={styles.bold}>{selectedCard.counseleeName}</Text>
                </Text>
                <Text style={styles.modalSub}>
                  Category: <Text style={styles.bold}>{selectedCard.category}</Text>
                </Text>

                <Text style={styles.label}>Encouraging Message (Edit as needed):</Text>
                <TextInput
                  style={styles.textArea}
                  value={customMsg}
                  onChangeText={setCustomMsg}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handlePublish}
                  disabled={isPublishing}
                >
                  {isPublishing ? (
                    <ActivityIndicator color={THEME.colors.textInverse} />
                  ) : (
                    <Text style={styles.submitBtnText}>Publish to Community Sanga</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: THEME.spacing.sm,
    color: THEME.colors.textMuted,
  },
  scrollContent: {
    padding: THEME.spacing.base,
    paddingBottom: THEME.spacing.xxl,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceVariant,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.gold,
    marginBottom: THEME.spacing.base,
  },
  bannerText: {
    fontSize: 11,
    color: THEME.colors.primaryDark,
    marginLeft: 6,
    flex: 1,
    lineHeight: 16,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    marginBottom: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.goldLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.full,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginLeft: 4,
  },
  statusBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  published: {
    backgroundColor: THEME.colors.successLight,
    color: THEME.colors.success,
  },
  suggested: {
    backgroundColor: THEME.colors.warningLight,
    color: THEME.colors.warning,
  },
  counseleeName: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginTop: 2,
  },
  achievementText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.goldDark,
    fontWeight: '600',
    marginTop: 1,
    marginBottom: 6,
  },
  messageText: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.text,
    fontStyle: 'italic',
    lineHeight: 18,
    backgroundColor: THEME.colors.surfaceVariant,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  periodText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.md,
  },
  publishBtnText: {
    color: THEME.colors.textInverse,
    fontWeight: 'bold',
    fontSize: 11,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: THEME.spacing.xxl,
    marginTop: THEME.spacing.lg,
  },
  emptyTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginTop: THEME.spacing.sm,
  },
  emptySubtitle: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: THEME.spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: THEME.colors.background,
    borderTopLeftRadius: THEME.borderRadius.xl,
    borderTopRightRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.base,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  modalTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  modalBody: {
    paddingVertical: THEME.spacing.base,
  },
  modalSub: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textMuted,
    marginBottom: 4,
  },
  bold: {
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  label: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: 'bold',
    color: THEME.colors.textMuted,
    marginTop: THEME.spacing.sm,
    marginBottom: 4,
  },
  textArea: {
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.sm,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.text,
    height: 100,
    marginBottom: THEME.spacing.base,
  },
  submitBtn: {
    backgroundColor: THEME.colors.primary,
    height: 48,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spacing.xl,
  },
  submitBtnText: {
    color: THEME.colors.textInverse,
    fontWeight: 'bold',
    fontSize: THEME.typography.sizes.sm,
  },
});
