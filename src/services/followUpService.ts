import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import * as Linking from 'expo-linking';
import { db } from '../config/firebase';
import { FollowUpRecord, FollowUpChannel, DeliveryStatus } from '../types/monitoring';

export const followUpService = {
  /**
   * Generates a direct WhatsApp link with prefilled text
   */
  getWhatsAppUrl: (phoneNumber: string, message: string): string => {
    // Strip non-numeric characters except leading +
    let cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
    if (!cleanNumber.startsWith('+') && cleanNumber.length === 10) {
      cleanNumber = `+91${cleanNumber}`; // Default to India country code if 10-digit
    }
    const encodedMsg = encodeURIComponent(message);
    return `whatsapp://send?phone=${cleanNumber}&text=${encodedMsg}`;
  },

  /**
   * Generates an SMS link with prefilled text
   */
  getSmsUrl: (phoneNumber: string, message: string): string => {
    const encodedMsg = encodeURIComponent(message);
    return `sms:${phoneNumber}?body=${encodedMsg}`;
  },

  /**
   * Generates an Email mailto link
   */
  getEmailUrl: (email: string, subject: string, message: string): string => {
    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  },

  /**
   * Execute external launch (WhatsApp, SMS, or Email client)
   */
  launchExternalChannel: async (url: string): Promise<boolean> => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      } else {
        // Fallback open
        await Linking.openURL(url);
        return true;
      }
    } catch (e) {
      console.warn('Could not launch external channel URL:', e);
      return false;
    }
  },

  /**
   * Record follow-up action in database audit trail
   */
  recordFollowUp: async (params: {
    userId: string;
    counseleeName: string;
    counseleePhone?: string;
    counseleeEmail?: string;
    adminId: string;
    channel: FollowUpChannel;
    messageType: 'missing_card' | 'meeting_invite' | 'encouragement' | 'custom';
    messageSubject?: string;
    messageContent: string;
    deliveryStatus: DeliveryStatus;
    resolutionNotes?: string;
  }): Promise<FollowUpRecord> => {
    const id = `fu_${Date.now()}_${params.userId}`;
    const record: FollowUpRecord = {
      id,
      userId: params.userId,
      counseleeName: params.counseleeName,
      counseleePhone: params.counseleePhone,
      counseleeEmail: params.counseleeEmail,
      adminId: params.adminId,
      channel: params.channel,
      messageType: params.messageType,
      messageSubject: params.messageSubject,
      messageContent: params.messageContent,
      deliveryStatus: params.deliveryStatus,
      resolutionNotes: params.resolutionNotes,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'follow_ups', id), record);
    return record;
  },

  /**
   * Get follow-up records for a specific counselee or all
   */
  getFollowUpHistory: async (userId?: string): Promise<FollowUpRecord[]> => {
    let q;
    if (userId) {
      q = query(
        collection(db, 'follow_ups'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(collection(db, 'follow_ups'), orderBy('createdAt', 'desc'));
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as FollowUpRecord);
  },
};
