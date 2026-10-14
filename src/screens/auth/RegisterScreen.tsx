import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { calculateAge, calculateConnectionDuration } from '../../utils/dateUtils';
import { validateInvitationCode } from '../../services/invitationService';

export const RegisterScreen = ({ navigation }: any) => {
  const { register } = useAuth();

  const [invitationCode, setInvitationCode] = useState('');
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [codeValidated, setCodeValidated] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(''); // YYYY-MM-DD
  const [iskconConnectDate, setIskconConnectDate] = useState(''); // YYYY-MM-DD
  const [declaredRounds, setDeclaredRounds] = useState('16');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live dynamic calculations
  const dynamicAge = calculateAge(dateOfBirth);
  const dynamicConnection = calculateConnectionDuration(iskconConnectDate);

  const handleVerifyInvitation = async () => {
    if (!invitationCode.trim()) {
      Alert.alert('Missing Code', 'Please enter your invitation code.');
      return;
    }
    setIsValidatingCode(true);
    try {
      const res = await validateInvitationCode(invitationCode.trim());
      if (res.isValid) {
        setCodeValidated(true);
        Alert.alert('Code Verified', 'Invitation code is valid! Please complete your devotee profile.');
      } else {
        Alert.alert('Invalid Code', res.errorMessage || 'Invitation code is not valid.');
      }
    } finally {
      setIsValidatingCode(false);
    }
  };

  const handleRegister = async () => {
    if (!invitationCode.trim() || !displayName.trim() || !email.trim() || !password || !phoneNumber.trim()) {
      Alert.alert('Required Fields', 'Please fill in all required fields (Invitation Code, Name, Email, Password, Phone).');
      return;
    }

    const rounds = parseInt(declaredRounds, 10);
    if (isNaN(rounds) || rounds <= 0) {
      Alert.alert('Invalid Rounds', 'Please specify a valid daily round commitment (e.g. 16).');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        invitationCode: invitationCode.trim(),
        displayName: displayName.trim(),
        email: email.trim(),
        password,
        phoneNumber: phoneNumber.trim(),
        dateOfBirth: dateOfBirth.trim() || undefined,
        iskconConnectDate: iskconConnectDate.trim() || undefined,
        declaredRounds: rounds,
      });

      Alert.alert(
        'Registration Submitted',
        'Hare Krishna! Your registration has been submitted and is awaiting counsellor approval.'
      );
    } catch (err: any) {
      Alert.alert('Registration Error', err.message || 'Could not complete registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={THEME.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Devotee Registration</Text>
        </View>

        {/* Step 1: Invitation Code */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Step 1: Invitation Code</Text>
          <Text style={styles.helperText}>
            Enter the 8-character invitation code provided by your counsellor.
          </Text>

          <View style={styles.invitationRow}>
            <TextInput
              style={[styles.textInput, styles.invitationInput]}
              placeholder="e.g. KRISHNA7"
              value={invitationCode}
              onChangeText={(val) => {
                setInvitationCode(val.toUpperCase());
                setCodeValidated(false);
              }}
              autoCapitalize="characters"
              maxLength={12}
            />
            <TouchableOpacity
              style={[styles.verifyButton, codeValidated && styles.verifyButtonSuccess]}
              onPress={handleVerifyInvitation}
              disabled={isValidatingCode}
            >
              {isValidatingCode ? (
                <ActivityIndicator size="small" color={THEME.colors.textInverse} />
              ) : (
                <Text style={styles.verifyButtonText}>
                  {codeValidated ? 'Verified ✓' : 'Verify'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Step 2: Devotee Profile Details */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Step 2: Profile & Credentials</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Legal or Devotional Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Ramesh Kumar / Radharani Dasi"
              value={displayName}
              onChangeText={setDisplayName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mobile Phone Number *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. +91 98765 43210"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="devotee@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Create a secure password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Date of Birth (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="1995-08-25"
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
            />
            {dateOfBirth.length === 10 && (
              <Text style={styles.dynamicCalculationText}>
                Calculated Age: {dynamicAge} years
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Date Connected with ISKCON (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="2018-05-10"
              value={iskconConnectDate}
              onChangeText={setIskconConnectDate}
            />
            {iskconConnectDate.length === 10 && (
              <Text style={styles.dynamicCalculationText}>
                Connected Duration: {dynamicConnection.text}
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Declared Daily Chanting Rounds Commitment *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="16"
              value={declaredRounds}
              onChangeText={setDeclaredRounds}
              keyboardType="number-pad"
            />
            <Text style={styles.helperText}>
              Daily marks require completing this exact commitment.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleRegister}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={THEME.colors.textInverse} />
            ) : (
              <Text style={styles.submitButtonText}>Submit for Counsellor Approval</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.base,
  },
  backBtn: {
    padding: 6,
    marginRight: THEME.spacing.sm,
  },
  headerTitle: {
    fontSize: THEME.typography.sizes.xl,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    marginBottom: THEME.spacing.base,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  cardSectionTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.primary,
    marginBottom: 4,
  },
  helperText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    marginBottom: THEME.spacing.sm,
  },
  invitationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invitationInput: {
    flex: 1,
    marginRight: THEME.spacing.sm,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  verifyButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.base,
    height: 48,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonSuccess: {
    backgroundColor: THEME.colors.success,
  },
  verifyButtonText: {
    color: THEME.colors.textInverse,
    fontWeight: 'bold',
    fontSize: THEME.typography.sizes.sm,
  },
  inputGroup: {
    marginBottom: THEME.spacing.md,
  },
  inputLabel: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: 'bold',
    color: THEME.colors.textMuted,
    marginBottom: 4,
  },
  textInput: {
    height: 48,
    backgroundColor: THEME.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: THEME.spacing.base,
    fontSize: THEME.typography.sizes.base,
    color: THEME.colors.text,
  },
  dynamicCalculationText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.goldDark,
    fontWeight: 'bold',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: THEME.colors.primary,
    height: 50,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: THEME.spacing.md,
    ...THEME.shadows.soft,
  },
  submitButtonText: {
    color: THEME.colors.textInverse,
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
  },
});
