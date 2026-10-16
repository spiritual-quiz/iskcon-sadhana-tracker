import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
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
  const [hasQrError, setHasQrError] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
    Alert.alert('Copied!', `Invitation code "${code}" copied to clipboard.`);
  };

  const handleWhatsAppShare = async () => {
    const msg = `Hare Krishna!\n\nYou are invited to join Bhakti Unnati (Advancement in Devotion).\n\nYour Registration Invitation Code is: *${code}*\n\nPlease download/open the app, tap Register as New Counselee, and enter this code.\n\nHare Krishna!`;
    try {
      const url = `whatsapp://send?text=${encodeURIComponent(msg)}`;
      const can = await Linking.canOpenURL(url);
      if (can) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`);
      }
    } catch (e) {
      await Clipboard.setStringAsync(msg);
      Alert.alert('Message Copied', 'Invitation details copied to clipboard. You can paste and send in WhatsApp.');
    }
  };

  const qrPayload = JSON.stringify({
    app: 'ISKCON_SADHANA_TRACKER',
    code,
  });

  return (
    <View style={styles.card}>
      <View style={styles.titleBadge}>
        <Ionicons name="qr-code-outline" size={16} color={THEME.colors.gold} />
        <Text style={styles.titleBadgeText}>ACTIVE REGISTRATION QR</Text>
      </View>

      <Text style={styles.headerTitle}>Devotee Invitation Code</Text>
      <Text style={styles.headerSubtitle}>
        Counselees can scan this QR code or type the 8-character invitation code below to register.
      </Text>

      <View style={styles.qrContainer}>
        {!hasQrError ? (
          <QRCode
            value={qrPayload}
            size={180}
            color={THEME.colors.primaryDark}
            backgroundColor={THEME.colors.surface}
            onError={() => setHasQrError(true)}
          />
        ) : (
          <View style={styles.qrFallback}>
            <Ionicons name="qr-code" size={100} color={THEME.colors.primary} />
            <Text style={styles.qrFallbackCode}>{code}</Text>
          </View>
        )}
      </View>

      <View style={styles.codeRow}>
        <Text style={styles.codeText}>{code}</Text>
        <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
          <Ionicons name="copy-outline" size={18} color={THEME.colors.primaryDark} />
          <Text style={styles.copyText}>Copy Code</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.whatsappButton} onPress={handleWhatsAppShare}>
        <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
        <Text style={styles.whatsappButtonText}>Share Code via WhatsApp</Text>
      </TouchableOpacity>

      <View style={styles.infoContainer}>
        {maxUses !== undefined && (
          <Text style={styles.infoText}>
            Usage: {usedCount || 0} / {maxUses} devotees registered
          </Text>
        )}
        {expiresAt && (
          <Text style={styles.infoText}>
            Valid until: {new Date(expiresAt).toLocaleDateString()}
          </Text>
        )}
        {notes ? <Text style={styles.notesText}>Purpose: {notes}</Text> : null}
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
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primaryDark,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
    marginBottom: THEME.spacing.sm,
  },
  titleBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: THEME.colors.goldLight,
    marginLeft: 6,
    letterSpacing: 1,
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  whatsappButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: THEME.typography.sizes.sm,
    marginLeft: 8,
  },
  qrFallback: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.surfaceVariant,
    borderRadius: THEME.borderRadius.md,
  },
  qrFallbackCode: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.primary,
    letterSpacing: 2,
  },
});
