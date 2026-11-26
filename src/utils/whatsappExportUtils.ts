import { Linking, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { vaishnavaCalendarService } from '../services/vaishnavaCalendarService';
import { quoteService } from '../services/quoteService';
import { showCrossPlatformAlert } from './alertUtils';

export interface WhatsAppDigestData {
  counsellorName: string;
  periodTitle: string; // e.g. "Weekly Sadhana Digest (17 Nov - 23 Nov 2026)"
  totalCounselees: number;
  activeSubmissions: number;
  totalRounds: number;
  totalReadingMinutes: number;
  brahmaMuhurtaCount: number;
  topHonours?: { name: string; score: number }[];
}

export const whatsappExportUtils = {
  /**
   * Builds an inspiring, cleanly formatted text digest for Sanga WhatsApp Groups.
   */
  buildDigestMessage: (data: WhatsAppDigestData): string => {
    const nextEkadashi = vaishnavaCalendarService.getNextEkadashi();
    const dailyQuote = quoteService.getQuoteOfTheDay();

    const readingHours = Math.round((data.totalReadingMinutes / 60) * 10) / 10;
    const participationRate =
      data.totalCounselees > 0
        ? Math.round((data.activeSubmissions / data.totalCounselees) * 100)
        : 100;

    let msg = `*🙏 Hare Krishna Prabhujis & Matajis 🙏*\n`;
    msg += `*Bhakti Unnati Sanga Sadhana Summary*\n`;
    msg += `📅 *Period:* ${data.periodTitle}\n`;
    msg += `👤 *Counsellor:* ${data.counsellorName}\n\n`;

    msg += `✨ *Sanga Devotional Highlights:*\n`;
    msg += `• *Active Submissions:* ${data.activeSubmissions} / ${data.totalCounselees} (${participationRate}%)\n`;
    msg += `• *Total Chanting Rounds:* 📿 ${data.totalRounds.toLocaleString()} rounds\n`;
    msg += `• *Prabhupada Book Reading:* 📖 ${readingHours} hours (${data.totalReadingMinutes} mins)\n`;
    msg += `• *Brahma-Muhurta Wake-ups:* 🌅 ${data.brahmaMuhurtaCount} days (<4:30 AM)\n\n`;

    if (data.topHonours && data.topHonours.length > 0) {
      msg += `🏆 *Devotional Honours & Consistency:*\n`;
      const medals = ['🥇', '🥈', '🥉', '⭐'];
      data.topHonours.slice(0, 5).forEach((h, idx) => {
        const medal = medals[idx] || '⭐';
        msg += `${medal} *${h.name}* — ${h.score}% score\n`;
      });
      msg += `\n`;
    }

    if (nextEkadashi) {
      msg += `🗓️ *Upcoming Fasting (Pune Zone):*\n`;
      msg += `• *${nextEkadashi.name}* on *${nextEkadashi.date}*\n`;
      if (nextEkadashi.paranTime) {
        msg += `  _Paran Time: ${nextEkadashi.paranTime}_\n`;
      }
      msg += `\n`;
    }

    msg += `📜 *Srila Prabhupada Nectar:*\n`;
    msg += `_"${dailyQuote.text}"_\n`;
    msg += `— *${dailyQuote.source}*\n\n`;

    msg += `_All glories to Sri Guru & Gauranga! All glories to Srila Prabhupada!_\n`;
    msg += `*Bhakti Unnati - ISKCON Devotional Sadhana*`;

    return msg;
  },

  /**
   * Directly opens WhatsApp with the drafted digest, or copies to clipboard with notification.
   */
  exportToWhatsApp: async (data: WhatsAppDigestData): Promise<void> => {
    const message = whatsappExportUtils.buildDigestMessage(data);
    await Clipboard.setStringAsync(message);

    const encoded = encodeURIComponent(message);
    const whatsappUrl = `whatsapp://send?text=${encoded}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        // Fallback for Web or devices without WhatsApp URL protocol registered
        showCrossPlatformAlert(
          'Copied to Clipboard! 📋',
          'Sanga WhatsApp Summary formatted and copied to clipboard. You can paste it directly into your WhatsApp group.'
        );
      }
    } catch {
      showCrossPlatformAlert(
        'Copied to Clipboard! 📋',
        'Sanga WhatsApp Summary copied to clipboard. Paste it in your devotee group chat.'
      );
    }
  },
};
