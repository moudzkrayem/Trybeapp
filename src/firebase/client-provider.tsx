
'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    return initializeFirebase();
  }, []);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices?.firebaseApp || null as any}
      auth={firebaseServices?.auth || null as any}
      firestore={firebaseServices?.firestore || null as any}
      storage={firebaseServices?.storage || null as any}
    >
      {children}
    </FirebaseProvider>
  );
}
