export type AlertType = 'low_score' | 'missing_card' | 'declining_consistency';
export type AlertStatus = 'open' | 'resolved';

export interface MonitoringAlert {
  id: string;
  userId: string;
  counseleeName: string;
  alertType: AlertType;
  severity: 'info' | 'warning' | 'urgent';
  title: string;
  description: string;
  lastSubmissionDate?: string; // YYYY-MM-DD
  consecutiveMissingDays?: number;
  currentWeeklyScore?: number;
  status: AlertStatus;
  createdAt: string;
  resolvedAt?: string;
}

export type FollowUpChannel = 'in_app' | 'whatsapp' | 'sms' | 'email';
export type DeliveryStatus = 'prepared' | 'sent' | 'delivered' | 'failed';

export interface FollowUpRecord {
  id: string;
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
  createdAt: string;
}

export interface InvitationCode {
  code: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string; // ISO string
  maxUses: number;
  usedCount: number;
  isRevoked: boolean;
  usedByUids: string[];
  notes?: string;
}

export interface BirthdayReminder {
  id: string; // `${userId}_${year}`
  userId: string;
  counseleeName: string;
  counseleePhone?: string;
  counseleeEmail?: string;
  dateOfBirth: string; // YYYY-MM-DD
  reminderDate: string; // YYYY-MM-DD of current year
  turningAge: number;
  isLeapYearSpecial: boolean; // 29 Feb handled as 28 Feb
  isNotified: boolean;
  notifiedAt?: string;
}
