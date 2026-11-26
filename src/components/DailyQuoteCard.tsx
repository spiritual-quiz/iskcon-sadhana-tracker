import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { quoteService, DevotionalQuote } from '../services/quoteService';
import { showCrossPlatformAlert } from '../utils/alertUtils';

export const DailyQuoteCard: React.FC = () => {
  const { theme } = useTheme();
  const [copied, setCopied] = useState<boolean>(false);
  const quote: DevotionalQuote = quoteService.getQuoteOfTheDay();

  const handleCopy = async () => {
    const success = await quoteService.copyQuoteToClipboard(quote);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showCrossPlatformAlert('Quote Copied', 'Daily devotional verse copied to clipboard. Share with devotees on WhatsApp!');
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.topRow}>
        <View style={styles.badgeRow}>
          <View style={[styles.iconPill, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="book" size={13} color="#D97706" />
          </View>
          <Text style={styles.badgeText}>VERSE OF THE DAY</Text>
        </View>

        <TouchableOpacity
          style={[styles.shareBtn, { backgroundColor: theme.colors.surface }]}
          onPress={handleCopy}
          activeOpacity={0.7}
        >
          <Ionicons
            name={copied ? 'checkmark' : 'share-social-outline'}
            size={14}
            color={copied ? '#059669' : theme.thickColor}
          />
          <Text style={[styles.shareText, { color: copied ? '#059669' : theme.thickColor }]}>
            {copied ? 'Copied' : 'Share'}
          </Text>
        </TouchableOpacity>
      </View>

      {quote.sanskrit && (
        <Text style={[styles.sanskritText, { color: theme.thickColor }]}>
          {quote.sanskrit}
        </Text>
      )}

      <Text style={[styles.quoteText, { color: theme.colors.text }]}>
        "{quote.text}"
      </Text>

      <View style={styles.sourceRow}>
        <Ionicons name="sparkles" size={12} color="#D97706" />
        <Text style={[styles.sourceText, { color: theme.colors.textMuted }]}>
          — {quote.source}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  iconPill: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  themeDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#94A3B8',
  },
  themeLabel: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  shareText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sanskritText: {
    fontSize: 11.5,
    fontStyle: 'italic',
    lineHeight: 17,
    marginBottom: 6,
    fontWeight: '600',
  },
  quoteText: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '500',
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
