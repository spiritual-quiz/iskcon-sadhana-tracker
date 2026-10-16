# ISKCON Sadhana Tracker & Counselling Android Application

A complete, production-oriented Android mobile application built with **React Native, Expo SDK 57, React 19, and TypeScript**, backed by **Firebase Authentication** and **Cloud Firestore**.

Designed specifically for ISKCON devotees and their counsellor to record daily sadhana, automatically calculate marks and grades in the **Asia/Kolkata (IST)** time zone, review detailed reports, monitor devotional consistency, and encourage steady spiritual progress.

---

## 1. Application Highlights & Features

- **Devotional Design System**: High-contrast, peaceful deep green (`#1B4D3E`), temple gold (`#D4AF37`), cream (`#FDFBF7`), and white palette with sacred mantra branding.
- **Strict Scoring Engine**:
  - **Japa Chanting (Max 10 Marks)**:
    - Before 7:00 AM → **10 Marks**
    - 7:00 AM to before 10:00 AM → **5 Marks** (7:00 AM boundary = 5)
    - 10:00 AM to before 1:00 PM → **3 Marks** (10:00 AM boundary = 3)
    - 1:00 PM or later → **1 Mark** (1:00 PM boundary = 1)
    - Incomplete daily commitment → **0 Marks** (retains honest round count)
  - **Srila Prabhupada Book Reading (Max 10 Marks)**: Proportionate scoring: $\min(10, \frac{\text{minutes}}{30} \times 10)$. 30+ mins = 10 marks.
  - **Spiritual Hearing (Max 10 Marks)**: Lectures & audio discourses: $\min(10, \frac{\text{minutes}}{30} \times 10)$. 30+ mins = 10 marks.
  - **Sleep, Wake-up & Daytime Rest**: Calculated overnight rest duration crossing midnight (e.g. 21:30 to 04:00 = 6.5h) with zero impact on score.
  - **Daily Total**: Out of 30 marks, calculated percentage and grades (A: $\ge 90\%$, B: $80-89.9\%$, C: $70-79.9\%$, D: $60-69.9\%$, E: $<60\%$).
- **Weekly & Monthly Programmes**:
  - Weekly Class: 10 marks.
  - Weekly Morning Programme with Maṅgala-ārati: 10 marks.
  - Monthly Satsanga: 10 marks.
  - Total Weekly Score out of 230 marks.
- **Counselee Registration via Invitation & QR Code**:
  - Counsellor generates 8-character invitation codes and QR codes with expiry dates and usage limits.
  - Counselees register with code and enter dynamic profile (DOB, ISKCON connection date, declared rounds).
  - New counselees enter `pending` status awaiting counsellor approval.
  - Role tampering is prevented by server-side Firebase Security Rules.
- **Strict Privacy Boundaries**:
  - Counselees see their own detailed daily, weekly, and monthly reports.
  - Community view displays only permitted weekly/monthly aggregates (score, rounds, reading/hearing, approved appreciation).
  - Private sleep times, phone numbers, and dates of birth are NEVER exposed to other counselees.
- **Counsellor Dashboard (12 Sections)**:
  1. Executive Overview Strip
  2. Manage Counselees (search, filters, enable/disable)
  3. Pending Registrations (one-click approve/reject)
  4. Invitations & QR Codes (create, view QR, copy, revoke)
  5. Sadhana Monitoring (>3 days missing card alerts, <60% low score flags)
  6. Daily Reports Audit
  7. Weekly Reports & Attendance
  8. Monthly Reports & Satsanga
  9. Birthday Reminders (dynamic turning age, Feb 29 leap-year handling)
  10. Follow-up History (audit log of outreach)
  11. Sadhana Appreciation (review and publish recognition cards)
  12. Settings & Export (configurable thresholds, full JSON export)
- **One-Click Devotee Outreach**:
  - Pre-composed encouraging message templates (Missing Card, Meeting Invite, General Encouragement).
  - Dispatches directly via **WhatsApp**, **SMS**, **Email**, or **In-App** notification.

---

## 2. Beginner-Friendly Windows Setup Guide

### Prerequisites
1. **Node.js**: Install Node.js LTS (v20+ or v24+) from [nodejs.org](https://nodejs.org).
2. **Git**: Install Git for Windows from [git-scm.com](https://git-scm.com).
3. **Expo Go (Optional for live phone preview)**: Install Expo Go from Google Play Store on your Android phone.

### Installation
Open **PowerShell** or Command Prompt and run:

```powershell
# Navigate to the project directory
cd C:\Users\BvRv2\.gemini\antigravity\scratch\iskcon-sadhana-tracker

# Install dependencies (already executed)
npm install

# Run automated unit test suite
npm test
```

All 39 unit and integration tests will execute and pass:
```text
PASS src/utils/__tests__/scoringEngine.test.ts
PASS src/services/__tests__/services.test.ts
Test Suites: 2 passed, 2 total
Tests:       39 passed, 39 total
```

---

## 3. Firebase Project Configuration

1. Visit the [Firebase Console](https://console.firebase.google.com/) and create a new project called `iskcon-sadhana-tracker`.
2. **Enable Firebase Authentication**:
   - Go to **Build** → **Authentication** → **Sign-in method**.
   - Enable **Email/Password**.
3. **Create Cloud Firestore Database**:
   - Go to **Build** → **Firestore Database** → **Create database**.
   - Start in production mode and choose region `asia-south1` (Mumbai) for optimal latency in India.
4. **Deploy Security Rules**:
   - Copy the contents of `backend/firestore.rules` into the Firebase Console Rules tab, or deploy via Firebase CLI:
     ```bash
     firebase deploy --only firestore:rules,firestore:indexes
     ```
5. **Get Client Credentials**:
   - Go to **Project Settings** (gear icon) → **General** → **Your apps** → Click the Android icon or Web icon `</>`.
   - Copy your credentials into a `.env` file in the project root:
     ```env
     EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
     EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
     EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project
     EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
     EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=102938475610
     EXPO_PUBLIC_FIREBASE_APP_ID=1:102938475610:android:a1b2c3d4e5f6
     ```

---

## 4. Secure Administrator Initialization

As mandated by the security specification, the Counsellor/Admin account **must never be registered through an ordinary mobile sign-up form**.

Run the trusted bootstrap script using Firebase Admin SDK:

```powershell
npx ts-node backend/scripts/initAdmin.ts madhavcarandas@gmail.com "Sadhana@108" "Madhav Charan Das" "+919876543210"
```

This script:
1. Creates the user record in Firebase Authentication.
2. Attaches the cryptographic Firebase Custom Claim `{ role: 'counsellor' }`.
3. Configures `/users/<uid>` with `role: 'counsellor'` and `status: 'approved'`.

---

## 5. Building the Standalone Android APK

The project is pre-configured with `eas.json` to generate an installable standalone Android APK (not just an App Bundle), so counselees can install it directly without the Google Play Store.

### Step 1: Install EAS CLI
```powershell
npm install -g eas-cli
```

### Step 2: Login to Expo Account
```powershell
eas login
```
*(If you do not have an Expo account, create a free one at [expo.dev](https://expo.dev)).*

### Step 3: Configure Project & Build APK
```powershell
# Configure project ID
eas build:configure

# Build the installable preview APK
eas build --platform android --profile preview
```

### Step 4: Download and Distribute
Once the build finishes:
1. EAS provides a direct download link and QR code in your terminal.
2. Download the `.apk` file (e.g. `iskcon-sadhana-tracker.apk`).
3. Send the APK to counselees via **WhatsApp**, **Google Drive**, or **Telegram**.
4. Counselees tap the APK on their Android phone and select **Install**.

---

## 6. Counsellor & Counselee Workflow Summary

### Counsellor First-Time Setup
1. Log in with the administrator credentials created by `initAdmin.ts`.
2. Tap **Invitations & QR** → **Generate New Invitation Code**.
3. Choose usage limit (e.g. 50 devotees) and expiry (e.g. 30 days).
4. Tap **Show QR** or **Copy Code** and share it with your counselees on WhatsApp.

### Counselee Registration
1. Counselee installs and opens the APK.
2. Selects **Register Here**.
3. Enters the invitation code (e.g. `KRISHNA7`).
4. Enters their name, phone, email, password, date of birth, ISKCON connection date, and declared round commitment (e.g. 16).
5. Submits registration.
6. The app displays the **Awaiting Approval** screen.

### Counsellor Approval
1. Counsellor opens **Pending Approvals** on their dashboard.
2. Reviews the devotee's details.
3. Taps **Approve Devotee**.
4. The counselee taps **Check Approval Status** on their phone and is immediately taken to their **Sadhana Dashboard**!

---

## 7. Daily Sadhana Check-in & Monitoring

1. Every day, counselees open **Sadhana** and enter:
   - Completed rounds & completion time (e.g. `06:30`).
   - Book reading minutes & lecture hearing minutes.
   - Sleep time (e.g. `21:30`) and wake-up time (e.g. `04:00`).
2. Score is calculated in real time out of 30 marks.
3. If a counselee does not submit a card for **more than 3 consecutive calendar days**, the counsellor receives an automated alert in **Sadhana Monitoring**.
4. The counsellor taps **Contact Devotee** and chooses **Send via WhatsApp** with a prefilled, loving devotional message.
5. All follow-ups are preserved in the **Follow-up History** audit log.

---

## 8. Preserving Updates & Data Safety

- **Package ID**: The stable Android package identifier is fixed to `org.iskcon.sadhanatracker` in `app.json`.
- **Future APK Releases**: When releasing updates, simply increment `versionCode` in `app.json` (e.g. to `2`) and run `eas build --platform android --profile preview`.
- Devotees can install the new APK over the existing installation without losing any historical sadhana entries or profile data.
