// Mock AsyncStorage for Jest node environment
const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage[key] || null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete mockStorage[key];
    }),
    clear: jest.fn(async () => {
      Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    }),
    getAllKeys: jest.fn(async () => Object.keys(mockStorage)),
    multiGet: jest.fn(async (keys: string[]) => keys.map((k) => [k, mockStorage[k] || null])),
  },
}));

import { evaluateDailySadhana } from '../../utils/scoringEngine';
import { getDaysDifference, getBirthdayInYear } from '../../utils/dateUtils';
import { generateRandomCode } from '../invitationService';
import { authService } from '../authService';
import { localStorageService } from '../localStorageService';

describe('Service Logic and Integration Verification', () => {
  describe('Invitation Code Logic', () => {
    test('generates 8-character uppercase alphanumeric code without ambiguous characters (0, O, 1, I)', () => {
      const code = generateRandomCode(8);
      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[A-Z0-9]+$/);
      // Verify exclusions
      expect(code).not.toContain('0');
      expect(code).not.toContain('O');
      expect(code).not.toContain('1');
      expect(code).not.toContain('I');
    });

    test('generates unique codes across multiple invocations', () => {
      const codeSet = new Set<string>();
      for (let i = 0; i < 50; i++) {
        codeSet.add(generateRandomCode(8));
      }
      expect(codeSet.size).toBe(50);
    });
  });

  describe('Sadhana Audit History & Validation Logic', () => {
    test('rejects negative numbers and 0 declared round commitment', () => {
      const res = evaluateDailySadhana({
        declaredRounds: 0,
        completedRounds: 16,
        completionTimeStr: '06:00',
        readingMinutes: -5,
        hearingMinutes: 10,
      });

      expect(res.validationErrors.length).toBeGreaterThanOrEqual(2);
      expect(res.validationErrors).toContain('Declared round commitment must be at least 1 round.');
      expect(res.validationErrors).toContain('Reading duration cannot be negative.');
    });

    test('honors genuine zero score distinction', () => {
      const res = evaluateDailySadhana({
        declaredRounds: 16,
        completedRounds: 0,
        completionTimeStr: '',
        readingMinutes: 0,
        hearingMinutes: 0,
      });

      expect(res.dailyTotalScore).toBe(0);
      expect(res.isZeroScore).toBe(true);
      expect(res.grade).toBe('E');
    });
  });

  describe('Monitoring Alert Inactivity & Resolution Logic', () => {
    test('accurately triggers missing alert when days difference exceeds 3', () => {
      const lastSubmission = '2026-10-10';
      const today = '2026-10-14';
      const missingDays = getDaysDifference(lastSubmission, today);

      expect(missingDays).toBe(4);
      expect(missingDays > 3).toBe(true);
    });

    test('does not trigger missing alert when days difference is 3 or less', () => {
      const lastSubmission = '2026-10-12';
      const today = '2026-10-14';
      const missingDays = getDaysDifference(lastSubmission, today);

      expect(missingDays).toBe(2);
      expect(missingDays > 3).toBe(false);
    });
  });

  describe('Birthday Reminders & Leap Year Precision', () => {
    test('handles standard birthdays without leap year adjustment', () => {
      const res = getBirthdayInYear('1998-05-15', 2026);
      expect(res.dateString).toBe('2026-05-15');
      expect(res.isLeapAdjusted).toBe(false);
    });

    test('Feb 29 birthday maps to Feb 28 in non-leap year (2026)', () => {
      const res = getBirthdayInYear('2000-02-29', 2026);
      expect(res.dateString).toBe('2026-02-28');
      expect(res.isLeapAdjusted).toBe(true);
    });

    test('Feb 29 birthday remains Feb 29 in leap year (2028)', () => {
      const res = getBirthdayInYear('2000-02-29', 2028);
      expect(res.dateString).toBe('2028-02-29');
      expect(res.isLeapAdjusted).toBe(false);
    });
  });

  describe('Password Recovery Email Logic', () => {
    test('rejects invalid email formats', async () => {
      await expect(authService.sendPasswordReset('')).rejects.toThrow('valid email');
      await expect(authService.sendPasswordReset('invalidemail')).rejects.toThrow('valid email');
    });

    test('successfully processes reset request for registered devotee', async () => {
      const res = await authService.sendPasswordReset('devotee@iskcon.org');
      expect(res.success).toBe(true);
      expect(res.message).toContain('devotee@iskcon.org');
    });

    test('rejects password reset for unknown unregistered emails', async () => {
      await expect(authService.sendPasswordReset('unknown999@domain.org')).rejects.toThrow(
        'No registered account was found'
      );
    });
  });

  describe('Counselee Registration & Admin Persistence', () => {
    test('persists newly registered devotee into local storage and shows in pending list', async () => {
      const testDevotee = {
        uid: 'test_devotee_uid_108',
        email: 'newdevotee@iskcon.org',
        displayName: 'Sundar Das',
        phoneNumber: '+919876543299',
        role: 'counselee' as const,
        status: 'pending' as const,
        declaredRounds: 16,
        invitationCode: 'KRISHNA7',
        publicAppreciationConsent: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await localStorageService.saveUser(testDevotee, 'Secret@108');

      // Verify retrieval by email
      const retrieved = await localStorageService.getUserByEmail('newdevotee@iskcon.org');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.displayName).toBe('Sundar Das');
      expect(retrieved?.status).toBe('pending');

      // Verify presence in pending counselees
      const pendingList = await authService.getPendingCounselees();
      const match = pendingList.find((u) => u.email === 'newdevotee@iskcon.org');
      expect(match).toBeDefined();
      expect(match?.status).toBe('pending');

      // Approve devotee and verify update
      await authService.updateCounseleeStatus('test_devotee_uid_108', 'approved');
      const updatedUser = await localStorageService.getUser('test_devotee_uid_108');
      expect(updatedUser?.status).toBe('approved');
    });
  });
});
