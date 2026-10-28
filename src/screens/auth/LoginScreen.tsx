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
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { biometricService, BiometricAccount } from '../../services/biometricService';
import { UserProfile } from '../../types/auth';

export const LoginScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const { theme } = useTheme();

  // Mode: 'biometric' (banking-style remembered devotee) or 'credentials' (email/password form)
  const [viewMode, setViewMode] = useState<'biometric' | 'credentials'>('credentials');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Biometric state
  const [hasBiometricHw, setHasBiometricHw] = useState<boolean>(false);
  const [isDeviceEnrolled, setIsDeviceEnrolled] = useState<boolean>(false);
  const [activeAccount, setActiveAccount] = useState<BiometricAccount | null>(null);
  const [allAccounts, setAllAccounts] = useState<BiometricAccount[]>([]);
  const [isBiometricAuthenticating, setIsBiometricAuthenticating] = useState<boolean>(false);

  // Banking post-login enrollment modal
  const [showEnrollModal, setShowEnrollModal] = useState<boolean>(false);
  const [pendingLoggedInUser, setPendingLoggedInUser] = useState<UserProfile | null>(null);
  const [pendingPassword, setPendingPassword] = useState<string>('');
  const [isEnrollingBio, setIsEnrollingBio] = useState<boolean>(false);

  // Switch devotee account modal (if multiple accounts enrolled on this phone)
  const [showAccountSwitchModal, setShowAccountSwitchModal] = useState<boolean>(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [isSendingReset, setIsSendingReset] = useState<boolean>(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Check biometric availability and existing devotee enrollment on load
  useEffect(() => {
    loadBiometrics();
  }, []);

  const loadBiometrics = async () => {
    try {
      const hw = await biometricService.isHardwareAvailable();
      const devEnrolled = await biometricService.isEnrolled();
      setHasBiometricHw(hw);
      setIsDeviceEnrolled(devEnrolled);

      if (hw && devEnrolled) {
        const accounts = await biometricService.getEnrolledAccounts();
        setAllAccounts(accounts);

        const active = await biometricService.getActiveAccount();
        if (active) {
          setActiveAccount(active);
          setViewMode('biometric'); // Banking app: start in biometric mode for remembered devotee

          // Trigger biometric sensor prompt shortly after screen appears
          setTimeout(() => {
            triggerBiometricAuth(active);
          }, 450);
        } else {
          setViewMode('credentials');
        }
      } else {
        setViewMode('credentials');
      }
    } catch (e) {
      setViewMode('credentials');
    }
  };

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  /**
   * Banking-style biometric login for the target enrolled devotee
   */
  const triggerBiometricAuth = async (targetAccount?: BiometricAccount) => {
    const acc = targetAccount || activeAccount;
    if (!acc) return;

    setIsBiometricAuthenticating(true);
    try {
      const authenticated = await biometricService.authenticateWithFingerprint(acc.email);
      if (authenticated && authenticated.email && authenticated.password) {
        await signIn(authenticated.email, authenticated.password);
      }
    } catch (err: any) {
      // User cancelled or biometric error
      console.log('Biometric sign-in dismissed/failed:', err?.message);
    } finally {
      setIsBiometricAuthenticating(false);
    }
  };

  /**
   * Standard Email & Password Login
   */
  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const userProfile = await signIn(cleanEmail, password);

      // Check if this specific user already has fingerprint enrolled on this phone
      if (hasBiometricHw && isDeviceEnrolled) {
        const isEnrolled = await biometricService.isUserEnrolled(cleanEmail);
        if (!isEnrolled) {
          // Devotee logged in with password: ask if they want to enable fingerprint
          setPendingLoggedInUser(userProfile);
          setPendingPassword(password);
          setShowEnrollModal(true);
          return;
        } else {
          // Already enrolled: update credentials in background to keep password in sync
          await biometricService.enrollDevoteeWithFingerprint(
            {
              uid: userProfile.uid,
              email: cleanEmail,
              displayName: userProfile.displayName,
              photoURL: userProfile.photoURL,
            },
            password
          );
        }
      }
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Could not verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Devotee taps "Enable Fingerprint" on banking prompt after login
   */
  const handleEnrollBiometric = async () => {
    if (!pendingLoggedInUser || !pendingPassword) {
      setShowEnrollModal(false);
      return;
    }

    setIsEnrollingBio(true);
    try {
      const success = await biometricService.enrollDevoteeWithFingerprint(
        {
          uid: pendingLoggedInUser.uid,
          email: pendingLoggedInUser.email,
          displayName: pendingLoggedInUser.displayName,
          photoURL: pendingLoggedInUser.photoURL,
        },
        pendingPassword
      );

      setShowEnrollModal(false);
      if (success) {
        Alert.alert(
          'Fingerprint Enabled',
          `Fingerprint sign-in is now active for ${pendingLoggedInUser.displayName}. Next time, you can log in instantly with your touch sensor!`
        );
      }
    } catch (err: any) {
      setShowEnrollModal(false);
      Alert.alert('Touch Sensor', err.message || 'Fingerprint setup cancelled.');
    } finally {
      setIsEnrollingBio(false);
    }
  };

  const handleSkipBiometricEnroll = () => {
    setShowEnrollModal(false);
  };

  const handleSendPasswordReset = async () => {
    const targetEmail = resetEmail.trim();
    if (!targetEmail) {
      Alert.alert('Missing Email', 'Please enter your registered email address.');
      return;
    }

    Alert.alert(
      'Confirm Password Reset',
      `Are you sure you want to send a password reset link to ${targetEmail}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Reset Link',
          onPress: async () => {
            setIsSendingReset(true);
            try {
              const res = await authService.sendPasswordReset(targetEmail);
              setShowForgotModal(false);
              Alert.alert('Reset Link Sent', res.message);
            } catch (err: any) {
              Alert.alert('Recovery Request Failed', err.message || 'Could not send password reset email.');
            } finally {
              setIsSendingReset(false);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 16) + 12,
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + 40 : Math.max(insets.bottom, 20) + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        {/* Branding Header with Round Official Logo */}
        <View style={styles.brandContainer}>
          <View style={styles.logoCircle}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.brandTitle, { color: theme.colors.primaryDark }]}>Bhakti Unnati</Text>
          <Text style={[styles.brandSubtitle, { color: theme.colors.goldDark }]}>Advancement in Devotion</Text>
        </View>

        {/* BANKING APP MODE 1: REMEMBERED DEVOTEE BIOMETRIC CARD */}
        {viewMode === 'biometric' && activeAccount ? (
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {/* Devotee Avatar & Welcome */}
            <View style={styles.bioProfileHeader}>
              <View style={[styles.bioAvatarRing, { borderColor: theme.thickColor }]}>
                {activeAccount.photoURL ? (
                  <Image source={{ uri: activeAccount.photoURL }} style={styles.bioAvatarImage} />
                ) : (
                  <View style={[styles.bioAvatarFallback, { backgroundColor: theme.liteColor }]}>
                    <Text style={[styles.bioAvatarInitials, { color: theme.thickColor }]}>
                      {activeAccount.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.bioGreeting}>Welcome back,</Text>
              <Text style={[styles.bioDevoteeName, { color: theme.colors.text }]} numberOfLines={1}>
                {activeAccount.displayName}
              </Text>
              <Text style={[styles.bioDevoteeEmail, { color: theme.colors.textMuted }]} numberOfLines={1}>
                {activeAccount.email}
              </Text>
            </View>

            {/* Prominent Banking Touch Sensor Login Action */}
            <TouchableOpacity
              style={[
                styles.bioSensorCard,
                { backgroundColor: theme.liteColor, borderColor: theme.thickColor },
              ]}
              onPress={() => triggerBiometricAuth(activeAccount)}
              disabled={isBiometricAuthenticating}
              activeOpacity={0.8}
            >
              <View style={[styles.bioSensorIconCircle, { backgroundColor: theme.thickColor }]}>
                {isBiometricAuthenticating ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons name="finger-print" size={32} color="#FFFFFF" />
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.bioSensorActionTitle, { color: theme.thickColor }]}>
                  {isBiometricAuthenticating ? 'Scanning Sensor...' : 'Touch Sensor to Sign In'}
                </Text>
                <Text style={[styles.bioSensorActionSubtitle, { color: theme.colors.textMuted }]}>
                  Instant & secure fingerprint login
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.thickColor} />
            </TouchableOpacity>

            {/* Switch to multiple enrolled devotees if >1 */}
            {allAccounts.length > 1 && (
              <TouchableOpacity
                style={styles.switchDevoteeBtn}
                onPress={() => setShowAccountSwitchModal(true)}
              >
                <Ionicons name="people-outline" size={16} color={theme.thickColor} />
                <Text style={[styles.switchDevoteeBtnText, { color: theme.thickColor }]}>
                  Switch Devotee ({allAccounts.length} saved)
                </Text>
              </TouchableOpacity>
            )}

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Switch to standard Password Form */}
            <TouchableOpacity
              style={[styles.usePasswordBtn, { borderColor: theme.colors.border }]}
              onPress={() => {
                setEmail(activeAccount.email);
                setPassword('');
                setViewMode('credentials');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="key-outline" size={18} color={theme.colors.text} style={{ marginRight: 8 }} />
              <Text style={[styles.usePasswordBtnText, { color: theme.colors.text }]}>
                Sign in with Password / Different Devotee
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* BANKING APP MODE 2: STANDARD CREDENTIALS FORM (NO AWKWARD FINGERPRINT BUTTON UNDER SIGN IN) */
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.primaryDark }]}>Devotee Login</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={THEME.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="devotee@example.com"
                  placeholderTextColor={THEME.colors.textLight}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={THEME.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your password"
                  placeholderTextColor={THEME.colors.textLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={THEME.colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password Link */}
            <TouchableOpacity
              style={styles.forgotPasswordBtn}
              onPress={() => {
                setResetEmail(email.trim());
                setShowForgotModal(true);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.forgotPasswordText, { color: theme.thickColor }]}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Clean Sign In Button */}
            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: theme.thickColor }]}
              onPress={handleLogin}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Return to Fingerprint Sign-in for remembered devotee (if one exists) */}
            {activeAccount && (
              <TouchableOpacity
                style={styles.returnBioBtn}
                onPress={() => setViewMode('biometric')}
                activeOpacity={0.7}
              >
                <Ionicons name="finger-print" size={16} color={theme.thickColor} style={{ marginRight: 6 }} />
                <Text style={[styles.returnBioText, { color: theme.thickColor }]}>
                  Sign in with Fingerprint as {activeAccount.displayName}
                </Text>
              </TouchableOpacity>
            )}

            {/* Register Prompt */}
            <View style={styles.registerPrompt}>
              <Text style={styles.registerPromptText}>New Counselee with Invitation Code?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.registerLinkText, { color: theme.thickColor }]}>Register Here</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Footer Mantra */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Hare Krishna Hare Krishna Krishna Krishna Hare Hare{'\n'}
            Hare Rama Hare Rama Rama Rama Hare Hare
          </Text>
        </View>
      </ScrollView>

      {/* BANKING APP POST-LOGIN ENROLLMENT MODAL */}
      <Modal
        visible={showEnrollModal}
        transparent
        animationType="fade"
        onRequestClose={handleSkipBiometricEnroll}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={[styles.enrollIconCircle, { backgroundColor: theme.liteColor, borderColor: theme.thickColor }]}>
              <Ionicons name="finger-print" size={44} color={theme.thickColor} />
            </View>

            <Text style={styles.enrollModalTitle}>Enable Fingerprint Sign-In?</Text>
            <Text style={styles.enrollDevoteeTag}>{pendingLoggedInUser?.displayName || 'Devotee'}</Text>

            <Text style={styles.enrollModalBody}>
              Would you like to use your fingerprint touch sensor for instant, secure sign-in next time without entering your password?
            </Text>

            {/* Action Buttons */}
            <TouchableOpacity
              style={[styles.enrollConfirmBtn, { backgroundColor: theme.thickColor }]}
              onPress={handleEnrollBiometric}
              disabled={isEnrollingBio}
              activeOpacity={0.8}
            >
              {isEnrollingBio ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="finger-print" size={20} color="#FFFFFF" />
                  <Text style={styles.enrollConfirmBtnText}>Enable Touch Sensor</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.enrollSkipBtn}
              onPress={handleSkipBiometricEnroll}
              disabled={isEnrollingBio}
            >
              <Text style={styles.enrollSkipBtnText}>Not Now / Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MULTI-DEVOTEE ACCOUNT SWITCH MODAL */}
      <Modal
        visible={showAccountSwitchModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAccountSwitchModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowAccountSwitchModal(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Devotee Account</Text>
                  <TouchableOpacity onPress={() => setShowAccountSwitchModal(false)}>
                    <Ionicons name="close" size={22} color={THEME.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 280, marginVertical: 10 }}>
                  {allAccounts.map((acc) => (
                    <TouchableOpacity
                      key={acc.email}
                      style={[
                        styles.accountItem,
                        acc.email === activeAccount?.email && {
                          borderColor: theme.thickColor,
                          backgroundColor: theme.liteColor,
                        },
                      ]}
                      onPress={async () => {
                        await biometricService.setActiveAccount(acc.email);
                        setActiveAccount(acc);
                        setShowAccountSwitchModal(false);
                        triggerBiometricAuth(acc);
                      }}
                    >
                      <View style={[styles.accountItemAvatar, { backgroundColor: theme.thickColor }]}>
                        <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
                          {acc.displayName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.accountItemName}>{acc.displayName}</Text>
                        <Text style={styles.accountItemEmail}>{acc.email}</Text>
                      </View>
                      {acc.email === activeAccount?.email && (
                        <Ionicons name="checkmark-circle" size={20} color={theme.thickColor} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Forgot Password Recovery Modal */}
      <Modal
        visible={showForgotModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowForgotModal(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                    <Ionicons name="key" size={20} color={THEME.colors.gold} />
                    <Text style={styles.modalTitle}>Password Recovery</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowForgotModal(false)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={22} color={THEME.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalSubtitle}>
                  Enter your registered email address below. We will send a secure password reset link directly to your email inbox.
                </Text>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>Registered Email Address</Text>
                  <View style={styles.modalInputWrapper}>
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color={THEME.colors.textMuted}
                      style={styles.modalInputIcon}
                    />
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="e.g. devotee@example.com"
                      value={resetEmail}
                      onChangeText={setResetEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      selectTextOnFocus
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.sendResetButton,
                    { backgroundColor: theme.thickColor },
                    isSendingReset && styles.sendResetButtonDisabled,
                  ]}
                  onPress={handleSendPasswordReset}
                  disabled={isSendingReset}
                >
                  {isSendingReset ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.sendResetButtonText}>Send Reset Link to Email</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 6,
    shadowColor: '#B45309',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    overflow: 'hidden',
  },
  logoImage: {
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  card: {
    width: '100%',
    borderRadius: 18,
    padding: 22,
    borderWidth: 1.5,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  // Banking biometric card styles
  bioProfileHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  bioAvatarRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2.5,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  bioAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
  },
  bioAvatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioAvatarInitials: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  bioGreeting: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  bioDevoteeName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  bioDevoteeEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  bioSensorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  bioSensorIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioSensorActionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  bioSensorActionSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  switchDevoteeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 6,
  },
  switchDevoteeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    paddingHorizontal: 10,
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  usePasswordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: '#F9FAFB',
  },
  usePasswordBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Standard credentials inputs
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    height: '100%',
  },
  eyeIcon: {
    padding: 6,
  },
  forgotPasswordBtn: {
    alignSelf: 'flex-end',
    marginBottom: 14,
    marginTop: -4,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  forgotPasswordText: {
    fontSize: 12,
    fontWeight: '700',
  },
  loginButton: {
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  returnBioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 6,
  },
  returnBioText: {
    fontSize: 12,
    fontWeight: '700',
  },
  registerPrompt: {
    marginTop: 18,
    alignItems: 'center',
  },
  registerPromptText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  registerLinkText: {
    fontSize: 13,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  footer: {
    marginTop: 18,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 360,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 14,
  },
  modalInputGroup: {
    marginBottom: 16,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 5,
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 44,
  },
  modalInputIcon: {
    marginRight: 8,
  },
  modalTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    height: '100%',
  },
  sendResetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 8,
    gap: 8,
  },
  sendResetButtonDisabled: {
    opacity: 0.6,
  },
  sendResetButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Enrollment modal
  enrollIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  enrollModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#111827',
  },
  enrollDevoteeTag: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    color: '#EA580C',
    marginTop: 2,
    marginBottom: 10,
  },
  enrollModalBody: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
  },
  enrollConfirmBtn: {
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  enrollConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  enrollSkipBtn: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enrollSkipBtnText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  // Account switch items
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  accountItemAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  accountItemEmail: {
    fontSize: 11,
    color: '#6B7280',
  },
});
