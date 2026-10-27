'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth';

/** Initiate anonymous sign-in. */
export async function initiateAnonymousSignIn(authInstance: Auth) {
  return signInAnonymously(authInstance);
}

/** Initiate email/password sign-up. */
export async function initiateEmailSignUp(authInstance: Auth, email: string, password: string) {
  return createUserWithEmailAndPassword(authInstance, email, password);
}

/** Initiate email/password sign-in. */
export async function initiateEmailSignIn(authInstance: Auth, email: string, password: string) {
  return signInWithEmailAndPassword(authInstance, email, password);
}

/** Signs out the current user. */
export async function signOutUser(authInstance: Auth) {
  return signOut(authInstance);
}

/** Initiate Google sign-in. Returns a promise as popups require async handling. */
export async function initiateGoogleSignIn(authInstance: Auth) {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account'
  });

  return signInWithPopup(authInstance, provider);
}

/** Initiate Google sign-in using redirect for more robust behavior in some external browsers. */
export async function initiateGoogleSignInWithRedirect(authInstance: Auth) {
  const provider = new GoogleAuthProvider();
  return signInWithRedirect(authInstance, provider);
}
