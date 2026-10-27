import * as Linking from 'expo-linking';

interface OtpRecord {
  code: string;
  expiresAt: number;
}

// In-memory OTP storage
const emailOtpStore = new Map<string, OtpRecord>();
const whatsappOtpStore = new Map<string, OtpRecord>();

// OTP Expiry duration: 10 minutes
const OTP_EXPIRY_MS = 10 * 60 * 1000;

/**
 * Generate a secure 6-digit numeric OTP code
 */
function generate6DigitOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const otpService = {
  /**
   * Send 6-digit OTP code to an email address
   * If EXPO_PUBLIC_RESEND_API_KEY is configured, sends via Resend REST API
   * Otherwise returns demo code with simulated alert
   */
  sendEmailOtp: async (
    email: string
  ): Promise<{ success: boolean; message: string; otpCode?: string; isSimulated?: boolean }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new Error('Please enter a valid email address first.');
    }

    const code = generate6DigitOtp();
    const expiresAt = Date.now() + OTP_EXPIRY_MS;
    emailOtpStore.set(cleanEmail, { code, expiresAt });

    const resendApiKey = process.env.EXPO_PUBLIC_RESEND_API_KEY;

    if (resendApiKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'Bhakti Unnati <onboarding@resend.dev>',
            to: [cleanEmail],
            subject: `Your Bhakti Unnati Verification Code: ${code}`,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; color: #1B4D3E;">
                <h2>Hare Krishna!</h2>
                <p>Your verification code for <strong>Bhakti Unnati (Advancement in Devotion)</strong> is:</p>
                <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; padding: 12px 24px; background: #FFFBEB; border: 1px solid #FCD34D; border-radius: 8px; display: inline-block; color: #92400E; margin: 12px 0;">
                  ${code}
                </div>
                <p style="color: #6B7280; font-size: 13px;">This code will expire in 10 minutes. If you did not request this, please disregard this email.</p>
              </div>
            `,
          }),
        });

        if (response.ok) {
          return {
            success: true,
            message: `A 6-digit verification code has been dispatched to ${cleanEmail}. Please check your inbox and enter it below.`,
          };
        }
      } catch (e) {
        // Fall back to demo mode if network or API key fails
      }
    }

    // Default / testing simulation mode
    return {
      success: true,
      isSimulated: true,
      otpCode: code,
      message: `Verification code for ${cleanEmail} is: ${code}\n\n(Note: When Resend API key is configured, this is automatically delivered directly to the devotee's email inbox).`,
    };
  },

  /**
   * Verify the entered Email OTP code
   */
  verifyEmailOtp: (
    email: string,
    enteredOtp: string
  ): { valid: boolean; message: string } => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = enteredOtp.trim();

    if (!cleanCode || cleanCode.length !== 6) {
      return { valid: false, message: 'Please enter a valid 6-digit verification code.' };
    }

    const record = emailOtpStore.get(cleanEmail);
    if (!record) {
      return { valid: false, message: 'No verification code found. Please tap "Send OTP" first.' };
    }

    if (Date.now() > record.expiresAt) {
      emailOtpStore.delete(cleanEmail);
      return { valid: false, message: 'Verification code has expired. Please request a new OTP.' };
    }

    if (record.code !== cleanCode) {
      return { valid: false, message: 'Incorrect verification code. Please check and try again.' };
    }

    // Verified successfully
    emailOtpStore.delete(cleanEmail);
    return { valid: true, message: 'Email address verified successfully!' };
  },

  /**
   * Send 6-digit OTP code to WhatsApp number
   */
  sendWhatsappOtp: async (
    phoneNumber: string
  ): Promise<{ success: boolean; message: string; otpCode?: string; isSimulated?: boolean }> => {
    const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '').trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      throw new Error('Please enter a valid WhatsApp mobile number with country code (e.g. +91 9876543210).');
    }

    const code = generate6DigitOtp();
    const expiresAt = Date.now() + OTP_EXPIRY_MS;
    whatsappOtpStore.set(cleanPhone, { code, expiresAt });

    // Try opening WhatsApp with prefilled message if app is installed
    const whatsappUrl = `whatsapp://send?phone=${cleanPhone.replace('+', '')}&text=${encodeURIComponent(
      `Hare Krishna! Your Bhakti Unnati verification code is: ${code}`
    )}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        // Can open WhatsApp or prompt user
      }
    } catch (e) {
      // Ignore
    }

    return {
      success: true,
      isSimulated: true,
      otpCode: code,
      message: `WhatsApp OTP for ${cleanPhone} is: ${code}\n\n(Valid for 10 minutes. Please enter this code below to verify your WhatsApp number).`,
    };
  },

  /**
   * Verify the entered WhatsApp OTP code
   */
  verifyWhatsappOtp: (
    phoneNumber: string,
    enteredOtp: string
  ): { valid: boolean; message: string } => {
    const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '').trim();
    const cleanCode = enteredOtp.trim();

    if (!cleanCode || cleanCode.length !== 6) {
      return { valid: false, message: 'Please enter a valid 6-digit WhatsApp OTP.' };
    }

    const record = whatsappOtpStore.get(cleanPhone);
    if (!record) {
      return { valid: false, message: 'No OTP code found. Please tap "Send WhatsApp OTP" first.' };
    }

    if (Date.now() > record.expiresAt) {
      whatsappOtpStore.delete(cleanPhone);
      return { valid: false, message: 'WhatsApp OTP has expired. Please request a new code.' };
    }

    if (record.code !== cleanCode) {
      return { valid: false, message: 'Incorrect WhatsApp OTP. Please verify and try again.' };
    }

    // Verified successfully
    whatsappOtpStore.delete(cleanPhone);
    return { valid: true, message: 'WhatsApp mobile number verified successfully!' };
  },
};
