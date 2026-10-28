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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  // Invitation Code
  const [invitationCode, setInvitationCode] = useState('');
  const [invitationGroupName, setInvitationGroupName] = useState('');
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
      Alert.alert('Missing Code', 'Please enter your counsellor invitation code.');
      return;
    }
    setIsValidatingCode(true);
    try {
      const res = await validateInvitationCode(invitationCode.trim());
      if (res.isValid) {
        setCodeValidated(true);
        const groupName = res.invitation?.notes || res.invitation?.code || 'Devotee Group';
        setInvitationGroupName(groupName);
        Alert.alert('Code Verified ✓', `Invitation code valid for: "${groupName}"! Please complete your devotee profile.`);
      } else {
        setCodeValidated(false);
        setInvitationGroupName('');
        Alert.alert('Invalid Code', res.errorMessage || 'Invitation code is not valid.');
      }
    } finally {
      setIsValidatingCode(false);
    }
  };

  const handleRegister = async () => {
    if (!invitationCode.trim() || !displayName.trim() || !email.trim() || !password || !phoneNumber.trim()) {
      Alert.alert('Required Fields', 'Please fill in all required fields (Invitation Code, Name, Email, Password, WhatsApp Number).');
      return;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Password Too Short', 'Password must be at least 6 characters long.');
      return;
    }

    const cleanPhone = phoneNumber.trim();
    if (cleanPhone.length < 10) {
      Alert.alert('Invalid Mobile Number', 'Please enter a valid 10-digit WhatsApp mobile number.');
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
        email: cleanEmail,
        password,
        displayName: displayName.trim(),
        phoneNumber: cleanPhone,
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
          {
            paddingTop: Math.max(insets.top, 16) + 6,
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + 40 : Math.max(insets.bottom, 16) + 20,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        {/* Header with Official Logo */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={20} color={THEME.colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerBrandRow}>
            <Image source={require('../../../assets/logo.png')} style={styles.miniLogo} />
            <View>
              <Text style={styles.headerTitle}>Devotee Registration</Text>
              <Text style={styles.headerSubtitle}>Bhakti Unnati • ISKCON Sadhana</Text>
            </View>
          </View>
        </View>

        {/* Step 1: Invitation Code */}
        <View
          style={styles.card}
          onLayout={(e) => handleFieldLayout('invitationCard', e.nativeEvent.layout.y)}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepCircleText}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardSectionTitle}>Counsellor Invitation Code</Text>
              <Text style={styles.helperText}>Enter the code provided by your counsellor</Text>
            </View>
          </View>

          <View style={styles.invitationRow}>
            <View style={styles.inputBoxWithIcon}>
              <Ionicons name="key-outline" size={18} color="#D97706" style={styles.inputLeadingIcon} />
              <TextInput
                style={[styles.boxTextInput, styles.invitationInput]}
                placeholder="e.g. INVIT-XXXX"
                placeholderTextColor="#9CA3AF"
                value={invitationCode}
                onChangeText={(val) => {
                  setInvitationCode(val.toUpperCase());
                  setCodeValidated(false);
                  setInvitationGroupName('');
                }}
                onFocus={() => handleFieldFocus('invitationCard')}
                autoCapitalize="characters"
                maxLength={16}
              />
            </View>
            <TouchableOpacity
              style={[styles.verifyButton, codeValidated && styles.verifyButtonSuccess]}
              onPress={handleVerifyInvitation}
              disabled={isValidatingCode}
              activeOpacity={0.8}
            >
              {isValidatingCode ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons
                    name={codeValidated ? 'checkmark-circle' : 'shield-checkmark-outline'}
                    size={14}
                    color="#FFFFFF"
                  />
                  <Text style={styles.verifyButtonText}>
                    {codeValidated ? 'Verified' : 'Verify'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Verified Group Name Badge */}
          {codeValidated && (
            <View style={styles.verifiedGroupBadge}>
              <Ionicons name="people" size={16} color="#15803D" />
              <Text style={styles.verifiedGroupText}>
                Joining Group: <Text style={{ fontWeight: 'bold' }}>{invitationGroupName}</Text>
              </Text>
            </View>
          )}
        </View>

        {/* Step 2: Personal & Spiritual Profile */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepCircleText}>2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardSectionTitle}>Devotee Profile Details</Text>
              <Text style={styles.helperText}>Provide accurate information for your counsellor</Text>
            </View>
          </View>

          {/* Name */}
          <View
            style={styles.inputGroup}
            onLayout={(e) => handleFieldLayout('name', e.nativeEvent.layout.y)}
          >
            <Text style={styles.inputLabel}>Name / Initiated Name *</Text>
            <View style={styles.inputBoxWithIcon}>
              <Ionicons name="person-outline" size={18} color="#D97706" style={styles.inputLeadingIcon} />
              <TextInput
                style={styles.boxTextInput}
                placeholder="e.g. Radheshyam Das / Ramesh Kumar"
                placeholderTextColor="#9CA3AF"
                value={displayName}
                onChangeText={setDisplayName}
                onFocus={() => handleFieldFocus('name')}
              />
            </View>
          </View>

          {/* Email */}
          <View
            style={styles.inputGroup}
            onLayout={(e) => handleFieldLayout('email', e.nativeEvent.layout.y)}
          >
            <Text style={styles.inputLabel}>Email Address *</Text>
            <View style={styles.inputBoxWithIcon}>
              <Ionicons name="mail-outline" size={18} color="#D97706" style={styles.inputLeadingIcon} />
              <TextInput
                style={styles.boxTextInput}
                placeholder="devotee@example.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                onFocus={() => handleFieldFocus('email')}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Password */}
          <View
            style={styles.inputGroup}
            onLayout={(e) => handleFieldLayout('password', e.nativeEvent.layout.y)}
          >
            <Text style={styles.inputLabel}>Create Password *</Text>
            <View style={styles.inputBoxWithIcon}>
              <Ionicons name="lock-closed-outline" size={18} color="#D97706" style={styles.inputLeadingIcon} />
              <TextInput
                style={[styles.boxTextInput, { flex: 1 }]}
                placeholder="Minimum 6 characters"
                placeholderTextColor="#9CA3AF"
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
            <View style={styles.inputBoxWithIcon}>
              <Ionicons name="logo-whatsapp" size={18} color="#16A34A" style={styles.inputLeadingIcon} />
              <TextInput
                style={styles.boxTextInput}
                placeholder="10-digit WhatsApp mobile number"
                placeholderTextColor="#9CA3AF"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                onFocus={() => handleFieldFocus('phone')}
                keyboardType="phone-pad"
                maxLength={15}
              />
            </View>
          </View>

          {/* Daily Rounds */}
          <View
            style={styles.inputGroup}
            onLayout={(e) => handleFieldLayout('rounds', e.nativeEvent.layout.y)}
          >
            <Text style={styles.inputLabel}>Daily Japa Commitment (Rounds) *</Text>
            <View style={styles.inputBoxWithIcon}>
              <Ionicons name="disc-outline" size={18} color="#D97706" style={styles.inputLeadingIcon} />
              <TextInput
                style={styles.boxTextInput}
                placeholder="e.g. 16"
                placeholderTextColor="#9CA3AF"
                value={declaredRounds}
                onChangeText={setDeclaredRounds}
                onFocus={() => handleFieldFocus('rounds')}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
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
                <Ionicons name="calendar" size={18} color="#D97706" />
                <Text
                  style={[
                    styles.dateSelectorText,
                    !dateOfBirthDisplay && styles.dateSelectorPlaceholder,
                  ]}
                >
                  {dateOfBirthDisplay ? dateOfBirthDisplay : 'Scroll & Select Date (e.g. 10-May-1995)'}
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
                <Ionicons name="heart" size={18} color="#EA580C" />
                <Text
                  style={[
                    styles.dateSelectorText,
                    !iskconConnectDisplay && styles.dateSelectorPlaceholder,
                  ]}
                >
                  {iskconConnectDisplay
                    ? iskconConnectDisplay
                    : 'Scroll & Select Date (e.g. 15-Jan-2018)'}
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
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="checkmark-done-circle" size={19} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Submit Devotee Registration</Text>
              </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backBtn: {
    padding: 6,
    marginRight: 6,
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  miniLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: THEME.colors.primary,
  },
  headerSubtitle: {
    fontSize: 10,
    color: THEME.colors.goldDark,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardSectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#7C2D12',
  },
  helperText: {
    fontSize: 10.5,
    color: '#6B7280',
    marginTop: 1,
  },
  invitationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputBoxWithIcon: {
    flex: 1,
    height: 40,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputLeadingIcon: {
    marginRight: 8,
  },
  boxTextInput: {
    flex: 1,
    height: 40,
    fontSize: 12.5,
    color: '#1F2937',
  },
  invitationInput: {
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  verifyButton: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonSuccess: {
    backgroundColor: '#16A34A',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  verifiedGroupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
    gap: 6,
  },
  verifiedGroupText: {
    fontSize: 12,
    color: '#166534',
  },
  inputGroup: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 3,
  },
  textInput: {
    height: 38,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12.5,
    color: THEME.colors.text,
  },
  passwordWrapper: {
    height: 38,
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
    height: 38,
    fontSize: 12.5,
    color: THEME.colors.text,
  },
  eyeIcon: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateSelectorCard: {
    height: 40,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
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
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.colors.primary,
  },
  dateSelectorPlaceholder: {
    fontSize: 11.5,
    fontWeight: 'normal',
    color: '#9CA3AF',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 2,
  },
  dateBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.goldDark,
  },
  calculationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  dynamicCalculationText: {
    fontSize: 10.5,
    color: THEME.colors.goldDark,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#EA580C',
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: 'bold',
  },
});
