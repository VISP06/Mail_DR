import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { EmailCategory, PriorityLevel, ListDensity, ThemeMode } from '../types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with explicit database ID from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

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

// Trigger initial connection test
testConnection();

// Auth Helpers
export async function signInWithGoogle(): Promise<User> {
  try {
    const cred = await signInWithPopup(auth, googleAuthProvider);
    return cred.user;
  } catch (error) {
    console.error('Failed to sign in with Google:', error);
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Failed to sign out from Firebase:', error);
    throw error;
  }
}

// User Profile & Settings Sync
export async function syncUserProfile(
  userId: string,
  email: string,
  preferences: {
    themeMode?: ThemeMode;
    listDensity?: ListDensity;
    outdatedAfterDays?: number;
    unsubscribeCount?: number;
  }
): Promise<void> {
  const path = `users/${userId}`;
  try {
    const userDocRef = doc(db, 'users', userId);
    const existing = await getDoc(userDocRef);
    if (!existing.exists()) {
      await setDoc(userDocRef, {
        userId,
        email,
        themeMode: preferences.themeMode || 'system',
        listDensity: preferences.listDensity || 'comfortable',
        outdatedAfterDays: preferences.outdatedAfterDays || 14,
        unsubscribeCount: preferences.unsubscribeCount || 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(
        userDocRef,
        {
          ...preferences,
          email,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Categories Sync
export async function saveCategoryToFirestore(userId: string, category: EmailCategory): Promise<void> {
  const path = `users/${userId}/categories/${category.id}`;
  try {
    const categoryRef = doc(db, 'users', userId, 'categories', category.id);
    await setDoc(categoryRef, {
      id: category.id,
      name: category.name,
      description: category.description || '',
      color: category.color,
      orderIndex: category.orderIndex ?? 0,
      userId,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteCategoryFromFirestore(userId: string, categoryId: string): Promise<void> {
  const path = `users/${userId}/categories/${categoryId}`;
  try {
    const categoryRef = doc(db, 'users', userId, 'categories', categoryId);
    await deleteDoc(categoryRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// Priority Rules Sync
export async function savePriorityRuleToFirestore(
  userId: string,
  rule: { id: string; type: 'sender' | 'category'; target: string; priority: PriorityLevel }
): Promise<void> {
  const path = `users/${userId}/priorityRules/${rule.id}`;
  try {
    const ruleRef = doc(db, 'users', userId, 'priorityRules', rule.id);
    await setDoc(ruleRef, {
      id: rule.id,
      type: rule.type,
      target: rule.target,
      priority: rule.priority,
      userId,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deletePriorityRuleFromFirestore(userId: string, ruleId: string): Promise<void> {
  const path = `users/${userId}/priorityRules/${ruleId}`;
  try {
    const ruleRef = doc(db, 'users', userId, 'priorityRules', ruleId);
    await deleteDoc(ruleRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// Inbox Overrides Sync
export async function syncInboxStateToFirestore(
  userId: string,
  state: {
    readOverrides?: Record<string, boolean>;
    trashArchiveOverrides?: Record<string, { isTrashed?: boolean; isArchived?: boolean }>;
    protectedSenders?: string[];
    blockedSenders?: string[];
    senderOverrides?: Record<string, string>;
    assignments?: Record<string, any>;
  }
): Promise<void> {
  const path = `users/${userId}/state/inboxState`;
  try {
    const stateRef = doc(db, 'users', userId, 'state', 'inboxState');
    await setDoc(
      stateRef,
      {
        userId,
        ...state,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Cleanup History Sync
export async function recordCleanupInFirestore(
  userId: string,
  record: {
    id: string;
    groupTitle: string;
    action: 'trash' | 'archive';
    emailIds: string[];
  }
): Promise<void> {
  const path = `users/${userId}/cleanupHistory/${record.id}`;
  try {
    const recordRef = doc(db, 'users', userId, 'cleanupHistory', record.id);
    await setDoc(recordRef, {
      id: record.id,
      userId,
      groupTitle: record.groupTitle,
      action: record.action,
      emailIds: record.emailIds,
      date: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Load entire user data from Firestore
export async function loadUserDataFromFirestore(userId: string): Promise<{
  profile: any | null;
  categories: EmailCategory[];
  priorityRules: any[];
  inboxState: any | null;
  cleanupHistory: any[];
}> {
  const userDocRef = doc(db, 'users', userId);
  let profile = null;
  try {
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      profile = userDocSnap.data();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${userId}`);
  }

  // Load Categories
  const categories: EmailCategory[] = [];
  try {
    const catCollRef = collection(db, 'users', userId, 'categories');
    const catSnap = await getDocs(catCollRef);
    catSnap.forEach((d) => {
      categories.push(d.data() as EmailCategory);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `users/${userId}/categories`);
  }

  // Load Priority Rules
  const priorityRules: any[] = [];
  try {
    const ruleCollRef = collection(db, 'users', userId, 'priorityRules');
    const ruleSnap = await getDocs(ruleCollRef);
    ruleSnap.forEach((d) => {
      priorityRules.push(d.data());
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `users/${userId}/priorityRules`);
  }

  // Load Inbox State
  let inboxState = null;
  try {
    const stateRef = doc(db, 'users', userId, 'state', 'inboxState');
    const stateSnap = await getDoc(stateRef);
    if (stateSnap.exists()) {
      inboxState = stateSnap.data();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${userId}/state/inboxState`);
  }

  // Load Cleanup History
  const cleanupHistory: any[] = [];
  try {
    const cleanupCollRef = collection(db, 'users', userId, 'cleanupHistory');
    const cleanSnap = await getDocs(cleanupCollRef);
    cleanSnap.forEach((d) => {
      const data = d.data();
      cleanupHistory.push({
        ...data,
        date: data.date instanceof Timestamp ? data.date.toDate().toISOString() : data.date,
      });
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `users/${userId}/cleanupHistory`);
  }

  return {
    profile,
    categories,
    priorityRules,
    inboxState,
    cleanupHistory,
  };
}
