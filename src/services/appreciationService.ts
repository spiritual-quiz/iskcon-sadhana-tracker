import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { AppreciationCard, AppreciationCategory } from '../types/appreciation';
import { APPRECIATION_TEMPLATES } from '../constants/templates';

export const appreciationService = {
  /**
   * Suggest an appreciation card based on genuine data
   */
  suggestAppreciation: async (params: {
    userId: string;
    counseleeName: string;
    category: AppreciationCategory;
    period: string;
    achievement: string;
    customMessage?: string;
  }): Promise<AppreciationCard> => {
    const id = `appr_${Date.now()}_${params.userId}`;
    const defaultMsg = APPRECIATION_TEMPLATES[params.category]?.defaultMessage || 'Well done! Keep progressing steadily.';

    const card: AppreciationCard = {
      id,
      userId: params.userId,
      counseleeName: params.counseleeName,
      category: params.category,
      period: params.period,
      achievement: params.achievement,
      message: params.customMessage || defaultMsg,
      isPublished: false, // Requires admin review and approval
      isSuggested: true,
      counseleeConsent: true,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'appreciations', id), card);
    return card;
  },

  /**
   * Admin: Approve and publish an appreciation card
   */
  publishAppreciation: async (cardId: string, customMessage?: string): Promise<void> => {
    const cardRef = doc(db, 'appreciations', cardId);
    const updates: any = {
      isPublished: true,
      publishedAt: new Date().toISOString(),
    };
    if (customMessage) {
      updates.message = customMessage;
    }
    await updateDoc(cardRef, updates);
  },

  /**
   * Counselee: Toggle public recognition consent
   */
  updateConsent: async (cardId: string, consent: boolean): Promise<void> => {
    const cardRef = doc(db, 'appreciations', cardId);
    await updateDoc(cardRef, { counseleeConsent: consent });
  },

  /**
   * Get all published appreciation cards (for community feed)
   */
  getPublishedAppreciations: async (): Promise<AppreciationCard[]> => {
    const q = query(
      collection(db, 'appreciations'),
      where('isPublished', '==', true),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => d.data() as AppreciationCard)
      .filter((c) => c.counseleeConsent !== false);
  },

  /**
   * Admin: Get all appreciation cards (including suggested & pending approval)
   */
  getAllAppreciations: async (): Promise<AppreciationCard[]> => {
    const q = query(collection(db, 'appreciations'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as AppreciationCard);
  },
};
