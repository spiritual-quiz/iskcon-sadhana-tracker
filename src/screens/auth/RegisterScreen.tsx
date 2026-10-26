import React, { useState, useRef, useEffect } from 'react';
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
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import {
  calculateAge,
  calculateConnectionDuration,
  formatDateToDevoteeFormat,
} from '../../utils/dateUtils';
import { validateInvitationCode } from '../../services/invitationService';
import { DateSelectorModal } from '../../components/DateSelectorModal';

export const RegisterScreen = ({ navigation }: any) => {
  const { register } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  // Invitation Code
  const [invitationCode, setInvitationCode] = useState('');
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [codeValidated, setCodeValidated] = useState(false);

  // Profile details
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [declaredRounds, setDeclaredRounds] = useState('16');

  // Scrolling Date Picker States
  const [dateOfBirthDisplay, setDateOfBirthDisplay] = useState(''); // e.g. 10-May-1988
  const [dateOfBirthIso, setDateOfBirthIso] = useState(''); // e.g. 1988-05-10
  const [showDobPicker, setShowDobPicker] = useState(false);

  const [iskconConnectDisplay, setIskconConnectDisplay] = useState(''); // e.g. 15-Jan-2018
  const [iskconConnectIso, setIskconConnectIso] = useState(''); // e.g. 2018-01-15
  const [showConnectPicker, setShowConnectPicker] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keyboard avoidance and auto-scroll tracking
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const fieldPositions = useRef<{ [key: string]: number }>({});

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleFieldLayout = (key: string, y: number) => {
    fieldPositions.current[key] = y;
  };

  const handleFieldFocus = (key: string) => {
    const y = fieldPositions.current[key];
    if (y !== undefined && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, y - 40),
          animated: true,
        });
      }, 120);
    }
  };

  // Live dynamic calculations
  const dynamicAge = calculateAge(dateOfBirthDisplay || dateOfBirthIso);
  const dynamicConnection = calculateConnectionDuration(iskconConnectDisplay || iskconConnectIso);

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
        dateOfBirth: dateOfBirthIso || undefined,
        iskconConnectDate: iskconConnectIso || undefined,
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
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 36 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        {/* Header with Official Logo */}
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
        <View
          style={styles.card}
          onLayout={(e) => handleFieldLayout('invitationCard', e.nativeEvent.layout.y)}
        >
          <Text style={styles.cardSectionTitle}>Step 1: Counsellor Invitation Code</Text>
          <Text style={styles.helperText}>
            Enter the invitation code (e.g. KRISHNA7 or SADHANA16) provided by your counsellor.
          </Text>

          <View style={styles.invitationRow}>
            <TextInput
              style={[styles.textInput, styles.invitationInput]}
              placeholder="xxxxxxx"
              value={invitationCode}
              onChangeText={(val) => {
                setInvitationCode(val.toUpperCase());
                setCodeValidated(false);
              }}
              onFocus={() => handleFieldFocus('invitationCard')}
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

          {/* Name */}
          <View
            style={styles.inputGroup}
            onLayout={(e) => handleFieldLayout('name', e.nativeEvent.layout.y)}
          >
            <Text style={styles.inputLabel}>Initiated / Devotional Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder=""
              value={displayName}
              onChangeText={setDisplayName}
              onFocus={() => handleFieldFocus('name')}
            />
          </View>

          {/* Email */}
          <View
            style={styles.inputGroup}
            onLayout={(e) => handleFieldLayout('email', e.nativeEvent.layout.y)}
          >
            <Text style={styles.inputLabel}>Email Address *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="devotee@iskcon.org"
              value={email}
              onChangeText={setEmail}
              onFocus={() => handleFieldFocus('email')}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password */}
          <View
            style={styles.inputGroup}
            onLayout={(e) => handleFieldLayout('password', e.nativeEvent.layout.y)}
          >
            <Text style={styles.inputLabel}>Create Password *</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                onFocus={() => handleFieldFocus('password')}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={THEME.colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* WhatsApp / Phone */}
          <View
            style={styles.inputGroup}
            onLayout={(e) => handleFieldLayout('phone', e.nativeEvent.layout.y)}
          >
            <Text style={styles.inputLabel}>WhatsApp / Mobile Number *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="+919876543210"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              onFocus={() => handleFieldFocus('phone')}
              keyboardType="phone-pad"
            />
          </View>

          {/* Daily Rounds */}
          <View
            style={styles.inputGroup}
            onLayout={(e) => handleFieldLayout('rounds', e.nativeEvent.layout.y)}
          >
            <Text style={styles.inputLabel}>Daily Japa Commitment (Rounds) *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="16"
              value={declaredRounds}
              onChangeText={setDeclaredRounds}
              onFocus={() => handleFieldFocus('rounds')}
              keyboardType="numeric"
            />
          </View>

          {/* Date of Birth Scrolling Selector */}
          <View
            style={styles.inputGroup}
            onLayout={(e) => handleFieldLayout('dob', e.nativeEvent.layout.y)}
          >
            <Text style={styles.inputLabel}>Date of Birth (Day-Month-Year)</Text>
            <TouchableOpacity
              style={styles.dateSelectorCard}
              onPress={() => {
                Keyboard.dismiss();
                setShowDobPicker(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.dateSelectorContent}>
                <Ionicons name="calendar" size={18} color={THEME.colors.primary} />
                <Text
                  style={[
                    styles.dateSelectorText,
                    !dateOfBirthDisplay && styles.dateSelectorPlaceholder,
                  ]}
                >
                  {dateOfBirthDisplay ? dateOfBirthDisplay : 'Scroll & Select (e.g. 10-June-2000)'}
                </Text>
              </View>
              <View style={styles.dateBadge}>
                <Text style={styles.dateBadgeText}>Choose Date</Text>
                <Ionicons name="chevron-forward" size={14} color={THEME.colors.goldDark} />
              </View>
            </TouchableOpacity>
            {dynamicAge !== null && dynamicAge > 0 && (
              <View style={styles.calculationBadge}>
                <Ionicons name="sparkles" size={12} color={THEME.colors.goldDark} />
                <Text style={styles.dynamicCalculationText}>Current Age: {dynamicAge} years</Text>
              </View>
            )}
          </View>

          {/* Date of Association with ISKCON Scrolling Selector */}
          <View
            style={styles.inputGroup}
            onLayout={(e) => handleFieldLayout('association', e.nativeEvent.layout.y)}
          >
            <Text style={styles.inputLabel}>Date of Association with ISKCON</Text>
            <TouchableOpacity
              style={styles.dateSelectorCard}
              onPress={() => {
                Keyboard.dismiss();
                setShowConnectPicker(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.dateSelectorContent}>
                <Ionicons name="heart" size={18} color={THEME.colors.goldDark} />
                <Text
                  style={[
                    styles.dateSelectorText,
                    !iskconConnectDisplay && styles.dateSelectorPlaceholder,
                  ]}
                >
                  {iskconConnectDisplay
                    ? iskconConnectDisplay
                    : 'Scroll & Select (e.g. 10-June-2000)'}
                </Text>
              </View>
              <View style={styles.dateBadge}>
                <Text style={styles.dateBadgeText}>Choose Date</Text>
                <Ionicons name="chevron-forward" size={14} color={THEME.colors.goldDark} />
              </View>
            </TouchableOpacity>
            {dynamicConnection && dynamicConnection.years + dynamicConnection.months > 0 && (
              <View style={styles.calculationBadge}>
                <Ionicons name="sparkles" size={12} color={THEME.colors.goldDark} />
                <Text style={styles.dynamicCalculationText}>
                  Devotional Association: {dynamicConnection.text}
                </Text>
              </View>
            )}
          </View>

          {/* Submit Button */}
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

      {/* Date of Birth Picker Modal */}
      <DateSelectorModal
        visible={showDobPicker}
        title="Select Date of Birth"
        subtitle="Scroll Date, Month & Year (e.g. 10-May-1988)"
        initialDate={dateOfBirthIso || dateOfBirthDisplay || '1990-05-10'}
        minYear={1930}
        maxYear={new Date().getFullYear()}
        mode="birth"
        onSelectDate={(displayStr, isoStr) => {
          setDateOfBirthDisplay(displayStr);
          setDateOfBirthIso(isoStr);
        }}
        onClose={() => setShowDobPicker(false)}
      />

      {/* Date of Association with ISKCON Picker Modal */}
      <DateSelectorModal
        visible={showConnectPicker}
        title="Date of Association with ISKCON"
        subtitle="Scroll Date, Month & Year (e.g. 15-Jan-2018)"
        initialDate={iskconConnectIso || iskconConnectDisplay || '2018-01-15'}
        minYear={1966}
        maxYear={new Date().getFullYear()}
        mode="association"
        onSelectDate={(displayStr, isoStr) => {
          setIskconConnectDisplay(displayStr);
          setIskconConnectIso(isoStr);
        }}
        onClose={() => setShowConnectPicker(false)}
      />
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
    paddingBottom: 36,
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
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
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
  passwordWrapper: {
    height: 40,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    height: 40,
    fontSize: 13,
    color: THEME.colors.text,
  },
  eyeIcon: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateSelectorCard: {
    height: 44,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dateSelectorText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: THEME.colors.primary,
  },
  dateSelectorPlaceholder: {
    fontSize: 12,
    fontWeight: 'normal',
    color: THEME.colors.textMuted,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 2,
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.goldDark,
  },
  calculationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dynamicCalculationText: {
    fontSize: 11,
    color: THEME.colors.goldDark,
    fontWeight: 'bold',
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
