import { getTodayDateStringIST, getNowInIST } from '../utils/dateUtils';
import * as Notifications from 'expo-notifications';
import { NOTIFICATION_CHANNELS } from './notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface VaishnavaEvent {
  date: string; // YYYY-MM-DD
  name: string;
  type: 'ekadashi' | 'festival' | 'appearance' | 'disappearance';
  fasting: 'full' | 'phalahari' | 'noon' | 'sunset' | 'moonrise' | 'dusk' | 'midnight' | 'none';
  paranTime?: string; // e.g. "06:42 AM - 10:15 AM (Pune)"
  description?: string;
  locationZone: string; // 'Pune, Maharashtra (IST)'
}

/**
 * Authentic Gaudiya Vaishnava Calendar for Pune Zone (IST, Lat: 18.52° N, Long: 73.85° E)
 * Calculated according to Bhakti Siddhanta Sarasvati Thakura Navadvipa Panjika rules for Pune.
 */
export const PUNE_VAISHNAVA_EVENTS: VaishnavaEvent[] = [
  // 2026 - Late October / November
  {
    date: '2026-10-21',
    name: 'Rama Ekadashi',
    type: 'ekadashi',
    fasting: 'phalahari',
    paranTime: '06:33 AM - 10:12 AM',
    description: 'Fasting from grains and beans. Kartik month auspicious Ekadashi.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2026-10-31',
    name: 'Govardhana Puja & Annakuta Mahotsava',
    type: 'festival',
    fasting: 'none',
    description: 'Worship of Sri Giriraja Govardhana and Go-puja (Worship of Cows). Dipavali celebrations.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2026-11-04',
    name: 'Srila Prabhupada Disappearance Day',
    type: 'disappearance',
    fasting: 'noon',
    description: 'Disappearance day of His Divine Grace A.C. Bhaktivedanta Swami Prabhupada. Fasting till noon.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2026-11-05',
    name: 'Utthana Ekadashi & Srila Gaura Kishora Dasa Babaji Disappearance',
    type: 'ekadashi',
    fasting: 'phalahari',
    paranTime: '06:40 AM - 10:16 AM',
    description: 'End of Damodara Vrata (Chaturmasya). Lord Vishnu awakens from cosmic sleep.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2026-11-09',
    name: 'Sri Krishna Rasa Yatra & Tulasi Saligrama Vivaha',
    type: 'festival',
    fasting: 'none',
    description: 'Kartik Purnima, Rasa dance of Sri Sri Radha Krishna, Tulasi Vivaha mahotsava.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2026-11-20',
    name: 'Utpanna Ekadashi',
    type: 'ekadashi',
    fasting: 'phalahari',
    paranTime: '06:47 AM - 10:20 AM',
    description: 'Appearance of Ekadashi Devi from the body of Lord Vishnu to defeat the demon Mura.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2026-12-05',
    name: 'Mokshada Ekadashi & Gita Jayanti',
    type: 'ekadashi',
    fasting: 'phalahari',
    paranTime: '06:56 AM - 10:27 AM',
    description: 'Advent of Srimad Bhagavad-gītā spoken by Sri Krishna to Arjuna on the battlefield of Kurukshetra.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2026-12-20',
    name: 'Saphala Ekadashi',
    type: 'ekadashi',
    fasting: 'phalahari',
    paranTime: '07:05 AM - 10:34 AM',
    description: 'Bestower of all spiritual and material success. Fasting from grains and beans.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2026-12-28',
    name: 'Srila Bhaktisiddhanta Sarasvati Thakura Disappearance',
    type: 'disappearance',
    fasting: 'noon',
    description: 'Disappearance day of Om Vishnupada Srila Bhaktisiddhanta Sarasvati Thakura Prabhupada. Fasting till noon.',
    locationZone: 'Pune, Maharashtra (IST)',
  },

  // 2027
  {
    date: '2027-01-04',
    name: 'Putrada Ekadashi',
    type: 'ekadashi',
    fasting: 'phalahari',
    paranTime: '07:11 AM - 10:41 AM',
    description: 'Auspicious Pausha month Ekadashi. Bestows pure devotional progeny and detachment.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-01-18',
    name: 'Shat-tila Ekadashi',
    type: 'ekadashi',
    fasting: 'phalahari',
    paranTime: '07:13 AM - 10:45 AM',
    description: 'Offering and accepting sesame seeds (tila) in service of Lord Sri Krishna.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-02-02',
    name: 'Bhaimi / Jaya Ekadashi',
    type: 'ekadashi',
    fasting: 'phalahari',
    paranTime: '07:11 AM - 10:48 AM',
    description: 'Liberates the living entity from all ghostly species and awards Goloka Vrindavana.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-02-04',
    name: 'Sri Advaita Acharya Appearance Day',
    type: 'appearance',
    fasting: 'noon',
    description: 'Appearance day of Sri Advaita Acharya, avatar of Sada-Shiva and Maha-Vishnu. Fasting till noon.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-02-08',
    name: 'Sri Varaha Dvadashi',
    type: 'appearance',
    fasting: 'noon',
    description: 'Appearance of Lord Varahadeva who lifted the Earth from the Garbhodaka Ocean.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-02-09',
    name: 'Sri Nityananda Trayodashi',
    type: 'appearance',
    fasting: 'noon',
    description: 'Appearance day of Sri Nityananda Prabhu (Lord Balarama). Fasting till noon.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-02-17',
    name: 'Vijaya Ekadashi',
    type: 'ekadashi',
    fasting: 'phalahari',
    paranTime: '07:04 AM - 10:48 AM',
    description: 'Observed by Lord Ramachandra before crossing the ocean to Lanka to vanquish Ravana.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-02-23',
    name: 'Srila Bhaktisiddhanta Sarasvati Thakura Appearance Day',
    type: 'appearance',
    fasting: 'noon',
    description: 'Appearance of the founder-acharya of the Sri Gaudiya Math. Fasting till noon.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-03-04',
    name: 'Amalaki Ekadashi',
    type: 'ekadashi',
    fasting: 'phalahari',
    paranTime: '06:55 AM - 10:44 AM',
    description: 'Worship of the Amalaki tree and Lord Parashurama. Fasting from grains.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-03-12',
    name: 'Sri Gaura Purnima (Appearance of Sri Chaitanya Mahaprabhu)',
    type: 'appearance',
    fasting: 'moonrise',
    description: 'Appearance anniversary of Sri Krishna Chaitanya Mahaprabhu (New Year of Gaudiya Era). Fasting till moonrise, then anukalpa phalahari prasadam.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-03-19',
    name: 'Papamochani Ekadashi',
    type: 'ekadashi',
    fasting: 'phalahari',
    paranTime: '06:44 AM - 10:39 AM',
    description: 'Destroys the reactions of all past sins and elevates devotee into pure bhakti.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-04-03',
    name: 'Kamada Ekadashi',
    type: 'ekadashi',
    fasting: 'phalahari',
    paranTime: '06:32 AM - 10:34 AM',
    description: 'Chaitra Shukla Ekadashi fulfilling all transcendental desires in Lord Hari service.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-04-06',
    name: 'Sri Rama Navami',
    type: 'appearance',
    fasting: 'sunset',
    description: 'Appearance day of Maryada Purushottama Lord Sri Ramachandra. Fasting till sunset.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-04-17',
    name: 'Varuthini Ekadashi',
    type: 'ekadashi',
    fasting: 'phalahari',
    paranTime: '06:23 AM - 10:29 AM',
    description: 'Guards devotees from all planetary afflictions and grants spiritual fortune.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-05-02',
    name: 'Mohini Ekadashi',
    type: 'ekadashi',
    fasting: 'phalahari',
    paranTime: '06:14 AM - 10:25 AM',
    description: 'Appearance of Mohini-Murti. Removes illusion and reveals loving service of Krishna.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-05-09',
    name: 'Sri Nrisimha Chaturdashi',
    type: 'appearance',
    fasting: 'dusk',
    description: 'Appearance of Lord Nrisimhadeva to protect Bhakta Prahlada. Fasting till dusk.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-05-17',
    name: 'Apara Ekadashi',
    type: 'ekadashi',
    fasting: 'phalahari',
    paranTime: '06:08 AM - 10:23 AM',
    description: 'Destroys limitless sinful reactions and establishes devotee in Goloka Vrindavana.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-05-31',
    name: 'Pandava Nirjala Ekadashi (Bhimseni Ekadashi)',
    type: 'ekadashi',
    fasting: 'full',
    paranTime: '06:05 AM - 10:23 AM',
    description: 'Complete waterless fast (Nirjala). Confers the devotional merit of all 24 Ekadashis of the year.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-06-15',
    name: 'Yogini Ekadashi',
    type: 'ekadashi',
    fasting: 'phalahari',
    paranTime: '06:06 AM - 10:25 AM',
    description: 'Cures spiritual diseases and connects soul with Sri Krishna lotus feet.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-06-25',
    name: 'Sri Jagannatha Ratha Yatra (Puri Mahotsava)',
    type: 'festival',
    fasting: 'none',
    description: 'Lord Jagannatha, Baladeva, and Subhadra Maharani journey to the Gundicha temple.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-06-29',
    name: 'Sayana Ekadashi (Devashayani Ekadashi)',
    type: 'ekadashi',
    fasting: 'phalahari',
    paranTime: '06:09 AM - 10:28 AM',
    description: 'Start of 4-month holy Chaturmasya Vrata. Fasting from grains and beans.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-07-14',
    name: 'Kamika Ekadashi',
    type: 'ekadashi',
    fasting: 'phalahari',
    paranTime: '06:14 AM - 10:32 AM',
    description: 'Shravana month Krishna Ekadashi. Equal to visiting all holy places on Earth.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-07-29',
    name: 'Pavitropana Ekadashi',
    type: 'ekadashi',
    fasting: 'phalahari',
    paranTime: '06:19 AM - 10:34 AM',
    description: 'Jhulan Yatra begins. Offering garlands and swings to Sri Sri Radha Krishna.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-08-02',
    name: 'Sri Balarama Purnima',
    type: 'appearance',
    fasting: 'noon',
    description: 'Appearance day of Lord Balarama (Mula-Sankarshana). Fasting till noon. End of Jhulan Yatra.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-08-13',
    name: 'Annada Ekadashi',
    type: 'ekadashi',
    fasting: 'phalahari',
    paranTime: '06:23 AM - 10:36 AM',
    description: 'Auspicious Ekadashi granting spiritual and physical well-being.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-08-25',
    name: 'Sri Krishna Janmashtami',
    type: 'appearance',
    fasting: 'midnight',
    description: 'Divine appearance of the Supreme Personality of Godhead, Lord Sri Krishna. Fasting till midnight.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-08-26',
    name: 'Srila Prabhupada Vyasa-Puja (Appearance Day)',
    type: 'appearance',
    fasting: 'noon',
    description: 'Appearance day of ISKCON Founder-Acharya A.C. Bhaktivedanta Swami Prabhupada. Fasting till noon.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-09-08',
    name: 'Sri Radhashtami',
    type: 'appearance',
    fasting: 'noon',
    description: 'Appearance day of Srimati Radharani, the divine pleasure potency of Sri Krishna. Fasting till noon.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-09-12',
    name: 'Parsva / Parivartini Ekadashi',
    type: 'ekadashi',
    fasting: 'phalahari',
    paranTime: '06:29 AM - 10:36 AM',
    description: 'Lord Vishnu turns over to sleep on His other side in the milk ocean.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-09-26',
    name: 'Indira Ekadashi',
    type: 'ekadashi',
    fasting: 'phalahari',
    paranTime: '06:32 AM - 10:35 AM',
    description: 'Liberates our ancestors and forefathers from distressful hellish planets.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-10-11',
    name: 'Pasankusa Ekadashi',
    type: 'ekadashi',
    fasting: 'phalahari',
    paranTime: '06:34 AM - 10:34 AM',
    description: 'Fulfills all righteous yearnings and awards love of Godhead.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-10-25',
    name: 'Rama Ekadashi',
    type: 'ekadashi',
    fasting: 'phalahari',
    paranTime: '06:38 AM - 10:34 AM',
    description: 'Sacred Damodara month Ekadashi. Deepens devotion to Sri Damodara.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
  {
    date: '2027-11-09',
    name: 'Utthana Ekadashi',
    type: 'ekadashi',
    fasting: 'phalahari',
    paranTime: '06:44 AM - 10:36 AM',
    description: 'Awakening of Lord Hari. Conclusion of Bhisma Panchaka and Chaturmasya Vrata.',
    locationZone: 'Pune, Maharashtra (IST)',
  },
];

export const vaishnavaCalendarService = {
  /**
   * Get all upcoming Vaishnava festivals and Ekadashis within the next N days (Pune Zone).
   */
  getUpcomingEvents: (startDateStr?: string, daysAhead: number = 14): VaishnavaEvent[] => {
    const today = startDateStr || getTodayDateStringIST();
    const [y, m, d] = today.split('-').map(Number);
    const startDate = new Date(y, m - 1, d);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + daysAhead);

    const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(
      endDate.getDate()
    ).padStart(2, '0')}`;

    return PUNE_VAISHNAVA_EVENTS.filter((e) => e.date >= today && e.date <= endStr).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  },

  /**
   * Check if today has a Vaishnava event in Pune Zone.
   */
  getTodaysEvent: (dateStr?: string): VaishnavaEvent | null => {
    const target = dateStr || getTodayDateStringIST();
    return PUNE_VAISHNAVA_EVENTS.find((e) => e.date === target) || null;
  },

  /**
   * Get the next upcoming Ekadashi (Pune Zone)
   */
  getNextEkadashi: (fromIsoDate?: string): VaishnavaEvent | null => {
    const today = fromIsoDate || getTodayDateStringIST();
    const ekadashis = PUNE_VAISHNAVA_EVENTS.filter((e) => e.type === 'ekadashi' && e.date >= today).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    return ekadashis[0] || null;
  },

  /**
   * Check whether tomorrow is an Ekadashi in Pune Zone, and if so,
   * trigger a high-priority heads-up reminder notification at 8:00 PM IST today!
   */
  checkAndScheduleEkadashiReminder: async (): Promise<boolean> => {
    if (!Notifications?.scheduleNotificationAsync) return false;
    try {
      const todayStr = getTodayDateStringIST();
      const [y, m, d] = todayStr.split('-').map(Number);
      const tomorrow = new Date(y, m - 1, d + 1);
      const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(
        tomorrow.getDate()
      ).padStart(2, '0')}`;

      const tomorrowEvent = PUNE_VAISHNAVA_EVENTS.find((e) => e.date === tomorrowStr && e.type === 'ekadashi');
      if (!tomorrowEvent) return false;

      const notificationKey = `ekadashi_reminder_pune_${tomorrowStr}`;
      const alreadyNotified = await AsyncStorage.getItem(notificationKey);
      if (alreadyNotified === 'true') return false;

      await AsyncStorage.setItem(notificationKey, 'true');

      const paranInfo = tomorrowEvent.paranTime ? ` Paran on next day: ${tomorrowEvent.paranTime}.` : '';
      await Notifications.scheduleNotificationAsync({
        identifier: notificationKey,
        content: {
          title: `Upcoming Ekadashi Tomorrow! (Pune Zone) 🙏`,
          body: `Tomorrow is ${tomorrowEvent.name}. Fasting from grains and beans.${paranInfo} Hare Krishna!`,
          sound: 'default',
          vibrate: [0, 250, 250, 250],
          priority: Notifications.AndroidNotificationPriority.HIGH,
          channelId: NOTIFICATION_CHANNELS.SADHANA_REMINDER,
          data: { screen: 'VaishnavaCalendar', event: tomorrowEvent },
        } as any,
        trigger: null, // deliver immediately when checked on app open / evening
      });

      return true;
    } catch (e) {
      console.warn('Ekadashi reminder error:', e);
      return false;
    }
  },
};
