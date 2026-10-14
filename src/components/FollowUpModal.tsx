import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { FollowUpChannel } from '../types/monitoring';
import { FOLLOW_UP_TEMPLATES } from '../constants/templates';
import { followUpService } from '../services/followUpService';
import { useAuth } from '../context/AuthContext';

interface FollowUpModalProps {
  visible: boolean;
  onClose: () => void;
  counselee: {
    uid: string;
    displayName: string;
    phoneNumber?: string;
    email?: string;
  };
  initialTemplate?: 'missing_card' | 'meeting_invite' | 'encouragement' | 'custom';
  onFollowUpLogged?: () => void;
}

export const FollowUpModal: React.FC<FollowUpModalProps> = ({
  visible,
  onClose,
  counselee,
  initialTemplate = 'missing_card',
  onFollowUpLogged,
}) => {
  const { user } = useAuth();
  const [channel, setChannel] = useState<FollowUpChannel>('whatsapp');
  const [templateKey, setTemplateKey] = useState<
    'missing_card' | 'meeting_invite' | 'encouragement' | 'custom'
  >(initialTemplate);

  const [subject, setSubject] = useState<string>(
    FOLLOW_UP_TEMPLATES[initialTemplate === 'custom' ? 'encouragement' : initialTemplate]?.subject || 'Hare Krishna!'
  );
  const [message, setMessage] = useState<string>(
    FOLLOW_UP_TEMPLATES[initialTemplate === 'custom' ? 'encouragement' : initialTemplate]?.text || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTemplateChange = (key: 'missing_card' | 'meeting_invite' | 'encouragement' | 'custom') => {
    setTemplateKey(key);
    if (key !== 'custom') {
      setSubject(FOLLOW_UP_TEMPLATES[key].subject);
      setMessage(FOLLOW_UP_TEMPLATES[key].text);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      Alert.alert('Empty Message', 'Please enter a message to send.');
      return;
    }

    setIsSubmitting(true);
    try {
      let launched = false;

      if (channel === 'whatsapp') {
        if (!counselee.phoneNumber) {
          Alert.alert('Missing Phone', 'This counselee has no phone number recorded.');
          return;
        }
        const url = followUpService.getWhatsAppUrl(counselee.phoneNumber, message);
        launched = await followUpService.launchExternalChannel(url);
      } else if (channel === 'sms') {
        if (!counselee.phoneNumber) {
          Alert.alert('Missing Phone', 'This counselee has no phone number recorded.');
          return;
        }
        const url = followUpService.getSmsUrl(counselee.phoneNumber, message);
        launched = await followUpService.launchExternalChannel(url);
      } else if (channel === 'email') {
        if (!counselee.email) {
          Alert.alert('Missing Email', 'This counselee has no email address recorded.');
          return;
        }
        const url = followUpService.getEmailUrl(counselee.email, subject, message);
        launched = await followUpService.launchExternalChannel(url);
      } else {
        // In-App Notification
        launched = true;
      }

      // Record in audit log
      await followUpService.recordFollowUp({
        userId: counselee.uid,
        counseleeName: counselee.displayName,
        counseleePhone: counselee.phoneNumber,
        counseleeEmail: counselee.email,
        adminId: user?.uid || 'admin',
        channel,
        messageType: templateKey,
        messageSubject: subject,
        messageContent: message,
        deliveryStatus: channel === 'in_app' ? 'sent' : 'prepared',
        resolutionNotes: `Dispatched via ${channel.toUpperCase()}`,
      });

      Alert.alert('Follow-up Dispatched', `Message logged and dispatched via ${channel.toUpperCase()}.`);
      if (onFollowUpLogged) onFollowUpLogged();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to dispatch follow-up.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Follow-up with Devotee</Text>
              <Text style={styles.counseleeName}>{counselee.displayName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Channel Selection */}
            <Text style={styles.sectionLabel}>Communication Channel</Text>
            <View style={styles.channelRow}>
              {(['whatsapp', 'sms', 'email', 'in_app'] as FollowUpChannel[]).map((ch) => (
                <TouchableOpacity
                  key={ch}
                  style={[styles.channelChip, channel === ch && styles.channelChipActive]}
                  onPress={() => setChannel(ch)}
                >
                  <Ionicons
                    name={
                      ch === 'whatsapp'
                        ? 'logo-whatsapp'
                        : ch === 'sms'
                        ? 'chatbubble-ellipses-outline'
                        : ch === 'email'
                        ? 'mail-outline'
                        : 'notifications-outline'
                    }
                    size={16}
                    color={channel === ch ? THEME.colors.textInverse : THEME.colors.primary}
                  />
                  <Text
                    style={[styles.channelChipText, channel === ch && styles.channelChipTextActive]}
                  >
                    {ch === 'in_app' ? 'In-App' : ch.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Template Selection */}
            <Text style={styles.sectionLabel}>Message Template</Text>
            <View style={styles.templateRow}>
              {[
                { key: 'missing_card', label: 'Missing Card' },
                { key: 'meeting_invite', label: 'Meeting' },
                { key: 'encouragement', label: 'Encouragement' },
                { key: 'custom', label: 'Custom' },
              ].map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[
                    styles.templateChip,
                    templateKey === t.key && styles.templateChipActive,
                  ]}
                  onPress={() => handleTemplateChange(t.key as any)}
                >
                  <Text
                    style={[
                      styles.templateChipText,
                      templateKey === t.key && styles.templateChipTextActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Subject (for email) */}
            {channel === 'email' && (
              <View style={styles.inputGroup}>
                <Text style={styles.sectionLabel}>Subject</Text>
                <TextInput
                  style={styles.textInput}
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="Subject..."
                />
              </View>
            )}

            {/* Message Body */}
            <Text style={styles.sectionLabel}>Message Content (Review & Edit)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              placeholder="Type encouraging devotional message..."
            />

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelBtn]}
                onPress={onClose}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.sendBtn]}
                onPress={handleSend}
                disabled={isSubmitting}
              >
                <Ionicons name="send" size={16} color={THEME.colors.textInverse} />
                <Text style={styles.sendBtnText}>
                  {isSubmitting ? 'Opening...' : `Send via ${channel.toUpperCase()}`}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: THEME.colors.background,
    borderTopLeftRadius: THEME.borderRadius.xl,
    borderTopRightRadius: THEME.borderRadius.xl,
    maxHeight: '85%',
    padding: THEME.spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  headerTitle: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  counseleeName: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.goldDark,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    paddingVertical: THEME.spacing.sm,
  },
  sectionLabel: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: 'bold',
    color: THEME.colors.textMuted,
    marginTop: THEME.spacing.sm,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  channelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.sm,
  },
  channelChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  channelChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  channelChipText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.colors.primary,
    marginLeft: 4,
  },
  channelChipTextActive: {
    color: THEME.colors.textInverse,
  },
  templateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: THEME.spacing.sm,
  },
  templateChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginRight: 6,
    marginBottom: 6,
  },
  templateChipActive: {
    backgroundColor: THEME.colors.goldLight,
    borderColor: THEME.colors.goldDark,
  },
  templateChipText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.text,
  },
  templateChipTextActive: {
    color: THEME.colors.primaryDark,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: THEME.spacing.sm,
  },
  textInput: {
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: THEME.spacing.base,
    paddingVertical: 8,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.text,
  },
  textArea: {
    height: 120,
    paddingTop: 10,
    marginBottom: THEME.spacing.base,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: THEME.spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.md,
  },
  cancelBtn: {
    backgroundColor: THEME.colors.surfaceVariant,
    marginRight: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  cancelBtnText: {
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  sendBtn: {
    backgroundColor: THEME.colors.primary,
    marginLeft: THEME.spacing.sm,
  },
  sendBtnText: {
    color: THEME.colors.textInverse,
    fontWeight: 'bold',
    marginLeft: 6,
  },
});
