import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

interface QRCodeDisplayProps {
  code: string;
  notes?: string;
  expiresAt?: string;
  maxUses?: number;
  usedCount?: number;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  code,
  notes,
  expiresAt,
  maxUses,
  usedCount,
}) => {
  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
    Alert.alert('Copied!', `Invitation code "${code}" copied to clipboard.`);
  };

  const qrPayload = JSON.stringify({
    app: 'ISKCON_SADHANA_TRACKER',
    code,
  });

  return (
    <View style={styles.card}>
      <Text style={styles.headerTitle}>Devotee Invitation Code</Text>
      <Text style={styles.headerSubtitle}>
        Share this QR code or 8-character invitation code with counselees to register.
      </Text>

      <View style={styles.qrContainer}>
        <QRCode
          value={qrPayload}
          size={180}
          color={THEME.colors.primaryDark}
          backgroundColor={THEME.colors.surface}
        />
      </View>

      <View style={styles.codeRow}>
        <Text style={styles.codeText}>{code}</Text>
        <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
          <Ionicons name="copy-outline" size={18} color={THEME.colors.primary} />
          <Text style={styles.copyText}>Copy</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        {maxUses !== undefined && (
          <Text style={styles.infoText}>
            Usage: {usedCount || 0} / {maxUses} devotees
          </Text>
        )}
        {expiresAt && (
          <Text style={styles.infoText}>
            Valid until: {new Date(expiresAt).toLocaleDateString()}
          </Text>
        )}
        {notes ? <Text style={styles.notesText}>Note: {notes}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.medium,
    marginVertical: THEME.spacing.base,
  },
  headerTitle: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: 'bold',
    color: THEME.colors.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginBottom: THEME.spacing.base,
    paddingHorizontal: THEME.spacing.sm,
  },
  qrContainer: {
    padding: THEME.spacing.base,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 2,
    borderColor: THEME.colors.goldLight,
    marginBottom: THEME.spacing.base,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceVariant,
    paddingHorizontal: THEME.spacing.base,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    marginBottom: THEME.spacing.md,
  },
  codeText: {
    fontSize: THEME.typography.sizes.xl,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: THEME.colors.primaryDark,
    marginRight: THEME.spacing.md,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.xs,
    backgroundColor: THEME.colors.goldLight,
  },
  copyText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginLeft: 4,
  },
  infoContainer: {
    width: '100%',
    paddingTop: THEME.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
    alignItems: 'center',
  },
  infoText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  notesText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.primary,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
