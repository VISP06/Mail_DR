import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  reauthenticateWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore (default database)
export const db = getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

// Always use Firebase browserLocalPersistence
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error('[Auth] Failed to set browserLocalPersistence:', err);
});

// Request basic profile, email, and read-only Gmail scopes
googleAuthProvider.addScope('profile');
googleAuthProvider.addScope('email');
googleAuthProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');

// In-memory OAuth access token storage for Gmail API.
// Kept strictly in memory. Never written to localStorage, IndexedDB, or Firestore.
let inMemoryGmailToken: string | null = null;

export function getGmailAccessToken(): string | null {
  return inMemoryGmailToken;
}

export function setGmailAccessToken(token: string | null): void {
  inMemoryGmailToken = token;
}

export function clearGmailAccessToken(): void {
  inMemoryGmailToken = null;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline. Check network or configuration.');
    }
    return false;
  }
}

// Friendly error messages for Firebase Google sign-in
export function getFriendlyAuthErrorMessage(error: any): string {
  if (!error) return 'Unable to sign in with Google. Please try again.';

  const code = error.code || '';
  const message = (error.message || '').toLowerCase();

  if (
    code === 'auth/popup-blocked' ||
    message.includes('popup-blocked') ||
    message.includes('popup was blocked')
  ) {
    return 'The sign-in pop-up was blocked by your browser. Please allow pop-ups for this site and try again.';
  }

  if (
    code === 'auth/popup-closed-by-user' ||
    message.includes('popup-closed-by-user') ||
    message.includes('closed before completing')
  ) {
    return 'The sign-in window was closed before completing. Please try again.';
  }

  if (
    code === 'auth/network-request-failed' ||
    message.includes('network') ||
    message.includes('offline')
  ) {
    return 'Network error. Please check your internet connection and try again.';
  }

  return 'Unable to sign in with Google. Please try again.';
}

// Auth Helpers
export async function signInWithGoogle(): Promise<{ user: User; accessToken: string | null }> {
  try {
    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithPopup(auth, googleAuthProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken || null;
    inMemoryGmailToken = accessToken;
    return { user: result.user, accessToken };
  } catch (error) {
    console.error('[Auth] Failed to sign in with Google:', error);
    throw error;
  }
}

export async function reconnectGmail(): Promise<string> {
  try {
    let result;
    if (auth.currentUser) {
      try {
        result = await reauthenticateWithPopup(auth.currentUser, googleAuthProvider);
      } catch (err: any) {
        console.warn('[Gmail] reauthenticateWithPopup fallback to signInWithPopup:', err?.message);
        result = await signInWithPopup(auth, googleAuthProvider);
      }
    } else {
      result = await signInWithPopup(auth, googleAuthProvider);
    }
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken || null;
    if (!accessToken) {
      throw new Error('No access token returned from Google sign-in.');
    }
    inMemoryGmailToken = accessToken;
    return accessToken;
  } catch (error) {
    console.error('[Auth] Failed to reconnect Gmail:', error);
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  try {
    inMemoryGmailToken = null;
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('[Auth] Failed to sign out from Firebase:', error);
    throw error;
  }
}

/**
 * Minimal Firestore synchronization:
 * On first sign-in, creates users/{uid} with { createdAt, displayName, email }.
 * Stores nothing else yet, and never stores email contents.
 */
export async function ensureUserDocument(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userDocRef);

    if (!docSnap.exists()) {
      await setDoc(userDocRef, {
        createdAt: serverTimestamp(),
        displayName: user.displayName || '',
        email: user.email || '',
      });
    }
  } catch (err) {
    console.error('[Auth] Failed to create or check user document in Firestore:', err);
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}
