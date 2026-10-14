import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { QRCodeDisplay } from '../../components/QRCodeDisplay';
import { useAuth } from '../../context/AuthContext';
import {
  createInvitationCode,
  getAllInvitations,
  revokeInvitationCode,
} from '../../services/invitationService';
import { InvitationCode } from '../../types/monitoring';

export const InvitationsScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<InvitationCode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedInv, setSelectedInv] = useState<InvitationCode | null>(null);

  // New invitation form state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [maxUses, setMaxUses] = useState<string>('50');
  const [expiryDays, setExpiryDays] = useState<string>('30');
  const [notes, setNotes] = useState<string>('Bhakti Vriksha Sanga');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      const list = await getAllInvitations();
      setInvitations(list);
    } catch (e) {
      console.warn('Error loading invitations:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!user?.uid) return;
    setIsCreating(true);
    try {
      const newInv = await createInvitationCode({
        adminUid: user.uid,
        maxUses: parseInt(maxUses, 10) || 50,
        expiryDays: parseInt(expiryDays, 10) || 30,
        notes: notes.trim(),
      });
      setShowCreateModal(false);
      setSelectedInv(newInv);
      loadInvitations();
      Alert.alert('Invitation Generated!', `Code: ${newInv.code}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not create invitation.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (code: string) => {
    Alert.alert(
      'Revoke Code?',
      `Are you sure you want to revoke code "${code}"? Devotees will no longer be able to register with it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await revokeInvitationCode(code);
              Alert.alert('Revoked', `Code ${code} is now revoked.`);
              loadInvitations();
              if (selectedInv?.code === code) setSelectedInv(null);
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Invitations & QR Codes"
        subtitle="Generate & Share Access for Devotees"
        showBack
        onBackPress={() => navigation.goBack()}
        rightAction={{
          iconName: 'add-circle-outline',
          onPress: () => setShowCreateModal(true),
        }}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Loading invitations...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Active / Selected QR Code View */}
          {selectedInv && (
            <View>
              <QRCodeDisplay
                code={selectedInv.code}
                notes={selectedInv.notes}
                expiresAt={selectedInv.expiresAt}
                maxUses={selectedInv.maxUses}
                usedCount={selectedInv.usedCount}
              />
              <TouchableOpacity
                style={styles.closePreviewBtn}
                onPress={() => setSelectedInv(null)}
              >
                <Text style={styles.closePreviewText}>Hide QR Preview</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Create Button Banner */}
          <TouchableOpacity
            style={styles.createBanner}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="qr-code" size={24} color={THEME.colors.textInverse} />
            <View style={styles.createBannerText}>
              <Text style={styles.createBannerTitle}>Generate New Invitation Code</Text>
              <Text style={styles.createBannerSubtitle}>Set usage limits, expiry, and notes</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={THEME.colors.textInverse} />
          </TouchableOpacity>

          {/* Past Invitations List */}
          <Text style={styles.sectionHeaderTitle}>Issued Invitation Codes</Text>

          {invitations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No invitation codes generated yet.</Text>
            </View>
          ) : (
            invitations.map((inv) => (
              <View key={inv.code} style={styles.invCard}>
                <View style={styles.invCardHeader}>
                  <View style={styles.codeBadge}>
                    <Text style={styles.codeText}>{inv.code}</Text>
                  </View>
                  <View style={styles.statusRow}>
                    {inv.isRevoked ? (
                      <Text style={styles.revokedBadge}>REVOKED</Text>
                    ) : (
                      <Text style={styles.activeBadge}>ACTIVE</Text>
                    )}
                  </View>
                </View>

                {inv.notes ? <Text style={styles.notesText}>{inv.notes}</Text> : null}

                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    Used: {inv.usedCount} / {inv.maxUses} devotees
                  </Text>
                  <Text style={styles.metaText}>
                    Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.showQrBtn}
                    onPress={() => setSelectedInv(inv)}
                  >
                    <Ionicons name="eye-outline" size={16} color={THEME.colors.primary} />
                    <Text style={styles.showQrBtnText}>Show QR</Text>
                  </TouchableOpacity>

                  {!inv.isRevoked && (
                    <TouchableOpacity
                      style={styles.revokeBtn}
                      onPress={() => handleRevoke(inv.code)}
                    >
                      <Ionicons name="trash-outline" size={16} color={THEME.colors.danger} />
                      <Text style={styles.revokeBtnText}>Revoke</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Modal for Creating Invitation */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Generate Devotee Invitation</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Purpose / Group Note</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Youth Sanga / New Bhaktas"
                value={notes}
                onChangeText={setNotes}
              />

              <Text style={styles.inputLabel}>Maximum Uses</Text>
              <TextInput
                style={styles.textInput}
                placeholder="50"
                value={maxUses}
                onChangeText={setMaxUses}
                keyboardType="number-pad"
              />

              <Text style={styles.inputLabel}>Validity Duration (Days)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="30"
                value={expiryDays}
                onChangeText={setExpiryDays}
                keyboardType="number-pad"
              />

              <TouchableOpacity
                style={styles.submitModalBtn}
                onPress={handleCreate}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color={THEME.colors.textInverse} />
                ) : (
                  <Text style={styles.submitModalBtnText}>Generate Invitation & QR Code</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  closePreviewBtn: {
    alignSelf: 'center',
    marginBottom: THEME.spacing.base,
  },
  closePreviewText: {
    color: THEME.colors.primary,
    fontWeight: 'bold',
    fontSize: THEME.typography.sizes.sm,
    textDecorationLine: 'underline',
  },
  createBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    marginBottom: THEME.spacing.base,
    ...THEME.shadows.medium,
  },
  createBannerText: {
    flex: 1,
    marginLeft: THEME.spacing.md,
  },
  createBannerTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.textInverse,
  },
  createBannerSubtitle: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.goldLight,
    marginTop: 2,
  },
  sectionHeaderTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginBottom: THEME.spacing.sm,
  },
  invCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    marginBottom: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  invCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  codeBadge: {
    backgroundColor: THEME.colors.surfaceVariant,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  codeText: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: THEME.colors.primaryDark,
  },
  statusRow: {
    flexDirection: 'row',
  },
  activeBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: THEME.colors.success,
    backgroundColor: THEME.colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  revokedBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: THEME.colors.danger,
    backgroundColor: THEME.colors.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  notesText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.text,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceVariant,
  },
  metaText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceVariant,
  },
  showQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: THEME.colors.surfaceVariant,
    marginRight: 8,
  },
  showQrBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.colors.primary,
    marginLeft: 4,
  },
  revokeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: THEME.colors.dangerLight,
  },
  revokeBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.colors.danger,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: THEME.spacing.xl,
  },
  emptyText: {
    color: THEME.colors.textMuted,
    fontSize: THEME.typography.sizes.sm,
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
    fontSize: THEME.typography.sizes.lg,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  modalBody: {
    paddingVertical: THEME.spacing.base,
  },
  inputLabel: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: 'bold',
    color: THEME.colors.textMuted,
    marginBottom: 4,
    marginTop: 8,
  },
  textInput: {
    height: 48,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: THEME.spacing.md,
    fontSize: THEME.typography.sizes.base,
    color: THEME.colors.text,
  },
  submitModalBtn: {
    backgroundColor: THEME.colors.primary,
    height: 50,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: THEME.spacing.lg,
    marginBottom: THEME.spacing.xl,
  },
  submitModalBtnText: {
    color: THEME.colors.textInverse,
    fontWeight: 'bold',
    fontSize: THEME.typography.sizes.base,
  },
});
