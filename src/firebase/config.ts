function resolveAuthDomain(): string {
  if (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) {
    return process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('usetrybe.com')) {
      return 'usetrybe.com';
    }
  }
  return 'usetrybe.com';
}

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCA72Typh7SHsafWahTNidRJnCeMuCy5XA",
  authDomain: resolveAuthDomain(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-586593360-b85c9",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "studio-586593360-b85c9.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1017159379293",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1017159379293:web:138d5fd696083f183a20b4",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-XM1CZ925MW",
};
