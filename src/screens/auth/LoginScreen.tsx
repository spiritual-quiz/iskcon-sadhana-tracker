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
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';

export const LoginScreen = ({ navigation }: any) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [isSendingReset, setIsSendingReset] = useState<boolean>(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Could not verify credentials.');
    } finally {
      setIsSubmitting(false);
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
          { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 40 : 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        {/* Branding Header with Official Logo */}
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
          <Text style={styles.cardTitle}>Sign In</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color={THEME.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="devotee@iskcon.org"
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
              <Ionicons name="lock-closed-outline" size={18} color={THEME.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
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
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={THEME.colors.textInverse} size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Log In</Text>
            )}
          </TouchableOpacity>

          {/* Register Prompt */}
          <View style={styles.registerPrompt}>
            <Text style={styles.registerPromptText}>New Counselee?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLinkText}>Register with Invitation Code</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
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
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  logoImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.colors.primary,
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
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.medium,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginBottom: 14,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 44,
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
    padding: 4,
  },
  forgotPasswordBtn: {
    alignSelf: 'flex-end',
    marginBottom: 12,
    marginTop: -4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  forgotPasswordText: {
    fontSize: 12,
    color: THEME.colors.primary,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: THEME.colors.primary,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  registerPrompt: {
    marginTop: 14,
    alignItems: 'center',
  },
  registerPromptText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginBottom: 3,
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
