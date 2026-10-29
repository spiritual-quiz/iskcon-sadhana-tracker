import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { THEME } from '../constants/theme';

interface AppUpdateModalProps {
  visible: boolean;
  onUpdate: () => Promise<void>;
  onDismiss: () => void;
  updateMessage?: string;
  isMandatory?: boolean;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  visible,
  onUpdate,
  onDismiss,
  updateMessage,
  isMandatory = false,
}) => {
  const { theme } = useTheme();
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUpdatePress = async () => {
    setIsUpdating(true);
    setErrorMsg(null);
    try {
      await onUpdate();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Could not complete update. Please check connection and try again.');
      setIsUpdating(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={isMandatory ? () => {} : onDismiss}>
      <TouchableWithoutFeedback onPress={isMandatory || isUpdating ? undefined : onDismiss}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.dialogCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              {/* Header Icon Circle */}
              <View style={[styles.iconCircle, { backgroundColor: theme.thickColor }]}>
                <Ionicons name="sparkles" size={28} color="#FFFFFF" />
              </View>

              {/* Title & Subtitle */}
              <Text style={[styles.title, { color: theme.colors.text }]}>
                New Update Available!
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                A fresh version of Bhakti Unnati is ready with new devotional features and enhancements.
              </Text>

              {/* Update Highlights Card */}
              <View style={[styles.highlightsBox, { backgroundColor: theme.liteColor, borderColor: theme.colors.borderLight }]}>
                <View style={styles.featureItem}>
                  <Ionicons name="color-palette-outline" size={16} color={theme.thickColor} />
                  <Text style={[styles.featureText, { color: theme.colors.text }]}>
                    Full dynamic font & card colors across all 14 themes
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="stats-chart-outline" size={16} color={theme.thickColor} />
                  <Text style={[styles.featureText, { color: theme.colors.text }]}>
                    Unified Counsellor Reports screen with instant Search
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="notifications-outline" size={16} color={theme.thickColor} />
                  <Text style={[styles.featureText, { color: theme.colors.text }]}>
                    Background 6 PM & 9 PM alarms (runs even if app is closed)
                  </Text>
                </View>
              </View>

              {errorMsg && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={[styles.updateButton, { backgroundColor: theme.thickColor }]}
                  onPress={handleUpdatePress}
                  disabled={isUpdating}
                  activeOpacity={0.8}
                >
                  {isUpdating ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.updateButtonText}>Updating Application...</Text>
                    </View>
                  ) : (
                    <View style={styles.btnRow}>
                      <Ionicons name="cloud-download-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.updateButtonText}>Update Now</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {!isMandatory && !isUpdating && (
                  <TouchableOpacity style={styles.laterButton} onPress={onDismiss}>
                    <Text style={[styles.laterButtonText, { color: theme.colors.textMuted }]}>
                      Later
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
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
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1.5,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  highlightsBox: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 11.5,
    fontWeight: '500',
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
  },
  errorText: {
    fontSize: 11.5,
    color: '#DC2626',
    flex: 1,
  },
  actionsContainer: {
    width: '100%',
    gap: 8,
  },
  updateButton: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  laterButton: {
    width: '100%',
    paddingVertical: 9,
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
});
