import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { THEME } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { Header } from '../../components/Header';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { calculateAge, calculateConnectionDuration } from '../../utils/dateUtils';
import { authService } from '../../services/authService';
import { validateInvitationCode } from '../../services/invitationService';
import { biometricService } from '../../services/biometricService';
import { BiometricEnrollModal } from '../../components/BiometricEnrollModal';

export const ProfileScreen = () => {
  const { user, reloadUser, signOut } = useAuth();
  const { theme, openThemePicker } = useTheme();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [declaredRounds, setDeclaredRounds] = useState(String(user?.declaredRounds || 16));
  const [photoUrl, setPhotoUrl] = useState<string | null>(user?.photoURL || null);
  const [invitationName, setInvitationName] = useState<string>(user?.invitationName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isBiometricEnrolled, setIsBiometricEnrolled] = useState<boolean>(false);
  const [hasBiometricHw, setHasBiometricHw] = useState<boolean>(true);
  const [showBioEnrollModal, setShowBioEnrollModal] = useState<boolean>(false);

  useEffect(() => {
    const checkBio = async () => {
      if (user?.email) {
        const enrolled = await biometricService.isUserEnrolled(user.email);
        setIsBiometricEnrolled(enrolled);
      }
    };
    checkBio();
  }, [user?.email]);

  const handleTestSensor = async () => {
    if (!user?.email) return;
    try {
      const acc = await biometricService.authenticateWithFingerprint(user.email);
      if (acc) {
        Alert.alert(
          'Touch Sensor Verified',
          `Hare Krishna! Touch sensor authenticated successfully for ${user.displayName || user.email}.`
        );
      }
    } catch (e: any) {
      Alert.alert('Touch Sensor Test', e.message || 'Sensor test was cancelled.');
    }
  };

  const handleRemoveBiometric = async () => {
    if (!user?.email) return;
    Alert.alert(
      'Disable Fingerprint',
      `Are you sure you want to disable fingerprint sign-in for ${user.displayName || user.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            await biometricService.removeUserBiometric(user.email);
            setIsBiometricEnrolled(false);
            Alert.alert('Fingerprint Disabled', 'Fingerprint sign-in has been disabled for this account.');
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setPhoneNumber(user.phoneNumber || '');
      setDeclaredRounds(String(user.declaredRounds || 16));
      setPhotoUrl(user.photoURL || null);

      if (user.invitationName) {
        setInvitationName(user.invitationName);
      } else if (user.invitationCode) {
        validateInvitationCode(user.invitationCode).then((res) => {
          if (res.invitation?.notes) {
            setInvitationName(res.invitation.notes);
          } else if (user.invitationCode === 'KRISHNA7') {
            setInvitationName('General Devotee Registration');
          } else if (user.invitationCode === 'SADHANA16') {
            setInvitationName('16 Rounds Devotee Group');
          } else {
            setInvitationName(user.invitationCode || 'General Devotee Registration');
          }
        });
      } else {
        setInvitationName('General Devotee Registration');
      }
    }
  }, [user]);

  // Dynamic calculations
  const dynamicAge = calculateAge(user?.dateOfBirth);
  const dynamicConnection = calculateConnectionDuration(user?.iskconConnectDate);

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Needed', 'Please allow gallery access to select your devotee profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        setPhotoUrl(selectedUri);
        if (user?.uid) {
          await authService.updatePermittedProfile(user.uid, {
            photoURL: selectedUri,
          });
          await reloadUser();
          Alert.alert('Photo Updated', 'Your profile photo has been updated successfully!');
        }
      }
    } catch (e: any) {
      Alert.alert('Photo Error', e.message || 'Could not select photo.');
    }
  };

  const handleSavePermitted = async () => {
    if (!user?.uid) return;
    setIsSaving(true);
    try {
      const rounds = parseInt(declaredRounds, 10) || 16;
      const targetChanged = rounds !== (user.declaredRounds || 16);

      await authService.updatePermittedProfile(user.uid, {
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim(),
        photoURL: photoUrl || undefined,
      });

      if (targetChanged) {
        await authService.requestTargetRoundsChange(user.uid, rounds);
        await reloadUser();
        Alert.alert(
          'Target Change Requested',
          `Profile details saved. Your request to change chanting target to ${rounds} rounds has been submitted for counsellor approval.`
        );
      } else {
        await reloadUser();
        Alert.alert('Profile Updated', 'Your profile details have been saved successfully.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Devotee Profile" subtitle="Account & Spiritual Practice Profile" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileHeaderCard}>
          <TouchableOpacity style={styles.avatarTouchable} onPress={handlePickImage} activeOpacity={0.8}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={40} color={THEME.colors.gold} />
              </View>
            )}
            <View style={styles.cameraIconBadge}>
              <Ionicons name="camera" size={13} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePickImage} style={styles.addPhotoLink}>
            <Text style={styles.addPhotoText}>{photoUrl ? 'Change Photo' : 'Add Photo'}</Text>
          </TouchableOpacity>

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
            <Text style={styles.infoLabel}>Invitation Name:</Text>
            <Text style={styles.infoValueGold}>{invitationName || 'General Devotee Registration'}</Text>
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
            <Text style={styles.fieldHint}>
              Changes require counsellor approval before taking effect.
            </Text>
            {user?.targetRoundsRequested && (
              <View style={styles.pendingBadge}>
                <Ionicons name="hourglass" size={13} color="#B45309" />
                <Text style={styles.pendingBadgeText}>
                  Pending: {user.targetRoundsRequested} Rounds (Awaiting Counsellor Approval)
                </Text>
              </View>
            )}
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

        {/* Theme & Customization */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Appearance & Theme</Text>
          <TouchableOpacity
            style={[styles.themeRow, { borderColor: theme.colors.border }]}
            onPress={openThemePicker}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.themeCircle, { backgroundColor: theme.thickColor }]} />
              <View>
                <Text style={styles.themeNameText}>{theme.name}</Text>
                <Text style={styles.themeSubText}>Tap to choose a different background palette</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Biometric Touch Sensor Setting */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Touch Sensor / Fingerprint Sign-In</Text>
          <View style={styles.biometricRow}>
            <View
              style={[
                styles.bioIconBox,
                { backgroundColor: isBiometricEnrolled ? '#DCFCE7' : theme.liteColor },
              ]}
            >
              <Ionicons
                name="finger-print"
                size={28}
                color={isBiometricEnrolled ? '#16A34A' : theme.thickColor}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.biometricStatusTitle}>
                  {isBiometricEnrolled ? 'Fingerprint Active' : 'Not Linked Yet'}
                </Text>
                <View
                  style={[
                    styles.bioStatusPill,
                    { backgroundColor: isBiometricEnrolled ? '#DCFCE7' : '#F3F4F6' },
                  ]}
                >
                  <Text
                    style={[
                      styles.bioStatusPillText,
                      { color: isBiometricEnrolled ? '#15803D' : '#6B7280' },
                    ]}
                  >
                    {isBiometricEnrolled ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>
              </View>
              <Text style={styles.biometricStatusDesc}>
                {isBiometricEnrolled
                  ? `Fingerprint login linked for ${user?.displayName || 'this account'}`
                  : 'Link your phone touch sensor to sign in instantly next time without password'}
              </Text>
            </View>
          </View>

          {isBiometricEnrolled ? (
            <View style={styles.bioActionRow}>
              <TouchableOpacity
                style={[styles.bioTestBtn, { borderColor: theme.thickColor }]}
                onPress={handleTestSensor}
                activeOpacity={0.7}
              >
                <Ionicons name="finger-print" size={16} color={theme.thickColor} />
                <Text style={[styles.bioTestBtnText, { color: theme.thickColor }]}>Test Sensor</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.removeBioBtn}
                onPress={handleRemoveBiometric}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={15} color="#DC2626" />
                <Text style={styles.removeBioText}>Disable</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.enableBioBtn, { backgroundColor: theme.thickColor }]}
              onPress={() => setShowBioEnrollModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="finger-print" size={18} color="#FFFFFF" />
              <Text style={styles.enableBioBtnText}>Register Fingerprint for this Account</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Global Modal for Fingerprint Registration */}
        <BiometricEnrollModal
          visible={showBioEnrollModal}
          user={user}
          onClose={() => setShowBioEnrollModal(false)}
          onSuccess={() => setIsBiometricEnrolled(true)}
        />

        {/* Sign Out - Thick Orange Colour */}
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.85}>
          <Ionicons name="log-out" size={20} color="#FFFFFF" />
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
  avatarTouchable: {
    position: 'relative',
    marginBottom: 4,
  },
  avatarCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: THEME.colors.gold,
  },
  avatarImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: THEME.colors.gold,
    backgroundColor: THEME.colors.surfaceVariant,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#EA580C',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  addPhotoLink: {
    marginBottom: THEME.spacing.sm,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  addPhotoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EA580C',
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
    paddingVertical: 15,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: '#EA580C', // Thick rich orange
    elevation: 3,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    marginTop: THEME.spacing.md,
  },
  signOutBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: THEME.typography.sizes.base,
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  fieldHint: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 6,
  },
  pendingBadgeText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#F9FAFB',
  },
  themeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  themeNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  themeSubText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  biometricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  biometricStatusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  biometricStatusDesc: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 15,
  },
  removeBioBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  removeBioText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 12,
  },
  bioIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  bioStatusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bioActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  bioTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  bioTestBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  enableBioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 12,
    elevation: 2,
  },
  enableBioBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
