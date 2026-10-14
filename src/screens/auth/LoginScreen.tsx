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

export const LoginScreen = ({ navigation }: any) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Devotional Branding Header */}
        <View style={styles.brandContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="flower-outline" size={44} color={THEME.colors.gold} />
          </View>
          <Text style={styles.brandTitle}>ISKCON Sadhana Tracker</Text>
          <Text style={styles.mantraText}>
            Hare Krishna Hare Krishna Krishna Krishna Hare Hare{'\n'}
            Hare Rama Hare Rama Rama Rama Hare Hare
          </Text>
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
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={THEME.colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={THEME.colors.textInverse} />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.registerPrompt}>
            <Text style={styles.registerPromptText}>New counselee with an invitation code?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLinkText}>Register Here</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Dedicated to His Divine Grace A.C. Bhaktivedanta Swami Prabhupāda
          </Text>
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
    flexGrow: 1,
    justifyContent: 'center',
    padding: THEME.spacing.base,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: THEME.spacing.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: THEME.colors.gold,
    marginBottom: THEME.spacing.md,
    ...THEME.shadows.medium,
  },
  brandTitle: {
    fontSize: THEME.typography.sizes.title,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    textAlign: 'center',
  },
  mantraText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.goldDark,
    textAlign: 'center',
    marginTop: 6,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.xl,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  cardTitle: {
    fontSize: THEME.typography.sizes.xl,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginBottom: THEME.spacing.base,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: THEME.spacing.base,
  },
  inputLabel: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: 'bold',
    color: THEME.colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: THEME.spacing.md,
  },
  inputIcon: {
    marginRight: THEME.spacing.sm,
  },
  textInput: {
    flex: 1,
    height: 48,
    fontSize: THEME.typography.sizes.base,
    color: THEME.colors.text,
  },
  eyeIcon: {
    padding: 6,
  },
  loginButton: {
    backgroundColor: THEME.colors.primary,
    height: 50,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: THEME.spacing.md,
    ...THEME.shadows.soft,
  },
  loginButtonText: {
    color: THEME.colors.textInverse,
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
  },
  registerPrompt: {
    marginTop: THEME.spacing.lg,
    alignItems: 'center',
  },
  registerPromptText: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textMuted,
    marginBottom: 4,
  },
  registerLinkText: {
    fontSize: THEME.typography.sizes.base,
    color: THEME.colors.primary,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  footer: {
    marginTop: THEME.spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
});
