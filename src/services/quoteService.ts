import * as Clipboard from 'expo-clipboard';
import { getTodayDateStringIST } from '../utils/dateUtils';

export interface DevotionalQuote {
  id: string;
  source: string; // e.g., 'Bhagavad-gītā 9.27' or 'Srila Prabhupada Lecture'
  sanskrit?: string;
  text: string;
  translation?: string;
  theme: string;
}

export const PRABHUPADA_DAILY_QUOTES: DevotionalQuote[] = [
  {
    id: 'bg-9-27',
    source: 'Bhagavad-gītā 9.27',
    sanskrit: 'yat karoṣi yad aśnāsi yaj juhoṣi dadāsi yat\nyat tapasyasi kaunteya tat kuruṣva mad-arpaṇam',
    text: 'Whatever you do, whatever you eat, whatever you offer or give away, and whatever austerities you perform — do that, O son of Kuntī, as an offering to Me.',
    theme: 'Devotional Surrender',
  },
  {
    id: 'sp-chant-attentive',
    source: 'Srila Prabhupada Letter, 1972',
    text: 'Of all the regulative principles, the most important is that you should always chant the Hare Krishna mantra attentively, sixteen rounds daily, without fail.',
    theme: 'Attentive Chanting',
  },
  {
    id: 'bg-18-65',
    source: 'Bhagavad-gītā 18.65',
    sanskrit: 'man-manā bhava mad-bhakto mad-yājī māṁ namaskuru\nmām evaiṣyasi satyaṁ te pratijāne priyo \'si me',
    text: 'Always think of Me, become My devotee, worship Me and offer your homage unto Me. Thus you will come to Me without fail. I promise you this because you are My very dear friend.',
    theme: 'Remembrance of Krishna',
  },
  {
    id: 'sp-morning-sadhana',
    source: 'Srila Prabhupada Morning Walk, 1975',
    text: 'Rise early, attend Mangala-arati, chant Hare Krishna, and study the Srimad-Bhagavatam. Then your life will be sublime, free from all anxiety of material existence.',
    theme: 'Brahma-Muhurta & Sadhana',
  },
  {
    id: 'bg-2-40',
    source: 'Bhagavad-gītā 2.40',
    sanskrit: 'nehābhikrama-nāśo \'sti pratyavāyo na vidyate\nsvalpam apy asya dharmasya trāyate mahato bhayāt',
    text: 'In this endeavor there is no loss or diminution, and a little advancement on this path can protect one from the most dangerous type of fear.',
    theme: 'Eternal Spiritual Advancement',
  },
  {
    id: 'sp-books-basis',
    source: 'Srila Prabhupada Instruction',
    text: 'Purity is the force, personal example is the weapon, and books are the basis. Read my books daily and discuss them with the devotees.',
    theme: 'Book Distribution & Reading',
  },
  {
    id: 'bg-6-47',
    source: 'Bhagavad-gītā 6.47',
    sanskrit: 'yoginām api sarveṣāṁ mad-gatenāntar-ātmanā\nśraddhāvān bhajate yo māṁ sa me yuktatamo mataḥ',
    text: 'And of all yogīs, the one with great faith who always abides in Me, thinks of Me within himself and renders transcendental loving service to Me — he is the most intimately united with Me in yoga.',
    theme: 'The Supreme Yogi',
  },
  {
    id: 'sp-enthusiasm',
    source: 'Nectar of Instruction, Verse 3 Purport',
    text: 'Utsāhāt — enthusiasm. In the beginning of devotional service, one must be very enthusiastic. Without enthusiasm, you cannot make any spiritual progress.',
    theme: 'Devotional Enthusiasm',
  },
  {
    id: 'bg-12-8',
    source: 'Bhagavad-gītā 12.8',
    sanskrit: 'mayy eva mana ādhatsva mayi buddhiṁ niveśaya\nnivasiṣyasi mayy eva ata ūrdhvaṁ na saṁśayaḥ',
    text: 'Just fix your mind upon Me, the Supreme Personality of Godhead, and engage all your intelligence in Me. Thus you will live in Me always, without a doubt.',
    theme: 'Fixing Mind on Krishna',
  },
  {
    id: 'sp-service-attitude',
    source: 'Srila Prabhupada Lecture, Vrindavan 1972',
    text: 'Krishna is the Supreme Proprietor, and we are His eternal servants. When we serve Him with unconditional love, all auspiciousness automatically follows.',
    theme: 'Humble Service Attitude',
  },
];

export const quoteService = {
  /**
   * Deterministically returns the Quote of the Day based on calendar day.
   * Ensures all devotees across Pune and world see the identical inspirational quote today.
   */
  getQuoteOfTheDay: (dateStr?: string): DevotionalQuote => {
    const today = dateStr || getTodayDateStringIST();
    // Hash date string to get an index
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
      hash = (hash * 31 + today.charCodeAt(i)) % 100000;
    }
    const idx = Math.abs(hash) % PRABHUPADA_DAILY_QUOTES.length;
    return PRABHUPADA_DAILY_QUOTES[idx];
  },

  /**
   * Copies formatted quote to clipboard for sharing on WhatsApp or SMS
   */
  copyQuoteToClipboard: async (quote: DevotionalQuote): Promise<boolean> => {
    try {
      const formatted = `*Daily Devotional Inspiration*\n\n"${quote.text}"\n\n— *${quote.source}*\n(Bhakti Unnati - ISKCON Sadhana)`;
      await Clipboard.setStringAsync(formatted);
      return true;
    } catch {
      return false;
    }
  },
};
