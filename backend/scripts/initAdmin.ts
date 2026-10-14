/**
 * SECURE ADMIN INITIALIZATION SCRIPT (Firebase Admin SDK)
 *
 * This script securely bootstraps the Counsellor / Administrator account.
 * As required by the security specification:
 * - The admin role must NEVER be assigned through an ordinary registration form.
 * - This script sets both the Firestore role='counsellor' with status='approved',
 *   and the Firebase Auth Custom User Claim: { role: 'counsellor' }.
 *
 * Usage:
 *   npx ts-node backend/scripts/initAdmin.ts <adminEmail> <adminPassword> <adminName> <adminPhone>
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

async function bootstrapAdmin() {
  const args = process.argv.slice(2);
  const email = args[0] || 'counsellor@iskcon.org';
  const password = args[1] || 'Sadhana@108';
  const displayName = args[2] || 'H.G. Counsellor Das';
  const phoneNumber = args[3] || '+919876543210';

  console.log(`[Admin Bootstrap] Initializing Admin Account for: ${email}`);

  if (!getApps().length) {
    initializeApp();
  }

  const auth = getAuth();
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
    console.log(`[Admin Bootstrap] Found existing Auth user (UID: ${userRecord.uid})`);
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      console.log(`[Admin Bootstrap] Creating new Firebase Auth user...`);
      userRecord = await auth.createUser({
        email,
        password,
        displayName,
        phoneNumber,
        emailVerified: true,
      });
      console.log(`[Admin Bootstrap] Created Auth user (UID: ${userRecord.uid})`);
    } else {
      throw err;
    }
  }

  // Set Custom Claims for cryptographic role enforcement
  await auth.setCustomUserClaims(userRecord.uid, {
    role: 'counsellor',
    admin: true,
  });
  console.log(`[Admin Bootstrap] Successfully attached Custom Claim: { role: 'counsellor' }`);

  // Write profile to Firestore
  const db = getFirestore();
  const nowIso = new Date().toISOString();
  await db.collection('users').doc(userRecord.uid).set(
    {
      uid: userRecord.uid,
      email,
      displayName,
      phoneNumber,
      role: 'counsellor',
      status: 'approved',
      declaredRounds: 16,
      publicAppreciationConsent: false,
      updatedAt: nowIso,
      createdAt: nowIso,
    },
    { merge: true }
  );

  console.log(`[Admin Bootstrap] Firestore document /users/${userRecord.uid} configured as APPROVED COUNSELLOR.`);
  console.log(`\n🎉 Admin account ready!\nEmail: ${email}\nPassword: ${password}\n`);
}

bootstrapAdmin().catch((err) => {
  console.error('[Admin Bootstrap] Error:', err);
  process.exit(1);
});
