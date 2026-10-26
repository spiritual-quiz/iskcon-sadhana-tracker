import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { calculateAge, calculateConnectionDuration } from '../../utils/dateUtils';
import { authService } from '../../services/authService';

export const ProfileScreen = () => {
  const { user, reloadUser, signOut } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [declaredRounds, setDeclaredRounds] = useState(String(user?.declaredRounds || 16));
  const [consent, setConsent] = useState(user?.publicAppreciationConsent ?? true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setPhoneNumber(user.phoneNumber || '');
      setDeclaredRounds(String(user.declaredRounds || 16));
      setConsent(user.publicAppreciationConsent ?? true);
    }
  }, [user]);

  // Dynamic calculations
  const dynamicAge = calculateAge(user?.dateOfBirth);
  const dynamicConnection = calculateConnectionDuration(user?.iskconConnectDate);

  const handleSavePermitted = async () => {
    if (!user?.uid) return;
    setIsSaving(true);
    try {
      const rounds = parseInt(declaredRounds, 10) || 16;
      await authService.updatePermittedProfile(user.uid, {
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim(),
        publicAppreciationConsent: consent,
        declaredRounds: rounds,
      });
      await reloadUser();
      Alert.alert('Profile Updated', 'Your profile details and chanting commitment have been saved.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Devotee Profile" subtitle="Account & Spiritual Practice Profile" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={40} color={THEME.colors.gold} />
          </View>
          <Text style={styles.profileName}>{user?.displayName}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={styles.badgeRow}>
            <StatusBadge type="status" value={user?.status || 'pending'} />
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {user?.role === 'counsellor' ? 'Counsellor' : 'Counselee'}
              </Text>
            </View>
          </View>
        </View>

        {/* Dynamic Spiritual Milestones */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Spiritual Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Daily Chanting Commitment:</Text>
            <Text style={styles.infoValueHighlight}>{user?.declaredRounds || 16} Rounds</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ISKCON Association Started:</Text>
            <Text style={styles.infoValue}>{user?.iskconConnectDate || 'Not specified'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Connection Duration:</Text>
            <Text style={styles.infoValueGold}>{dynamicConnection.text}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date of Birth:</Text>
            <Text style={styles.infoValue}>{user?.dateOfBirth || 'Not specified'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Age:</Text>
            <Text style={styles.infoValueGold}>{dynamicAge > 0 ? `${dynamicAge} years` : 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Invitation Code Used:</Text>
            <Text style={styles.infoValue}>{user?.invitationCode || 'N/A'}</Text>
          </View>

          <Text style={styles.protectedNotice}>
            * Birth dates and ISKCON association dates are verified during registration and can be adjusted with counsellor consultation.
          </Text>
        </View>

        {/* Editable Fields */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Editable Contact Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Daily Chanting Commitment (Rounds)</Text>
            <TextInput
              style={styles.input}
              value={declaredRounds}
              onChangeText={setDeclaredRounds}
              keyboardType="numeric"
              placeholder="16"
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchLabel}>Community Appreciation Consent</Text>
              <Text style={styles.switchSubLabel}>
                Allow counsellor to feature your steady milestones in the community appreciation sanga.
              </Text>
            </View>
            <Switch
              value={consent}
              onValueChange={setConsent}
              trackColor={{ false: THEME.colors.border, true: THEME.colors.primary }}
              thumbColor={THEME.colors.gold}
            />
          </View>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSavePermitted}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={THEME.colors.textInverse} />
            ) : (
              <Text style={styles.saveBtnText}>Save Profile Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Ionicons name="log-out-outline" size={20} color={THEME.colors.danger} />
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    padding: THEME.spacing.base,
    paddingBottom: THEME.spacing.xxl,
  },
  profileHeaderCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    alignItems: 'center',
    marginBottom: THEME.spacing.base,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.colors.gold,
    marginBottom: THEME.spacing.sm,
  },
  profileName: {
    fontSize: THEME.typography.sizes.xl,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  profileEmail: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    marginTop: 2,
    marginBottom: THEME.spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleBadge: {
    backgroundColor: THEME.colors.goldLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
    marginLeft: 8,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    marginBottom: THEME.spacing.base,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  cardTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginBottom: THEME.spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceVariant,
  },
  infoLabel: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
  },
  infoValue: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.text,
    fontWeight: '500',
  },
  infoValueHighlight: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.primary,
    fontWeight: 'bold',
  },
  infoValueGold: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.goldDark,
    fontWeight: 'bold',
  },
  protectedNotice: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 8,
    fontStyle: 'italic',
  },
  inputGroup: {
    marginBottom: THEME.spacing.sm,
  },
  label: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: 'bold',
    color: THEME.colors.textMuted,
    marginBottom: 4,
  },
  input: {
    height: 46,
    backgroundColor: THEME.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: THEME.spacing.md,
    fontSize: THEME.typography.sizes.base,
    color: THEME.colors.text,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: THEME.spacing.sm,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceVariant,
  },
  switchTextContainer: {
    flex: 1,
    marginRight: THEME.spacing.md,
  },
  switchLabel: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  switchSubLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: THEME.colors.primary,
    height: 48,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: THEME.spacing.sm,
  },
  saveBtnText: {
    color: THEME.colors.textInverse,
    fontWeight: 'bold',
    fontSize: THEME.typography.sizes.sm,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  signOutBtnText: {
    color: THEME.colors.danger,
    fontWeight: 'bold',
    fontSize: THEME.typography.sizes.sm,
    marginLeft: 6,
  },
});
