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
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { biometricService } from '../../services/biometricService';

export const LoginScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Biometric / Fingerprint Touch Sensor state
  const [isBiometricSupported, setIsBiometricSupported] = useState<boolean>(false);
  const [isBiometricConfigured, setIsBiometricConfigured] = useState<boolean>(false);
  const [isBiometricAuthenticating, setIsBiometricAuthenticating] = useState<boolean>(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [isSendingReset, setIsSendingReset] = useState<boolean>(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const checkBiometrics = async () => {
      const hasHw = await biometricService.isHardwareAvailable();
      const enrolled = await biometricService.isEnrolled();
      setIsBiometricSupported(hasHw && enrolled);
      const configured = await biometricService.isBiometricLoginConfigured();
      setIsBiometricConfigured(configured);

      // Pre-fill email if previously saved for fingerprint
      if (configured) {
        const savedEmail = await biometricService.getSavedDevoteeEmail();
        if (savedEmail) {
          setEmail(savedEmail);
        }
      }
    };
    checkBiometrics();
  }, []);

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

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn(email.trim(), password);
      // Auto-save credentials for touch sensor if hardware is available
      if (isBiometricSupported) {
        await biometricService.saveCredentials(email.trim(), password);
      }
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Could not verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBiometricLogin = async () => {
    setIsBiometricAuthenticating(true);
    try {
      const creds = await biometricService.authenticateWithFingerprint();
      if (creds && creds.email && creds.password) {
        setEmail(creds.email);
        setPassword(creds.password);
        await signIn(creds.email, creds.password);
      }
    } catch (err: any) {
      Alert.alert('Touch Sensor / Fingerprint', err.message || 'Could not authenticate with fingerprint.');
    } finally {
      setIsBiometricAuthenticating(false);
    }
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
      style={styles.container}
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
          <Text style={styles.brandTitle}>Bhakti Unnati</Text>
          <Text style={styles.brandSubtitle}>Advancement in Devotion</Text>
        </View>

        {/* Form Container */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Devotee Login</Text>

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
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isSubmitting || isBiometricAuthenticating}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color={THEME.colors.textInverse} size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Touch Sensor / Fingerprint Sign In */}
          {isBiometricSupported && (
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={handleBiometricLogin}
              disabled={isSubmitting || isBiometricAuthenticating}
              activeOpacity={0.8}
            >
              {isBiometricAuthenticating ? (
                <ActivityIndicator color="#EA580C" size="small" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="finger-print" size={22} color="#EA580C" />
                  <Text style={styles.biometricButtonText}>Touch Sensor / Fingerprint Sign In</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Register Prompt */}
          <View style={styles.registerPrompt}>
            <Text style={styles.registerPromptText}>New Counselee with Invitation Code?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.registerLinkText}>Register Here</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Mantra */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Hare Krishna Hare Krishna Krishna Krishna Hare Hare{'\n'}
            Hare Rama Hare Rama Rama Rama Hare Hare
          </Text>
        </View>
      </ScrollView>

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

                {/* Send Password Reset Email */}
                <TouchableOpacity
                  style={[
                    styles.sendResetButton,
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
    backgroundColor: THEME.colors.background,
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
    color: THEME.colors.primaryDark,
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: THEME.colors.goldDark,
    fontWeight: '600',
    marginTop: 2,
  },
  institutionName: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.medium,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginBottom: 16,
    textAlign: 'center',
  },
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
    color: THEME.colors.text,
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
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  loginButton: {
    backgroundColor: THEME.colors.primary,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    elevation: 3,
    shadowColor: '#D97706',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#EA580C',
    marginTop: 10,
  },
  biometricButtonText: {
    color: '#EA580C',
    fontSize: 14,
    fontWeight: 'bold',
  },
  registerPrompt: {
    marginTop: 18,
    alignItems: 'center',
  },
  registerPromptText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginBottom: 4,
  },
  registerLinkText: {
    fontSize: 13,
    color: THEME.colors.primary,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  footer: {
    marginTop: 18,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 360,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
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
    color: THEME.colors.primary,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    lineHeight: 18,
    marginBottom: 14,
  },
  modalInputGroup: {
    marginBottom: 16,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.text,
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
    color: THEME.colors.text,
    height: '100%',
  },
  sendResetButton: {
    backgroundColor: THEME.colors.primary,
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
});
