import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { notificationService } from '../services/notificationService';

export type UpdateModalStage = 'idle' | 'downloading' | 'completed' | 'error';

interface AppUpdateModalProps {
  visible: boolean;
  onUpdate: () => Promise<void>;
  onRestart?: () => Promise<void>;
  onDismiss: () => void;
  updateMessage?: string;
  isMandatory?: boolean;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  visible,
  onUpdate,
  onRestart,
  onDismiss,
  updateMessage,
  isMandatory = false,
}) => {
  const { theme } = useTheme();
  const [stage, setStage] = useState<UpdateModalStage>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const progressTimerRef = useRef<any>(null);

  useEffect(() => {
    if (!visible) {
      setStage('idle');
      setProgress(0);
      setErrorMsg(null);
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    }
  }, [visible]);

  const handleUpdatePress = async () => {
    setStage('downloading');
    setProgress(12);
    setErrorMsg(null);
    notificationService.showUpdateDownloadProgress(12);

    // Smoothly increment progress bar towards 95% during network download
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        let nextVal = prev;
        if (prev < 35) nextVal = prev + 7;
        else if (prev < 70) nextVal = prev + 5;
        else if (prev < 90) nextVal = prev + 3;
        else if (prev < 95) nextVal = prev + 1;
        
        notificationService.showUpdateDownloadProgress(nextVal);
        return nextVal;
      });
    }, 280);

    try {
      await onUpdate();
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setProgress(100);
      setStage('completed');
      await notificationService.showUpdateCompleteNotification();
    } catch (e: any) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      await notificationService.dismissUpdateDownloadProgress();
      setErrorMsg(
        e?.message || 'Could not complete update. Please check your internet connection and try again.'
      );
      setStage('error');
    }
  };

  const handleRestartNow = async () => {
    if (onRestart) {
      try {
        await onRestart();
      } catch (e: any) {
        Alert.alert(
          'Restart Requested',
          'Please close Bhakti Unnati from your Recent Apps window and open it again to apply updates.'
        );
      }
    } else {
      Alert.alert(
        'Update Applied',
        'Please swipe away the app from your Recent Apps screen and reopen to use the new version.',
        [{ text: 'OK', onPress: onDismiss }]
      );
    }
  };

  const handleCloseAndReopenLater = () => {
    Alert.alert(
      'Update Ready!',
      'The update bundle is safely downloaded. When you swipe away the app from Recent Apps and reopen it, all changes will be active.',
      [{ text: 'Got It', onPress: onDismiss }]
    );
  };

  const handleDownloadApkDirectly = () => {
    Linking.openURL('https://github.com/spiritual-quiz/iskcon-sadhana-tracker/releases/latest');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={isMandatory ? () => {} : onDismiss}
    >
      <TouchableWithoutFeedback
        onPress={isMandatory || stage === 'downloading' ? undefined : onDismiss}
      >
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.dialogCard,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
              ]}
            >
              {/* STAGE 1: IDLE / AVAILABLE */}
              {stage === 'idle' && (
                <>
                  <View style={[styles.iconCircle, { backgroundColor: theme.thickColor }]}>
                    <Ionicons name="sparkles" size={28} color="#FFFFFF" />
                  </View>

                  <Text style={[styles.title, { color: theme.colors.text }]}>
                    New Update Available!
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                    {updateMessage ||
                      'A fresh version of Bhakti Unnati is ready with new devotional features and optimizations.'}
                  </Text>

                  {/* Highlights Box */}
                  <View
                    style={[
                      styles.highlightsBox,
                      {
                        backgroundColor: theme.liteColor,
                        borderColor: theme.colors.borderLight,
                      },
                    ]}
                  >
                    <View style={styles.featureItem}>
                      <Ionicons name="people-outline" size={16} color={theme.thickColor} />
                      <Text style={[styles.featureText, { color: theme.colors.text }]}>
                        Sanga weekly calculation Monday–Sunday live sync with pull-to-refresh
                      </Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="notifications-outline" size={16} color={theme.thickColor} />
                      <Text style={[styles.featureText, { color: theme.colors.text }]}>
                        Reliable 6 PM & 9 PM sadhana alarms fire even when app is completely closed
                      </Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="phone-portrait-outline" size={16} color={theme.thickColor} />
                      <Text style={[styles.featureText, { color: theme.colors.text }]}>
                        Official iPhone & Web PWA support with Add-to-Home-Screen
                      </Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="calculator-outline" size={16} color={theme.thickColor} />
                      <Text style={[styles.featureText, { color: theme.colors.text }]}>
                        Sadhana marks calculate only after entry (0/50 initially for pending)
                      </Text>
                    </View>
                  </View>

                  {/* Buttons */}
                  <View style={styles.actionsContainer}>
                    <TouchableOpacity
                      style={[styles.updateButton, { backgroundColor: theme.thickColor }]}
                      onPress={handleUpdatePress}
                      activeOpacity={0.8}
                    >
                      <View style={styles.btnRow}>
                        <Ionicons name="cloud-download-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.updateButtonText}>Update Now</Text>
                      </View>
                    </TouchableOpacity>

                    {!isMandatory && (
                      <TouchableOpacity style={styles.laterButton} onPress={onDismiss}>
                        <Text style={[styles.laterButtonText, { color: theme.colors.textMuted }]}>
                          Later
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}

              {/* STAGE 2: DOWNLOADING WITH PROGRESS BAR */}
              {stage === 'downloading' && (
                <>
                  <View style={[styles.iconCircle, { backgroundColor: theme.thickColor }]}>
                    <Ionicons name="cloud-download" size={30} color="#FFFFFF" />
                  </View>

                  <Text style={[styles.title, { color: theme.colors.text }]}>
                    Downloading Update...
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                    Please wait a moment while the update bundle is downloaded and verified.
                  </Text>

                  {/* Visual Animated Progress Bar */}
                  <View
                    style={[
                      styles.progressBarTrack,
                      { backgroundColor: theme.colors.borderLight || '#E2E8F0' },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${progress}%`,
                          backgroundColor: theme.thickColor,
                        },
                      ]}
                    />
                  </View>

                  {/* Progress Percent & Status */}
                  <View style={styles.progressInfoRow}>
                    <Text style={[styles.progressStatusText, { color: theme.colors.textMuted }]}>
                      {progress < 40
                        ? 'Fetching latest package...'
                        : progress < 85
                        ? 'Validating app resources...'
                        : 'Finalizing installation...'}
                    </Text>
                    <Text style={[styles.progressPercentText, { color: theme.thickColor }]}>
                      {progress}%
                    </Text>
                  </View>

                  <Text style={[styles.doNotCloseText, { color: theme.colors.textMuted }]}>
                    Keep the app open while the progress reaches 100%.
                  </Text>
                </>
              )}

              {/* STAGE 3: COMPLETED - ASK TO CLOSE & REOPEN OR RESTART */}
              {stage === 'completed' && (
                <>
                  <View style={[styles.iconCircle, { backgroundColor: '#15803D' }]}>
                    <Ionicons name="checkmark-done-circle" size={34} color="#FFFFFF" />
                  </View>

                  <Text style={[styles.title, { color: theme.colors.text }]}>
                    Update Complete! 🎉
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                    The latest devotional update has been downloaded successfully.
                  </Text>

                  {/* Action Instruction Box */}
                  <View style={styles.completedNoticeBox}>
                    <Ionicons name="refresh-circle-outline" size={20} color="#15803D" />
                    <Text style={styles.completedNoticeText}>
                      Please close and reopen the app (or tap Restart Now below) to activate all new
                      features.
                    </Text>
                  </View>

                  {/* Buttons */}
                  <View style={styles.actionsContainer}>
                    <TouchableOpacity
                      style={[styles.updateButton, { backgroundColor: '#15803D' }]}
                      onPress={handleRestartNow}
                      activeOpacity={0.8}
                    >
                      <View style={styles.btnRow}>
                        <Ionicons name="reload" size={18} color="#FFFFFF" />
                        <Text style={styles.updateButtonText}>Restart App Now</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.closeAppButton}
                      onPress={handleCloseAndReopenLater}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="exit-outline" size={16} color={theme.colors.textMuted} />
                      <Text
                        style={[styles.closeAppButtonText, { color: theme.colors.textMuted }]}
                      >
                        Close & Reopen Later
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* STAGE 4: ERROR WITH RETRY & DIRECT APK LINK */}
              {stage === 'error' && (
                <>
                  <View style={[styles.iconCircle, { backgroundColor: '#DC2626' }]}>
                    <Ionicons name="alert-circle" size={32} color="#FFFFFF" />
                  </View>

                  <Text style={[styles.title, { color: theme.colors.text }]}>
                    Update Not Applied
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                    {errorMsg || 'Could not verify or download the update bundle.'}
                  </Text>

                  <View style={styles.actionsContainer}>
                    <TouchableOpacity
                      style={[styles.updateButton, { backgroundColor: theme.thickColor }]}
                      onPress={handleUpdatePress}
                      activeOpacity={0.8}
                    >
                      <View style={styles.btnRow}>
                        <Ionicons name="refresh" size={18} color="#FFFFFF" />
                        <Text style={styles.updateButtonText}>Try Again</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.apkButton, { borderColor: theme.thickColor }]}
                      onPress={handleDownloadApkDirectly}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="download-outline" size={16} color={theme.thickColor} />
                      <Text style={[styles.apkButtonText, { color: theme.thickColor }]}>
                        Download APK Directly
                      </Text>
                    </TouchableOpacity>

                    {!isMandatory && (
                      <TouchableOpacity style={styles.laterButton} onPress={onDismiss}>
                        <Text style={[styles.laterButtonText, { color: theme.colors.textMuted }]}>
                          Dismiss
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
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
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    elevation: 4,
  },
  title: {
    fontSize: 18.5,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
    paddingHorizontal: 8,
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
    lineHeight: 16,
  },
  progressBarTrack: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  progressStatusText: {
    fontSize: 11.5,
    fontStyle: 'italic',
  },
  progressPercentText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  doNotCloseText: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
  },
  completedNoticeBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  completedNoticeText: {
    fontSize: 12,
    color: '#166534',
    flex: 1,
    lineHeight: 17,
    fontWeight: '500',
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
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  closeAppButton: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  closeAppButtonText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  apkButton: {
    width: '100%',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  apkButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  laterButton: {
    width: '100%',
    paddingVertical: 8,
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
});
