'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';

let analyticsInstance: Analytics | null = null;

/**
 * Initializes Firebase and returns the core SDK instances.
 * Follows Firebase App Hosting automatic config detection with fallback to NEXT_PUBLIC_* env vars.
 */
export function initializeFirebase() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (getApps().length > 0) {
    return getSdks(getApp());
  }

  try {
    let firebaseApp: FirebaseApp;
    try {
      // 1. In Firebase App Hosting, environment provides configuration automatically without args
      firebaseApp = initializeApp();
    } catch (_autoErr) {
      // 2. In local dev or other environments, fallback to explicit config from process.env
      firebaseApp = initializeApp(firebaseConfig);
    }
    return getSdks(firebaseApp);
  } catch (e) {
    console.error("Firebase initialization failed:", e);
    // Returning null allows the FirebaseProvider to set services as unavailable
    // rather than letting the whole app crash on a hard throw.
    return null;
  }
}

/**
 * Helper to get SDK instances from a FirebaseApp.
 */
export function getSdks(firebaseApp: FirebaseApp) {
  if (typeof window !== 'undefined' && !analyticsInstance) {
    isSupported().then((supported) => {
      if (supported) {
        try {
          analyticsInstance = getAnalytics(firebaseApp);
        } catch (_err) {
          // Analytics non-blocking fallback
        }
      }
    }).catch(() => {});
  }

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp),
    analytics: analyticsInstance
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
