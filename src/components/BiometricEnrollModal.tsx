import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { UserProfile } from '../types/auth';
import { biometricService } from '../services/biometricService';

interface BiometricEnrollModalProps {
  visible: boolean;
  user: UserProfile | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BiometricEnrollModal: React.FC<BiometricEnrollModalProps> = ({
  visible,
  user,
  onClose,
  onSuccess,
}) => {
  const { theme } = useTheme();
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (!visible || !user) return null;

  const handleEnroll = async (explicitPassword?: string) => {
    setIsEnrolling(true);
    try {
      const res = await biometricService.enrollWithStoredPassword(user, explicitPassword);
      if (res.success) {
        setIsEnrolling(false);
        onClose();
        Alert.alert(
          'Fingerprint Enabled',
          `Hare Krishna! Touch sensor sign-in is now active for ${user.displayName || user.email}. You can log in instantly next time with your fingerprint!`
        );
        onSuccess?.();
      } else if (res.requiresPasswordPrompt) {
        setIsEnrolling(false);
        setNeedsPassword(true);
      } else {
        setIsEnrolling(false);
        Alert.alert('Touch Sensor', res.message || 'Setup was cancelled.');
      }
    } catch (e: any) {
      setIsEnrolling(false);
      Alert.alert('Touch Sensor', e.message || 'Could not verify fingerprint.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
              {/* Header Icon */}
              <View style={[styles.iconCircle, { backgroundColor: theme.liteColor, borderColor: theme.thickColor }]}>
                <Ionicons name="finger-print" size={44} color={theme.thickColor} />
              </View>

              <Text style={[styles.title, { color: theme.colors.text }]}>
                Enable Fingerprint Sign-In?
              </Text>

              <Text style={[styles.devoteeTag, { color: theme.thickColor }]}>
                {user.displayName || user.email}
              </Text>

              <Text style={[styles.body, { color: theme.colors.textMuted }]}>
                Log in instantly and securely next time using your phone's touch sensor without typing your password.
              </Text>

              {/* Password Input Prompt if not cached */}
              {needsPassword && (
                <View style={styles.passwordContainer}>
                  <Text style={[styles.passwordLabel, { color: theme.colors.text }]}>
                    Confirm Password to Link Fingerprint:
                  </Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={{ marginRight: 6 }} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter your account password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: theme.thickColor }]}
                onPress={() => (needsPassword ? handleEnroll(password) : handleEnroll())}
                disabled={isEnrolling}
                activeOpacity={0.8}
              >
                {isEnrolling ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="finger-print" size={20} color="#FFFFFF" />
                    <Text style={styles.confirmBtnText}>
                      {needsPassword ? 'Confirm & Scan Fingerprint' : 'Enable Touch Sensor Now'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.skipBtn} onPress={onClose} disabled={isEnrolling}>
                <Text style={styles.skipBtnText}>Not Now / Skip</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  devoteeTag: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
    marginBottom: 8,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 18,
  },
  passwordContainer: {
    width: '100%',
    marginBottom: 14,
  },
  passwordLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
  },
  confirmBtn: {
    width: '100%',
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    elevation: 2,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipBtnText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
});
