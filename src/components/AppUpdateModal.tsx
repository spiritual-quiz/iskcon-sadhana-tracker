import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { AppVersionInfo } from '../services/updateService';

export type UpdateModalStage = 'idle' | 'downloading' | 'completed' | 'error';

interface AppUpdateModalProps {
  visible: boolean;
  versionInfo?: AppVersionInfo;
  onUpdate: () => Promise<void>;
  onRestart?: () => Promise<void>;
  onDismiss: () => void;
  updateMessage?: string;
  isMandatory?: boolean;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  visible,
  versionInfo,
  onUpdate,
  onRestart,
  onDismiss,
  updateMessage,
  isMandatory = false,
}) => {
  const { theme } = useTheme();
  const [stage, setStage] = useState<UpdateModalStage>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    if (!visible) {
      setStage('idle');
      setErrorMsg(null);
    }
  }, [visible]);

  const handleUpdatePress = async () => {
    if (isWeb) {
      setStage('downloading');
      try {
        await onUpdate();
      } catch (e: any) {
        setErrorMsg(e?.message || 'Could not update web application.');
        setStage('error');
      }
      return;
    }

    // On Native Android:
    setStage('downloading');
    try {
      await onUpdate();
    } catch (e: any) {
      setErrorMsg(
        e?.message || 'Could not launch APK download. Please check your internet connection.'
      );
      setStage('error');
    }
  };

  const handleOpenReleasePage = () => {
    const cleanVer = (versionInfo?.version || '').replace(/^v/i, '').trim();
    const targetTag = cleanVer ? `v${cleanVer}` : 'v1.0.59';
    const url =
      versionInfo?.apkDownloadUrl ||
      `https://github.com/spiritual-quiz/iskcon-sadhana-tracker/releases/tag/${targetTag}`;
    Linking.openURL(url);
  };

  if (!visible) {
    return null;
  }

  const newVersionStr = versionInfo?.version ? `v${versionInfo.version}` : 'Latest';

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
                  <Text style={[styles.versionBadge, { color: theme.thickColor }]}>
                    Version {newVersionStr}
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                    {updateMessage ||
                      versionInfo?.releaseNotes ||
                      'A fresh release of Bhakti Unnati is ready with devotional enhancements, graphical analytics and reports.'}
                  </Text>

                  {/* Highlights Box */}
                  <View
                    style={[
                      styles.highlightsBox,
                      { backgroundColor: theme.liteColor, borderColor: theme.thickColor },
                    ]}
                  >
                    <View style={styles.highlightRow}>
                      <Ionicons name="checkmark-circle" size={16} color={theme.thickColor} />
                      <Text style={[styles.highlightText, { color: theme.colors.text }]}>
                        {isWeb ? 'Refreshes latest cloud features instantly' : 'Complete APK package from GitHub'}
                      </Text>
                    </View>
                    <View style={styles.highlightRow}>
                      <Ionicons name="checkmark-circle" size={16} color={theme.thickColor} />
                      <Text style={[styles.highlightText, { color: theme.colors.text }]}>
                        Zero data loss & preserves all sadhana entries
                      </Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.actionRow}>
                    {!isMandatory && (
                      <TouchableOpacity
                        style={[
                          styles.cancelButton,
                          { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                        ]}
                        onPress={onDismiss}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.cancelButtonText, { color: theme.colors.textMuted }]}>
                          Later
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.updateButton, { backgroundColor: theme.thickColor }]}
                      onPress={handleUpdatePress}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons
                          name={isWeb ? 'refresh-outline' : 'cloud-download-outline'}
                          size={18}
                          color="#FFFFFF"
                        />
                        <Text style={styles.updateButtonText}>
                          {isWeb ? 'Update & Reload' : 'Download Update'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* STAGE 2: DOWNLOADING / INSTRUCTIONS */}
              {stage === 'downloading' && (
                <>
                  <View style={[styles.iconCircle, { backgroundColor: theme.thickColor }]}>
                    <Ionicons name="cloud-download" size={30} color="#FFFFFF" />
                  </View>

                  <Text style={[styles.title, { color: theme.colors.text }]}>
                    {isWeb ? 'Updating Application...' : 'Downloading Update'}
                  </Text>

                  {isWeb ? (
                    <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                      Clearing browser cache and reloading the latest build...
                    </Text>
                  ) : (
                    <>
                      <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                        Bhakti-Unnati.apk ({newVersionStr}) is downloading in your notification bar.
                      </Text>

                      {/* Step-by-step guidance card */}
                      <View
                        style={[
                          styles.stepsCard,
                          { backgroundColor: theme.liteColor, borderColor: theme.thickColor },
                        ]}
                      >
                        <Text style={[styles.stepsTitle, { color: theme.thickColor }]}>
                          Next Steps to Install:
                        </Text>
                        <View style={styles.stepItem}>
                          <Text style={[styles.stepNum, { backgroundColor: theme.thickColor }]}>1</Text>
                          <Text style={[styles.stepText, { color: theme.colors.text }]}>
                            Swipe down your top notification panel.
                          </Text>
                        </View>
                        <View style={styles.stepItem}>
                          <Text style={[styles.stepNum, { backgroundColor: theme.thickColor }]}>2</Text>
                          <Text style={[styles.stepText, { color: theme.colors.text }]}>
                            Wait for <Text style={{ fontWeight: 'bold' }}>Bhakti-Unnati.apk</Text> to finish downloading (100%).
                          </Text>
                        </View>
                        <View style={styles.stepItem}>
                          <Text style={[styles.stepNum, { backgroundColor: theme.thickColor }]}>3</Text>
                          <Text style={[styles.stepText, { color: theme.colors.text }]}>
                            Tap the completed download and select <Text style={{ fontWeight: 'bold' }}>Install / Update</Text>.
                          </Text>
                        </View>
                      </View>

                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={[
                            styles.cancelButton,
                            { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                          ]}
                          onPress={handleOpenReleasePage}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.cancelButtonText, { color: theme.thickColor }]}>
                            Re-download APK
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.updateButton, { backgroundColor: theme.thickColor }]}
                          onPress={onDismiss}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.updateButtonText}>Done / Installing</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </>
              )}

              {/* STAGE 3: ERROR */}
              {stage === 'error' && (
                <>
                  <View style={[styles.iconCircle, { backgroundColor: '#DC2626' }]}>
                    <Ionicons name="alert-circle" size={30} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.title, { color: theme.colors.text }]}>
                    Update Check
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                    {errorMsg || 'Could not complete update. Please check your internet connection.'}
                  </Text>
                  <TouchableOpacity
                    style={[styles.updateButton, { backgroundColor: theme.thickColor, marginTop: 14 }]}
                    onPress={handleOpenReleasePage}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.updateButtonText}>Open GitHub Releases</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cancelButton, { marginTop: 8, borderColor: theme.colors.border }]}
                    onPress={onDismiss}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.cancelButtonText, { color: theme.colors.textMuted }]}>
                      Dismiss
                    </Text>
                  </TouchableOpacity>
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
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  versionBadge: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 18,
  },
  highlightsBox: {
    width: '100%',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    gap: 8,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  highlightText: {
    fontSize: 12,
    flex: 1,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  updateButton: {
    flex: 1.4,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  stepsCard: {
    width: '100%',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    gap: 8,
  },
  stepsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepNum: {
    width: 18,
    height: 18,
    borderRadius: 9,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 18,
  },
  stepText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
});
