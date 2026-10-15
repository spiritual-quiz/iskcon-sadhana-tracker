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
  Image,
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
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim(),
        invitationCode: invitationCode.trim(),
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
            <Ionicons name="arrow-back" size={20} color={THEME.colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerBrandRow}>
            <Image source={require('../../../assets/logo.png')} style={styles.miniLogo} />
            <View>
              <Text style={styles.headerTitle}>Bhakti Unnati</Text>
              <Text style={styles.headerSubtitle}>Advancement in Devotion</Text>
            </View>
          </View>
        </View>

        {/* Step 1: Invitation Code */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Step 1: Counsellor Invitation Code</Text>
          <Text style={styles.helperText}>
            Enter the invitation code (e.g. KRISHNA7 or SADHANA16) provided by your counsellor.
          </Text>

          <View style={styles.invitationRow}>
            <TextInput
              style={[styles.textInput, styles.invitationInput]}
              placeholder="KRISHNA7"
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
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.verifyButtonText}>
                  {codeValidated ? 'Verified ✓' : 'Verify'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Step 2: Personal & Spiritual Profile */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Step 2: Devotee Profile Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Initiated / Devotional Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Ramesh Das"
              value={displayName}
              onChangeText={setDisplayName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="devotee@iskcon.org"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Create Password *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>WhatsApp / Mobile Number *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="+919876543210"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Daily Japa Commitment (Rounds) *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="16"
              value={declaredRounds}
              onChangeText={setDeclaredRounds}
              keyboardType="numeric"
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
            {dynamicAge !== null && (
              <Text style={styles.dynamicCalculationText}>Age: {dynamicAge} years</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Date of Association with ISKCON (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="2020-01-15"
              value={iskconConnectDate}
              onChangeText={setIskconConnectDate}
            />
            {dynamicConnection && (
              <Text style={styles.dynamicCalculationText}>
                Devotional Association: {dynamicConnection.text}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleRegister}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
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
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.primary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: THEME.colors.goldDark,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardSectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginBottom: 4,
  },
  helperText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginBottom: 8,
  },
  invitationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invitationInput: {
    flex: 1,
    marginRight: 8,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  verifyButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonSuccess: {
    backgroundColor: THEME.colors.success,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: 3,
  },
  textInput: {
    height: 40,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    color: THEME.colors.text,
  },
  dynamicCalculationText: {
    fontSize: 11,
    color: THEME.colors.goldDark,
    fontWeight: 'bold',
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: THEME.colors.primary,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
