import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  Email,
  EmailCategory,
  CategorySource,
  PriorityLevel,
  PriorityRule,
  ThemeMode,
  ListDensity,
  ActiveView,
  CleanupGroup,
  CleanupActionRecord,
} from '../types';
import {
  DEFAULT_CATEGORIES,
  UNCATEGORIZED_CATEGORY,
  UNCATEGORIZED_CATEGORY_ID,
  READ_FIRST_DAYS,
  PROTECT_RECENT_DAYS,
} from '../constants/app';
import { getCleanupGroups, isEmailProtected } from '../services/cleanup';
import { MockEmailProvider, STORAGE_KEY_USE_LARGE_DATASET } from '../providers/MockEmailProvider';
import {
  GmailProvider,
  GmailAuthExpiredError,
  GmailPermissionDeniedError,
  GmailRateLimitError,
  GmailDebugStatus,
  GMAIL_FETCH_LIMIT,
} from '../providers/GmailProvider';
import { EmailProvider } from '../providers/EmailProvider';
import { categorizeEmailsApi } from '../services/geminiService';
import { RagService } from '../services/ragService';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  auth,
  signInWithGoogle as firebaseSignInWithGoogle,
  signOutUser as firebaseSignOutUser,
  reconnectGmail as firebaseReconnectGmail,
  ensureUserDocument,
  getGmailAccessToken,
  clearGmailAccessToken,
} from '../services/firebase';

// Versioned storage keys
const STORAGE_KEY_CATEGORIES_V2 = 'calm_inbox_categories_v2';
const STORAGE_KEY_ASSIGNMENTS_V2 = 'calm_inbox_email_assignments_v2';
const STORAGE_KEY_CATEGORY_CACHE = 'calm_inbox_email_categories_cache_v1';
const STORAGE_KEY_READ_OVERRIDES = 'calm_inbox_read_states_v1';
const STORAGE_KEY_SENDER_OVERRIDES_V2 = 'calm_inbox_sender_overrides_v2';
const STORAGE_KEY_PRIORITY_RULES_V2 = 'calm_inbox_priority_rules_v2';
const STORAGE_KEY_BLOCKED_SENDERS_V2 = 'calm_inbox_blocked_senders_v2';
const STORAGE_KEY_UNSUBSCRIBE_COUNT_V2 = 'calm_inbox_unsubscribe_count_v2';
const STORAGE_KEY_DEBUG_OVERLAY = 'calm_inbox_debug_overlay_v1';
const STORAGE_KEY_CLEANUP_OUTDATED_DAYS_V1 = 'calm_inbox_cleanup_outdated_days_v1';
const STORAGE_KEY_PROTECTED_SENDERS_V1 = 'calm_inbox_cleanup_protected_senders_v1';
const STORAGE_KEY_CLEANUP_HISTORY_V1 = 'calm_inbox_cleanup_history_v1';
const STORAGE_KEY_KEEP_SIGNED_IN = 'keepSignedIn';

export interface DeleteCategoryOptions {
  categoryId: string;
  action: 'resort' | 'uncategorize' | 'move';
  targetCategoryId?: string;
}

export interface DeleteCategoryPromptState {
  category: EmailCategory;
  affectedCount: number;
}

export interface UndoDeleteState {
  deletedCategory: EmailCategory;
  previousAssignments: Record<string, { categoryId: string; categorySource: CategorySource }>;
  previousOverrides: Record<string, string>;
  previousPriorityRules: PriorityRule[];
}

interface InboxContextType {
  // Authentication & Navigation
  isAuthenticated: boolean;
  isAuthInitializing: boolean;
  authInitError: string | null;
  retryAuthInit: () => void;
  isDemo: boolean;
  enterDemo: () => void;
  setIsAuthenticated: (val: boolean) => void;
  firebaseUser: User | null;
  signInWithGoogle: (keepSignedIn?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  hubShownThisSession: boolean;
  setHubShownThisSession: (val: boolean) => void;

  // Gmail & Read-Only Mode
  isReadOnlyMode: boolean;
  needsGmailConnect: boolean;
  isGmailTokenExpired: boolean;
  isGmailLoading: boolean;
  gmailProgress: { loaded: number; total: number } | null;
  gmailErrorState: {
    type: '401' | '403' | '429' | 'other';
    message: string;
    reason?: string;
    hint?: string;
  } | null;
  hasLoadedGmailSuccessfully: boolean;
  gmailDebugStatus: GmailDebugStatus;
  reconnectGmail: () => Promise<void>;
  loadEmails: (overrideDemo?: boolean, explicitToken?: string) => Promise<void>;

  // Emails & Selection
  emails: Email[];
  selectedEmail: Email | null;
  setSelectedEmail: (email: Email | null) => void;
  openEmailById: (id: string) => Promise<void>;
  markAsRead: (id: string, isUnread?: boolean) => void;

  // Categories
  categories: EmailCategory[];
  getCategoryName: (id?: string) => string;
  getCategoryById: (id?: string) => EmailCategory;
  checkCategoryNameDuplicate: (name: string, excludeId?: string) => string | null;
  createCategory: (category: Omit<EmailCategory, 'id'>) => { success: boolean; error?: string };
  updateCategory: (category: EmailCategory) => { success: boolean; error?: string };
  requestDeleteCategory: (id: string) => void;
  confirmDeleteCategory: (options: DeleteCategoryOptions) => Promise<void>;
  cancelDeleteCategory: () => void;
  deletePrompt: DeleteCategoryPromptState | null;

  // Undo Delete
  undoDeleteState: UndoDeleteState | null;
  undoDeleteCategory: () => void;
  dismissUndo: () => void;

  // Filter & Manual Category Movement
  activeCategoryFilter: string;
  setActiveCategoryFilter: (filterId: string) => void;
  highPriorityUnreadCount: number;
  isHighPriorityUnreadFilterActive: boolean;
  setIsHighPriorityUnreadFilterActive: (active: boolean) => void;
  moveEmailToCategory: (emailId: string, categoryId: string, rememberForSender?: boolean) => void;

  // Priority
  priorityRules: PriorityRule[];
  addPriorityRule: (rule: Omit<PriorityRule, 'id'>) => void;
  removePriorityRule: (id: string) => void;
  sortByPriorityFirst: boolean;
  setSortByPriorityFirst: (val: boolean) => void;
  getEmailPriority: (email: Email) => PriorityLevel;

  // Blocking & Unsubscribe
  blockedSenders: string[];
  blockSender: (senderEmail: string) => Promise<void>;
  unblockSender: (senderEmail: string) => Promise<void>;

  // Categorization Progress & Retry
  isCategorizing: boolean;
  categorizeProgress: { processed: number; total: number } | null;
  categorizeError: boolean;
  retryCategorization: () => void;

  // Density & Theme
  listDensity: ListDensity;
  setListDensity: (density: ListDensity) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;

  // RAG Drawer
  isRagOpen: boolean;
  setIsRagOpen: (val: boolean) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Mark all as read & Snackbar
  markAllAsRead: (emailIds: string[]) => Promise<void>;
  undoMarkAllAsRead: () => Promise<void>;
  readSnackbar: {
    isOpen: boolean;
    message: string;
    count: number;
    showUndo?: boolean;
  } | null;
  dismissReadSnackbar: () => void;

  // Profile Metrics & Actions
  unsubscribeCount: number;
  recordUnsubscribeAction: () => void;
  deleteSavedUserData: () => Promise<void>;

  // Raw / All emails (including trashed & archived)
  rawEmails: Email[];

  // Cleanup Feature
  outdatedAfterDays: number;
  setOutdatedAfterDays: (days: number) => void;
  protectedSenders: string[];
  addProtectedSender: (senderEmail: string) => void;
  removeProtectedSender: (senderEmail: string) => void;
  cleanupGroups: CleanupGroup[];
  cleanupHistory: CleanupActionRecord[];
  trashEmails: (ids: string[]) => Promise<void>;
  archiveEmails: (ids: string[]) => Promise<void>;
  restoreEmails: (ids: string[]) => Promise<void>;
  recordCleanupAction: (action: Omit<CleanupActionRecord, 'id' | 'date'>) => Promise<string>;
  undoCleanupAction: (id: string) => Promise<void>;

  // Debug (Temporary)
  resetCategoryData: () => Promise<void>;
  resetSampleEmails: () => Promise<void>;
  layoutDebugOverlay: boolean;
  setLayoutDebugOverlay: (val: boolean) => void;
  useLargeDataset: boolean;
  setUseLargeDataset: (val: boolean) => void;
}

const InboxContext = createContext<InboxContextType | null>(null);

const mockEmailProvider = new MockEmailProvider();
const gmailEmailProvider = new GmailProvider();
const ragService = RagService.getInstance();

export const InboxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticatedState] = useState<boolean>(false);
  const [hubShownThisSession, setHubShownThisSession] = useState<boolean>(false);
  const [isAuthInitializing, setIsAuthInitializing] = useState<boolean>(true);
  const [authInitError, setAuthInitError] = useState<string | null>(null);
  const [authInitAttempt, setAuthInitAttempt] = useState<number>(0);
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const isDemoRef = useRef<boolean>(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  // Gmail & Read-Only State (In-Memory Only)
  const [gmailTokenState, setGmailTokenState] = useState<string | null>(() => getGmailAccessToken());
  const [isGmailTokenExpired, setIsGmailTokenExpired] = useState<boolean>(false);
  const [isGmailLoading, setIsGmailLoading] = useState<boolean>(false);
  const [gmailProgress, setGmailProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [hasLoadedGmailSuccessfully, setHasLoadedGmailSuccessfully] = useState<boolean>(false);
  const [gmailErrorState, setGmailErrorState] = useState<{
    type: '401' | '403' | '429' | 'other';
    message: string;
    reason?: string;
    hint?: string;
  } | null>(null);

  // Single place for Data Source Switch:
  const isReadOnlyMode = !isDemo && Boolean(firebaseUser);
  const activeEmailProvider: EmailProvider = isDemo ? mockEmailProvider : gmailEmailProvider;
  const emailProvider = activeEmailProvider;
  const needsGmailConnect = isReadOnlyMode && (!gmailTokenState || isGmailTokenExpired);

  const [rawEmails, setRawEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [blockedSenders, setBlockedSenders] = useState<string[]>([]);

  // Debug Diagnostics Status for Settings
  const gmailDebugStatus: GmailDebugStatus = useMemo(() => {
    return gmailEmailProvider.getDebugStatus();
  }, [gmailTokenState, isGmailLoading, gmailProgress, gmailErrorState, rawEmails.length]);

  const retryAuthInit = useCallback(() => {
    setAuthInitError(null);
    setIsAuthInitializing(true);
    setAuthInitAttempt((prev) => prev + 1);
  }, []);

  const setIsAuthenticated = useCallback((val: boolean) => {
    setIsAuthenticatedState(val);
    if (!val) {
      setHubShownThisSession(false);
      setIsDemo(false);
      isDemoRef.current = false;
    }
  }, []);

  // loadEmails(): unified loader for demo and Gmail
  const loadEmails = useCallback(
    async (overrideDemo?: boolean, explicitToken?: string) => {
      const demoActive = overrideDemo !== undefined ? overrideDemo : isDemoRef.current;

      if (demoActive) {
        try {
          const emailList = await mockEmailProvider.listEmails();
          const currentBlocked = await mockEmailProvider.getBlockedSenders();
          setBlockedSenders(currentBlocked);
          setRawEmails(
            emailList.map((e: Email) => ({
              ...e,
              categoryId: e.categoryId || UNCATEGORIZED_CATEGORY_ID,
              categorySource: e.categorySource || 'fallback',
            }))
          );
          setHasLoadedGmailSuccessfully(true);
          setGmailErrorState(null);
        } catch (err) {
          console.error('[Demo] Failed to load sample emails:', err);
        }
        return;
      }

      // Gmail mode
      const token = explicitToken || getGmailAccessToken();
      if (!token) {
        // Restored session with no token: do NOT load emails and do NOT show all caught up
        setHasLoadedGmailSuccessfully(false);
        return;
      }

      setIsGmailLoading(true);
      setGmailErrorState(null);
      setGmailProgress({ loaded: 0, total: GMAIL_FETCH_LIMIT });

      try {
        const emailList = await gmailEmailProvider.listEmails(
          (loaded, total, partialEmails) => {
            setGmailProgress({ loaded, total });
            // Show emails as they arrive!
            setRawEmails(
              partialEmails.map((e) => ({
                ...e,
                categoryId: e.categoryId || UNCATEGORIZED_CATEGORY_ID,
                categorySource: e.categorySource || 'fallback',
              }))
            );
          },
          () => {
            setGmailErrorState({
              type: '429',
              message: 'Gmail is busy, retrying...',
              reason: 'Rate limit exceeded',
            });
          }
        );

        setRawEmails(
          emailList.map((e) => ({
            ...e,
            categoryId: e.categoryId || UNCATEGORIZED_CATEGORY_ID,
            categorySource: e.categorySource || 'fallback',
          }))
        );

        setHasLoadedGmailSuccessfully(true);
        setIsGmailTokenExpired(false);
        setGmailErrorState(null);
      } catch (err: any) {
        if (err instanceof GmailAuthExpiredError) {
          setIsGmailTokenExpired(true);
          setGmailTokenState(null);
          clearGmailAccessToken();
          setGmailErrorState({
            type: '401',
            message: 'Your Gmail connection expired',
            reason: 'Session expired',
          });
        } else if (err instanceof GmailPermissionDeniedError) {
          setGmailErrorState({
            type: '403',
            message: err.message,
            reason: err.reason,
            hint: err.hint,
          });
        } else if (err instanceof GmailRateLimitError) {
          setGmailErrorState({
            type: '429',
            message: 'Gmail is busy, retrying...',
            reason: 'Rate limit exceeded',
          });
        } else {
          setGmailErrorState({
            type: 'other',
            message: err?.message || 'Failed to read emails from Gmail. Please try again.',
            reason: 'Request failed',
          });
        }
      } finally {
        setIsGmailLoading(false);
        setGmailProgress(null);
      }
    },
    []
  );

  const reconnectGmail = useCallback(async () => {
    try {
      const newToken = await firebaseReconnectGmail();
      setGmailTokenState(newToken);
      setIsGmailTokenExpired(false);
      setGmailErrorState(null);
      // Health check right after getting token:
      try {
        await gmailEmailProvider.checkHealth();
      } catch (e) {
        console.warn('[Gmail] Health check error:', e);
      }
      await loadEmails(false, newToken);
    } catch (err: any) {
      console.error('[Gmail] Reconnect failed:', err);
      throw err;
    }
  }, [loadEmails]);

  const enterDemo = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_KEEP_SIGNED_IN);
    } catch (err) {
      console.warn('[Auth] Failed to clear keepSignedIn on enterDemo:', err);
    }
    setIsDemo(true);
    isDemoRef.current = true;
    setFirebaseUser(null);
    setGmailTokenState(null);
    setIsGmailTokenExpired(false);
    setIsAuthenticatedState(true);
    setHubShownThisSession(false);
    setAuthInitError(null);
    setHasLoadedGmailSuccessfully(true);
    setGmailErrorState(null);
    loadEmails(true);
  }, [loadEmails]);

  const signInWithGoogle = useCallback(
    async (keepSignedIn: boolean = false) => {
      try {
        try {
          localStorage.setItem(STORAGE_KEY_KEEP_SIGNED_IN, keepSignedIn ? 'true' : 'false');
        } catch (err) {
          console.warn('[Auth] Failed to store keepSignedIn in localStorage:', err);
        }
        const { user, accessToken } = await firebaseSignInWithGoogle();
        setFirebaseUser(user);
        setGmailTokenState(accessToken);
        setIsGmailTokenExpired(false);
        setIsDemo(false);
        isDemoRef.current = false;
        setIsAuthenticatedState(true);
        setHubShownThisSession(false);
        setAuthInitError(null);
        await ensureUserDocument(user);

        if (accessToken) {
          // Health check right after getting token
          try {
            await gmailEmailProvider.checkHealth();
          } catch (e) {
            console.warn('[Gmail] Health check error:', e);
          }
          // After "Continue with Google" succeeds on the login screen, use the token from that popup and load Gmail immediately.
          await loadEmails(false, accessToken);
        }
      } catch (e) {
        try {
          localStorage.removeItem(STORAGE_KEY_KEEP_SIGNED_IN);
        } catch {
          // ignore
        }
        console.error('[Auth] Google Sign-In failed:', e);
        throw e;
      }
    },
    [loadEmails]
  );

  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem(STORAGE_KEY_KEEP_SIGNED_IN);
    } catch (err) {
      console.warn('[Auth] Failed to remove keepSignedIn on signOut:', err);
    }
    try {
      await firebaseSignOutUser();
    } catch (e) {
      console.warn('[Auth] Sign out warning:', e);
    }
    clearGmailAccessToken();
    setGmailTokenState(null);
    setIsGmailTokenExpired(false);
    setFirebaseUser(null);
    setIsDemo(false);
    isDemoRef.current = false;
    setIsAuthenticatedState(false);
    setHubShownThisSession(false);
    setActiveView('dashboard');
    setSelectedEmail(null);
    setRawEmails([]);
    setHasLoadedGmailSuccessfully(false);
    setGmailErrorState(null);
  }, []);

  const [activeView, setActiveView] = useState<ActiveView>('dashboard');

  const [unsubscribeCount, setUnsubscribeCount] = useState<number>(() => {
    try {
      const val = localStorage.getItem(STORAGE_KEY_UNSUBSCRIBE_COUNT_V2);
      return val ? parseInt(val, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const [activeCategoryFilter, setActiveCategoryFilterState] = useState<string>('all');
  const [isHighPriorityUnreadFilterActive, setIsHighPriorityUnreadFilterActive] = useState<boolean>(false);

  const setActiveCategoryFilter = useCallback((filterId: string) => {
    setActiveCategoryFilterState(filterId);
    setIsHighPriorityUnreadFilterActive(false);
  }, []);

  // Search state across inbox
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Mark all as read snackbar & undo state
  const [readSnackbar, setReadSnackbar] = useState<{
    isOpen: boolean;
    message: string;
    count: number;
    showUndo?: boolean;
  } | null>(null);
  const [lastMarkedReadIds, setLastMarkedReadIds] = useState<string[]>([]);
  const snackbarTimerRef = React.useRef<any>(null);

  // Guard to ensure we NEVER overwrite saved localStorage with initial empty/default state
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);

  // Categories state
  const [categories, setCategories] = useState<EmailCategory[]>(() => [
    ...DEFAULT_CATEGORIES,
    UNCATEGORIZED_CATEGORY,
  ]);

  // Email category assignments cache: { [emailId]: { categoryId, categorySource } }
  const [emailAssignments, setEmailAssignments] = useState<
    Record<string, { categoryId: string; categorySource: CategorySource }>
  >({});

  // Sender -> Category corrections (remembered by app)
  const [senderCategoryOverrides, setSenderCategoryOverrides] = useState<Record<string, string>>({});

  // Priority rules
  const [priorityRules, setPriorityRules] = useState<PriorityRule[]>(() => [
    { id: 'rule-bills', type: 'category', target: 'bills', priority: 'High' },
    { id: 'rule-promotions', type: 'category', target: 'promotions', priority: 'Low' },
  ]);

  const [sortByPriorityFirst, setSortByPriorityFirst] = useState<boolean>(true);


  // Categorization progress & error state
  const [isCategorizing, setIsCategorizing] = useState<boolean>(false);
  const [categorizeProgress, setCategorizeProgress] = useState<{ processed: number; total: number } | null>(null);
  const [categorizeError, setCategorizeError] = useState<boolean>(false);

  // Delete modal & Undo state
  const [deletePrompt, setDeletePrompt] = useState<DeleteCategoryPromptState | null>(null);
  const [undoDeleteState, setUndoDeleteState] = useState<UndoDeleteState | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [listDensity, setListDensity] = useState<ListDensity>('comfortable');
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [isRagOpen, setIsRagOpen] = useState<boolean>(false);

  // Layout debug overlay state (saved in localStorage)
  const [layoutDebugOverlay, setLayoutDebugOverlayState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(STORAGE_KEY_DEBUG_OVERLAY) === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  const setLayoutDebugOverlay = useCallback((val: boolean) => {
    setLayoutDebugOverlayState(val);
    try {
      localStorage.setItem(STORAGE_KEY_DEBUG_OVERLAY, String(val));
    } catch (err) {
      console.warn('Failed saving layout debug overlay setting:', err);
    }
  }, []);

  // Cleanup state: outdatedAfterDays (default 30 days)
  const [outdatedAfterDays, setOutdatedAfterDaysState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const val = localStorage.getItem(STORAGE_KEY_CLEANUP_OUTDATED_DAYS_V1);
        if (val !== null) {
          const parsed = Number(val);
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
      } catch {
        return 30;
      }
    }
    return 30;
  });

  const setOutdatedAfterDays = useCallback((days: number) => {
    setOutdatedAfterDaysState(days);
    try {
      localStorage.setItem(STORAGE_KEY_CLEANUP_OUTDATED_DAYS_V1, String(days));
    } catch (err) {
      console.warn('Failed saving outdatedAfterDays setting:', err);
    }
  }, []);

  // Cleanup state: protectedSenders list
  const [protectedSenders, setProtectedSenders] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const val = localStorage.getItem(STORAGE_KEY_PROTECTED_SENDERS_V1);
        if (val) {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {
        return [];
      }
    }
    return [];
  });

  const addProtectedSender = useCallback((senderEmail: string) => {
    const clean = senderEmail.trim().toLowerCase();
    if (!clean) return;
    setProtectedSenders((prev) => {
      if (prev.some((s) => s.toLowerCase() === clean)) return prev;
      const next = [...prev, clean];
      try {
        localStorage.setItem(STORAGE_KEY_PROTECTED_SENDERS_V1, JSON.stringify(next));
      } catch (e) {
        console.warn('Failed saving protected senders:', e);
      }
      return next;
    });
  }, []);

  const removeProtectedSender = useCallback((senderEmail: string) => {
    const clean = senderEmail.trim().toLowerCase();
    setProtectedSenders((prev) => {
      const next = prev.filter((s) => s.toLowerCase() !== clean);
      try {
        localStorage.setItem(STORAGE_KEY_PROTECTED_SENDERS_V1, JSON.stringify(next));
      } catch (e) {
        console.warn('Failed saving protected senders:', e);
      }
      return next;
    });
  }, []);

  // Cleanup state: history of cleanup actions
  const [cleanupHistory, setCleanupHistory] = useState<CleanupActionRecord[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const val = localStorage.getItem(STORAGE_KEY_CLEANUP_HISTORY_V1);
        if (val) {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {
        return [];
      }
    }
    return [];
  });

  // Large sample dataset toggle state (default true, saved in localStorage)
  const [useLargeDataset, setUseLargeDatasetState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const val = localStorage.getItem(STORAGE_KEY_USE_LARGE_DATASET);
        if (val !== null) {
          return val === 'true';
        }
      } catch {
        return true;
      }
    }
    return true;
  });

  const setUseLargeDataset = useCallback(async (val: boolean) => {
    setUseLargeDatasetState(val);
    try {
      localStorage.setItem(STORAGE_KEY_USE_LARGE_DATASET, String(val));
    } catch (err) {
      console.warn('Failed saving large dataset setting:', err);
    }
    // The "Use large sample set" Debug option applies only to demo mode.
    if (isDemoRef.current) {
      mockEmailProvider.refreshEmailsDataset();
      try {
        const emailList = await mockEmailProvider.listEmails();
        const currentBlocked = await mockEmailProvider.getBlockedSenders();
        setBlockedSenders(currentBlocked);
        setRawEmails(
          emailList.map((e: Email) => ({
            ...e,
            categoryId: e.categoryId || UNCATEGORIZED_CATEGORY_ID,
            categorySource: e.categorySource || 'fallback',
          }))
        );
      } catch (e) {
        console.warn('Failed reloading emails on dataset toggle:', e);
      }
    }
  }, []);

  // Sync theme to DOM
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    if (themeMode === 'light') {
      root.classList.add('light');
    } else if (themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) root.classList.add('dark');
      else root.classList.add('light');
    }
  }, [themeMode]);

  // STEP 3: Load validated storage on mount wrapped in try/catch
  useEffect(() => {
    try {
      // 1. Categories
      const savedCatsJson = localStorage.getItem(STORAGE_KEY_CATEGORIES_V2);
      let parsedCats: EmailCategory[] = [];
      if (savedCatsJson) {
        try {
          const raw = JSON.parse(savedCatsJson);
          if (Array.isArray(raw)) {
            parsedCats = raw.filter(
              (c: any) => c && typeof c.id === 'string' && typeof c.name === 'string' && c.name.trim().length > 0
            );
          }
        } catch (e) {
          console.warn('Failed parsing saved categories, repairing:', e);
        }
      }

      if (parsedCats.length === 0) {
        parsedCats = [...DEFAULT_CATEGORIES];
      }

      // Ensure built-in Uncategorized is always present
      if (!parsedCats.some((c) => c.id === UNCATEGORIZED_CATEGORY_ID)) {
        parsedCats.push(UNCATEGORIZED_CATEGORY);
      }
      setCategories(parsedCats);

      // Valid category IDs set
      const validCategoryIds = new Set(parsedCats.map((c) => c.id));

      // 2. Email assignments
      const savedAssignmentsJson = localStorage.getItem(STORAGE_KEY_ASSIGNMENTS_V2);
      if (savedAssignmentsJson) {
        try {
          const rawAssignments = JSON.parse(savedAssignmentsJson);
          if (rawAssignments && typeof rawAssignments === 'object') {
            const repairedAssignments: Record<string, { categoryId: string; categorySource: CategorySource }> = {};
            for (const [emailId, item] of Object.entries(rawAssignments)) {
              if (item && typeof (item as any).categoryId === 'string') {
                const assignedId = (item as any).categoryId;
                const source = (item as any).categorySource || 'fallback';
                // Repair if category no longer exists
                repairedAssignments[emailId] = {
                  categoryId: validCategoryIds.has(assignedId) ? assignedId : UNCATEGORIZED_CATEGORY_ID,
                  categorySource: validCategoryIds.has(assignedId) ? source : 'fallback',
                };
              }
            }
            setEmailAssignments(repairedAssignments);
          }
        } catch (e) {
          console.warn('Error reading assignments storage:', e);
        }
      }

      // 3. Sender overrides
      const savedOverridesJson = localStorage.getItem(STORAGE_KEY_SENDER_OVERRIDES_V2);
      if (savedOverridesJson) {
        try {
          const rawOverrides = JSON.parse(savedOverridesJson);
          if (rawOverrides && typeof rawOverrides === 'object') {
            const validOverrides: Record<string, string> = {};
            for (const [sender, catId] of Object.entries(rawOverrides)) {
              if (typeof catId === 'string' && validCategoryIds.has(catId)) {
                validOverrides[sender.toLowerCase()] = catId;
              }
            }
            setSenderCategoryOverrides(validOverrides);
          }
        } catch (e) {
          console.warn('Error reading sender overrides:', e);
        }
      }

      // 4. Priority rules
      const savedRulesJson = localStorage.getItem(STORAGE_KEY_PRIORITY_RULES_V2);
      if (savedRulesJson) {
        try {
          const rawRules = JSON.parse(savedRulesJson);
          if (Array.isArray(rawRules)) {
            setPriorityRules(rawRules);
          }
        } catch (e) {
          console.warn('Error reading priority rules:', e);
        }
      }
    } catch (err) {
      console.warn('Storage initial load error:', err);
    } finally {
      setIsStorageLoaded(true);
    }
  }, []);

  // Startup Auth logic with keepSignedIn check and 8s resilient timeout
  useEffect(() => {
    let resolved = false;
    setIsAuthInitializing(true);

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.error('[Auth] Firebase authentication initialization timed out after 8 seconds');
        setAuthInitError("Couldn't reach sign-in. Try again.");
        setIsAuthInitializing(false);
      }
    }, 8000);

    let unsubscribeAuth: (() => void) | null = null;

    const runStartupAuth = async () => {
      let isKeepSignedIn = false;
      try {
        isKeepSignedIn = localStorage.getItem(STORAGE_KEY_KEEP_SIGNED_IN) === 'true';
      } catch (err) {
        console.warn('[Auth] Failed to read keepSignedIn from localStorage:', err);
      }

      if (!isKeepSignedIn) {
        // If keepSignedIn is NOT true, call signOut(auth) first, wait for it to complete, then show the login screen
        try {
          await firebaseSignOutUser();
        } catch (err) {
          console.warn('[Auth] Pre-emptive signOut during startup:', err);
        }
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          setFirebaseUser(null);
          setIsAuthenticatedState(false);
          setIsAuthInitializing(false);
        }
        return;
      }

      // If keepSignedIn is true, check if Firebase user exists
      unsubscribeAuth = onAuthStateChanged(
        auth,
        async (user) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timer);
          setAuthInitError(null);
          if (user) {
            setFirebaseUser(user);
            setIsDemo(false);
            isDemoRef.current = false;
            setIsAuthenticatedState(true);
            setHubShownThisSession(false);
            // Restored sessions have NO token in memory!
            setGmailTokenState(null);
            setIsGmailTokenExpired(false);
            setHasLoadedGmailSuccessfully(false);
            setRawEmails([]);
            try {
              await ensureUserDocument(user);
            } catch (e) {
              console.error('[Auth] Failed to ensure user document in Firestore:', e);
            }
          } else {
            setFirebaseUser(null);
            setIsAuthenticatedState(false);
          }
          setIsAuthInitializing(false);
        },
        (error) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timer);
          console.error('[Auth] Firebase onAuthStateChanged error:', error);
          setAuthInitError("Couldn't reach sign-in. Try again.");
          setIsAuthInitializing(false);
        }
      );
    };

    runStartupAuth();

    return () => {
      resolved = true;
      clearTimeout(timer);
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  }, [authInitAttempt]);

  // Persist categories when changed (NEVER overwrite before storage has loaded)
  useEffect(() => {
    if (!isStorageLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY_CATEGORIES_V2, JSON.stringify(categories));
    } catch (e) {
      console.warn('Failed saving categories:', e);
    }
  }, [categories, isStorageLoaded]);

  // Persist email assignments
  useEffect(() => {
    if (!isStorageLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY_ASSIGNMENTS_V2, JSON.stringify(emailAssignments));
    } catch (e) {
      console.warn('Failed saving email assignments:', e);
    }
  }, [emailAssignments, isStorageLoaded]);

  // Persist sender overrides
  useEffect(() => {
    if (!isStorageLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY_SENDER_OVERRIDES_V2, JSON.stringify(senderCategoryOverrides));
    } catch (e) {
      console.warn('Failed saving sender overrides:', e);
    }
  }, [senderCategoryOverrides, isStorageLoaded]);

  // Persist priority rules
  useEffect(() => {
    if (!isStorageLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY_PRIORITY_RULES_V2, JSON.stringify(priorityRules));
    } catch (e) {
      console.warn('Failed saving priority rules:', e);
    }
  }, [priorityRules, isStorageLoaded]);

  // STEP 2: One helper getCategoryName(id) used everywhere
  // If an id is not found, show "Uncategorized", never the raw id!
  const getCategoryName = useCallback(
    (id?: string): string => {
      if (!id || id === UNCATEGORIZED_CATEGORY_ID) {
        return 'Uncategorized';
      }
      const match = categories.find((c) => c.id === id);
      return match ? match.name : 'Uncategorized';
    },
    [categories]
  );

  const getCategoryById = useCallback(
    (id?: string): EmailCategory => {
      if (!id || id === UNCATEGORIZED_CATEGORY_ID) {
        return UNCATEGORIZED_CATEGORY;
      }
      const match = categories.find((c) => c.id === id);
      return match || UNCATEGORIZED_CATEGORY;
    },
    [categories]
  );

  // STEP 7: Duplicate Name Validation
  const checkCategoryNameDuplicate = useCallback(
    (name: string, excludeId?: string): string | null => {
      const cleanName = name.trim().replace(/\s+/g, ' ');
      if (!cleanName) {
        return 'Category name cannot be empty.';
      }
      const lower = cleanName.toLowerCase();

      // Check against Uncategorized and all existing categories
      for (const cat of categories) {
        if (cat.id !== excludeId && cat.name.toLowerCase() === lower) {
          return 'A category with this name already exists.';
        }
      }
      if (lower === 'uncategorized' && excludeId !== UNCATEGORIZED_CATEGORY_ID) {
        return 'A category with this name already exists.';
      }
      return null;
    },
    [categories]
  );

  // Startup email loading:
  // - In demo mode, load demo emails.
  // - In Gmail mode, load only if an explicit access token is present in memory.
  // - Restored Firebase sessions without an access token do NOT load emails (and do NOT show all caught up).
  useEffect(() => {
    if (isDemoRef.current) {
      loadEmails(true);
    } else if (getGmailAccessToken()) {
      loadEmails(false);
    }
  }, [loadEmails]);

  // Background indexing for RAG embeddings (excluding trashed/archived)
  useEffect(() => {
    const activeEmails = rawEmails.filter((e) => !e.isTrashed && !e.isArchived);
    if (activeEmails.length > 0) {
      ragService.indexEmails(activeEmails);
    }
  }, [rawEmails]);

  // Synchronize emails with category assignments and sender overrides.
  // Trashed and archived emails disappear from the inbox list, chip counts, unread counts, search, read-first and RAG.
  const resolvedEmails = useMemo(() => {
    const validCategoryIds = new Set(categories.map((c) => c.id));
    const activeRawEmails = rawEmails.filter((e) => !e.isTrashed && !e.isArchived);

    return activeRawEmails.map((email) => {
      // 1. Sender correction takes top precedence
      const senderOverride = senderCategoryOverrides[email.senderEmail.toLowerCase()];
      if (senderOverride && validCategoryIds.has(senderOverride)) {
        return {
          ...email,
          categoryId: senderOverride,
          categorySource: 'user' as CategorySource,
        };
      }

      // 2. Saved email assignment
      const cached = emailAssignments[email.id];
      if (cached && validCategoryIds.has(cached.categoryId)) {
        return {
          ...email,
          categoryId: cached.categoryId,
          categorySource: cached.categorySource,
        };
      }

      // 3. Pre-assigned rule or default category on the email
      if (email.categoryId && validCategoryIds.has(email.categoryId) && email.categoryId !== UNCATEGORIZED_CATEGORY_ID) {
        return {
          ...email,
          categoryId: email.categoryId,
          categorySource: email.categorySource || ('rule' as CategorySource),
        };
      }

      // 4. Fallback to Uncategorized
      return {
        ...email,
        categoryId: UNCATEGORIZED_CATEGORY_ID,
        categorySource: 'fallback' as CategorySource,
      };
    });
  }, [rawEmails, categories, emailAssignments, senderCategoryOverrides]);

  // STEP 5: Categorization execution
  // Re-categorize ONLY emails whose source is NOT "user".
  // Generated emails have pre-assigned category and categorySource "rule": do NOT send to Gemini.
  const runCategorization = useCallback(
    async (forceEmails?: Email[]) => {
      if (!isStorageLoaded || rawEmails.length === 0) return;

      const userCategories = categories.filter((c) => !c.isSystem && c.id !== UNCATEGORIZED_CATEGORY_ID);
      if (userCategories.length === 0) return;

      const pool = forceEmails || resolvedEmails;
      // Only emails with no category yet should ever be categorized by AI
      const emailsNeedingCategorization = pool.filter((e) => {
        // If sender has an explicit override, skip AI
        if (senderCategoryOverrides[e.senderEmail.toLowerCase()]) return false;
        // If user manually changed it, skip AI
        if (e.categorySource === 'user') return false;
        // If email has a pre-assigned rule category, do NOT send to Gemini
        if (e.categorySource === 'rule' && e.categoryId && e.categoryId !== UNCATEGORIZED_CATEGORY_ID) return false;
        // Only emails with no category yet (Uncategorized or fallback) get categorized by AI
        return !e.categoryId || e.categoryId === UNCATEGORIZED_CATEGORY_ID;
      });

      if (emailsNeedingCategorization.length === 0) {
        setIsCategorizing(false);
        setCategorizeProgress(null);
        return;
      }

      setIsCategorizing(true);
      setCategorizeError(false);
      setCategorizeProgress({ processed: 0, total: emailsNeedingCategorization.length });

      try {
        const assignments = await categorizeEmailsApi(
          emailsNeedingCategorization,
          userCategories,
          (processed, total) => {
            setCategorizeProgress({ processed, total });
          }
        );

        // Update assignments cache
        setEmailAssignments((prev) => {
          const next = { ...prev };
          for (const a of assignments) {
            // Do not override user-assigned sources if changed in the meantime
            if (next[a.emailId]?.categorySource === 'user') continue;
            next[a.emailId] = {
              categoryId: a.categoryId,
              categorySource: a.categorySource,
            };
          }
          return next;
        });
      } catch (err) {
        console.warn('Categorization process encountered an issue:', err);
        setCategorizeError(true);
      } finally {
        setIsCategorizing(false);
        setTimeout(() => setCategorizeProgress(null), 1500);
      }
    },
    [isStorageLoaded, rawEmails.length, categories, resolvedEmails, senderCategoryOverrides]
  );

  // Trigger categorization when storage is loaded and emails have no assignments
  const hasTriggeredInitialSort = useRef(false);
  useEffect(() => {
    if (!isStorageLoaded || rawEmails.length === 0) return;

    if (!hasTriggeredInitialSort.current) {
      hasTriggeredInitialSort.current = true;
      // Check if unassigned emails exist
      const unassigned = resolvedEmails.filter(
        (e) => e.categoryId === UNCATEGORIZED_CATEGORY_ID && e.categorySource !== 'user'
      );
      if (unassigned.length > 0) {
        runCategorization();
      }
    }
  }, [isStorageLoaded, rawEmails.length, resolvedEmails, runCategorization]);

  const retryCategorization = useCallback(() => {
    setCategorizeError(false);
    runCategorization();
  }, [runCategorization]);

  // Compute email priority based on user rules
  // "AI suggestions never override user rules."
  const getEmailPriority = useCallback(
    (email: Email): PriorityLevel => {
      // 1. Sender rules first
      const senderRule = priorityRules.find(
        (r) => r.type === 'sender' && r.target.toLowerCase() === email.senderEmail.toLowerCase()
      );
      if (senderRule) return senderRule.priority;

      // 2. Category rules
      if (email.categoryId) {
        const categoryRule = priorityRules.find((r) => r.type === 'category' && r.target === email.categoryId);
        if (categoryRule) return categoryRule.priority;
      }

      return 'Normal';
    },
    [priorityRules]
  );


  const markAsRead = useCallback(async (id: string, isUnread = false) => {
    setRawEmails((prev) => prev.map((e) => (e.id === id ? { ...e, isUnread } : e)));
    setSelectedEmail((prev) => (prev && prev.id === id ? { ...prev, isUnread } : prev));
    try {
      if (!isUnread) {
        await emailProvider.markAsRead([id]);
      } else {
        await emailProvider.markAsUnread([id]);
      }
    } catch (e) {
      console.warn('Failed to update provider read status:', e);
    }
  }, []);

  const markAllAsRead = useCallback(async (emailIds: string[]) => {
    if (!emailIds || emailIds.length === 0) return;
    const idSet = new Set(emailIds);
    setRawEmails((prev) => prev.map((e) => (idSet.has(e.id) ? { ...e, isUnread: false } : e)));
    setSelectedEmail((prev) => (prev && idSet.has(prev.id) ? { ...prev, isUnread: false } : prev));
    try {
      await emailProvider.markAsRead(emailIds);
    } catch (e) {
      console.warn('Failed to mark all as read in provider:', e);
    }
    setLastMarkedReadIds(emailIds);
    setReadSnackbar({
      isOpen: true,
      count: emailIds.length,
      message: `${emailIds.length} ${emailIds.length === 1 ? 'email' : 'emails'} marked as read`,
    });
    if (snackbarTimerRef.current) {
      clearTimeout(snackbarTimerRef.current);
    }
    snackbarTimerRef.current = setTimeout(() => {
      setReadSnackbar(null);
    }, 10000);
  }, []);

  const undoMarkAllAsRead = useCallback(async () => {
    if (lastMarkedReadIds.length === 0) return;
    const idSet = new Set(lastMarkedReadIds);
    setRawEmails((prev) => prev.map((e) => (idSet.has(e.id) ? { ...e, isUnread: true } : e)));
    setSelectedEmail((prev) => (prev && idSet.has(prev.id) ? { ...prev, isUnread: true } : prev));
    try {
      await emailProvider.markAsUnread(lastMarkedReadIds);
    } catch (e) {
      console.warn('Failed to undo mark all as read in provider:', e);
    }
    setLastMarkedReadIds([]);
    setReadSnackbar(null);
    if (snackbarTimerRef.current) {
      clearTimeout(snackbarTimerRef.current);
    }
  }, [lastMarkedReadIds]);

  const dismissReadSnackbar = useCallback(() => {
    setReadSnackbar(null);
    if (snackbarTimerRef.current) {
      clearTimeout(snackbarTimerRef.current);
    }
  }, []);

  const openEmailById = useCallback(
    async (id: string) => {
      const email = resolvedEmails.find((e) => e.id === id);
      if (email) {
        setSelectedEmail(email);
        markAsRead(id, false);
      }
    },
    [resolvedEmails, markAsRead]
  );

  // Manual category movement (marks categorySource: 'user')
  const moveEmailToCategory = useCallback(
    (emailId: string, categoryId: string, rememberForSender = true) => {
      const targetEmail = resolvedEmails.find((e) => e.id === emailId);
      if (!targetEmail) return;

      if (rememberForSender) {
        setSenderCategoryOverrides((prev) => ({
          ...prev,
          [targetEmail.senderEmail.toLowerCase()]: categoryId,
        }));
      }

      setEmailAssignments((prev) => ({
        ...prev,
        [emailId]: { categoryId, categorySource: 'user' },
      }));

      setSelectedEmail((prev) =>
        prev && prev.id === emailId ? { ...prev, categoryId, categorySource: 'user' } : prev
      );
    },
    [resolvedEmails]
  );

  // STEP 7: Category CRUD with stable crypto.randomUUID() and duplicate check
  const createCategory = useCallback(
    (cat: Omit<EmailCategory, 'id'>) => {
      const error = checkCategoryNameDuplicate(cat.name);
      if (error) {
        return { success: false, error };
      }

      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cat-${Date.now()}`;
      const newCategory: EmailCategory = {
        ...cat,
        id,
        name: cat.name.trim().replace(/\s+/g, ' '),
        description: cat.description.trim(),
        isSystem: false,
      };

      setCategories((prev) => {
        // Keep Uncategorized at end
        const nonSystem = prev.filter((c) => c.id !== UNCATEGORIZED_CATEGORY_ID);
        return [...nonSystem, newCategory, UNCATEGORIZED_CATEGORY];
      });

      return { success: true };
    },
    [checkCategoryNameDuplicate]
  );

  const updateCategory = useCallback(
    (updated: EmailCategory) => {
      if (updated.isSystem || updated.id === UNCATEGORIZED_CATEGORY_ID) {
        return { success: false, error: 'System categories cannot be modified.' };
      }

      const error = checkCategoryNameDuplicate(updated.name, updated.id);
      if (error) {
        return { success: false, error };
      }

      const cleanCat: EmailCategory = {
        ...updated,
        name: updated.name.trim().replace(/\s+/g, ' '),
        description: updated.description.trim(),
      };

      setCategories((prev) => prev.map((c) => (c.id === updated.id ? cleanCat : c)));
      return { success: true };
    },
    [checkCategoryNameDuplicate]
  );

  // STEP 8: Deleting a category with confirmation options & 10-second Undo
  const requestDeleteCategory = useCallback(
    (id: string) => {
      if (id === UNCATEGORIZED_CATEGORY_ID) return;
      const cat = categories.find((c) => c.id === id);
      if (!cat) return;

      const affectedCount = resolvedEmails.filter((e) => e.categoryId === id).length;
      setDeletePrompt({
        category: cat,
        affectedCount,
      });
    },
    [categories, resolvedEmails]
  );

  const cancelDeleteCategory = useCallback(() => {
    setDeletePrompt(null);
  }, []);

  const confirmDeleteCategory = useCallback(
    async (options: DeleteCategoryOptions) => {
      const { categoryId, action, targetCategoryId } = options;
      const catToDelete = categories.find((c) => c.id === categoryId);
      if (!catToDelete) {
        setDeletePrompt(null);
        return;
      }

      // Snapshot for 10-second Undo
      const previousAssignmentsSnapshot = { ...emailAssignments };
      const previousOverridesSnapshot = { ...senderCategoryOverrides };
      const previousPriorityRulesSnapshot = [...priorityRules];

      // 1. Remove category from categories
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));

      // 2. Remove sender overrides pointing to deleted category
      setSenderCategoryOverrides((prev) => {
        const updated = { ...prev };
        for (const [sender, assignedId] of Object.entries(updated)) {
          if (assignedId === categoryId) {
            delete updated[sender];
          }
        }
        return updated;
      });

      // 3. Remove priority rules pointing to deleted category
      setPriorityRules((prev) => prev.filter((r) => !(r.type === 'category' && r.target === categoryId)));

      // 4. Handle affected emails based on user choice
      const remainingCategories = categories.filter(
        (c) => c.id !== categoryId && c.id !== UNCATEGORIZED_CATEGORY_ID
      );
      const destinationId =
        action === 'move' && targetCategoryId && targetCategoryId !== categoryId
          ? targetCategoryId
          : UNCATEGORIZED_CATEGORY_ID;

      const affectedEmailIds: string[] = [];
      setEmailAssignments((prev) => {
        const next = { ...prev };
        for (const email of resolvedEmails) {
          if (email.categoryId === categoryId) {
            affectedEmailIds.push(email.id);
            next[email.id] = {
              categoryId: destinationId,
              categorySource: action === 'move' ? 'user' : 'fallback',
            };
          }
        }
        return next;
      });

      // Reset filter if it was active
      if (activeCategoryFilter === categoryId) {
        setActiveCategoryFilter('all');
      }

      setDeletePrompt(null);

      // Set Undo state with 10-second expiration
      setUndoDeleteState({
        deletedCategory: catToDelete,
        previousAssignments: previousAssignmentsSnapshot,
        previousOverrides: previousOverridesSnapshot,
        previousPriorityRules: previousPriorityRulesSnapshot,
      });

      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = setTimeout(() => {
        setUndoDeleteState(null);
      }, 10000);

      // If user selected "resort" (default), trigger AI re-categorization for affected emails
      if (action === 'resort' && remainingCategories.length > 0 && affectedEmailIds.length > 0) {
        const emailsToResort = rawEmails.filter((e) => affectedEmailIds.includes(e.id));
        setTimeout(() => {
          runCategorization(emailsToResort);
        }, 200);
      }
    },
    [
      categories,
      emailAssignments,
      senderCategoryOverrides,
      priorityRules,
      resolvedEmails,
      activeCategoryFilter,
      rawEmails,
      runCategorization,
    ]
  );

  const undoDeleteCategory = useCallback(() => {
    if (!undoDeleteState) return;

    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);

    const { deletedCategory, previousAssignments, previousOverrides, previousPriorityRules } = undoDeleteState;

    setCategories((prev) => {
      if (prev.some((c) => c.id === deletedCategory.id)) return prev;
      const nonSystem = prev.filter((c) => c.id !== UNCATEGORIZED_CATEGORY_ID);
      return [...nonSystem, deletedCategory, UNCATEGORIZED_CATEGORY];
    });

    setEmailAssignments(previousAssignments);
    setSenderCategoryOverrides(previousOverrides);
    setPriorityRules(previousPriorityRules);

    setUndoDeleteState(null);
  }, [undoDeleteState]);

  const dismissUndo = useCallback(() => {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    setUndoDeleteState(null);
  }, []);

  // Priority Rule management
  const addPriorityRule = useCallback((rule: Omit<PriorityRule, 'id'>) => {
    const newRule: PriorityRule = {
      ...rule,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `rule-${Date.now()}`,
    };
    setPriorityRules((prev) => [...prev, newRule]);
  }, []);

  const removePriorityRule = useCallback((id: string) => {
    setPriorityRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // Block & Unblock Sender
  const blockSender = useCallback(
    async (senderEmail: string) => {
      await emailProvider.blockSender(senderEmail);
      const updatedBlocked = await emailProvider.getBlockedSenders();
      setBlockedSenders(updatedBlocked);
      setRawEmails((prev) => prev.filter((e) => e.senderEmail.toLowerCase() !== senderEmail.toLowerCase()));
      if (selectedEmail && selectedEmail.senderEmail.toLowerCase() === senderEmail.toLowerCase()) {
        setSelectedEmail(null);
      }
    },
    [selectedEmail]
  );

  const unblockSender = useCallback(
    async (senderEmail: string) => {
      await emailProvider.unblockSender(senderEmail);
      const updatedBlocked = await emailProvider.getBlockedSenders();
      setBlockedSenders(updatedBlocked);
      await loadEmails();
    },
    [loadEmails]
  );

  // STEP 9: Reset Category Data (Debug)
  const resetCategoryData = useCallback(async () => {
    try {
      localStorage.removeItem(STORAGE_KEY_CATEGORIES_V2);
      localStorage.removeItem(STORAGE_KEY_ASSIGNMENTS_V2);
      localStorage.removeItem(STORAGE_KEY_SENDER_OVERRIDES_V2);
      localStorage.removeItem(STORAGE_KEY_PRIORITY_RULES_V2);
    } catch (e) {}

    const freshCats = [...DEFAULT_CATEGORIES, UNCATEGORIZED_CATEGORY];
    setCategories(freshCats);
    setEmailAssignments({});
    setSenderCategoryOverrides({});
    setPriorityRules([
      { id: 'rule-bills', type: 'category', target: 'bills', priority: 'High' },
      { id: 'rule-promotions', type: 'category', target: 'promotions', priority: 'Low' },
    ]);
    setActiveCategoryFilter('all');

    await loadEmails();
    hasTriggeredInitialSort.current = false;
    setTimeout(() => {
      runCategorization();
    }, 200);
  }, [loadEmails, runCategorization]);

  // STEP 9b: Reset Sample Emails (Debug - restores read/unread, trash, archive states)
  const resetSampleEmails = useCallback(async () => {
    // 1. Clear persisted cleanup history in storage
    try {
      localStorage.removeItem(STORAGE_KEY_CLEANUP_HISTORY_V1);
    } catch (e) {}

    // 2. Clear in-memory cleanup history and undo snapshot
    setCleanupHistory([]);
    setLastMarkedReadIds([]);

    // 3. Reset sample emails in provider (demo mode only) and reload state
    if (isDemoRef.current && mockEmailProvider.resetSampleEmails) {
      const fresh = await mockEmailProvider.resetSampleEmails();
      const formatted = fresh.map((e: Email) => ({
        ...e,
        categoryId: e.categoryId || UNCATEGORIZED_CATEGORY_ID,
        categorySource: e.categorySource || 'fallback',
      }));
      setRawEmails(formatted);
      setSelectedEmail(null);

      // 4. Compute real unread count and show confirmation snackbar
      const unreadCount = formatted.filter((e) => e.isUnread && !e.isTrashed && !e.isArchived).length;
      setReadSnackbar({
        isOpen: true,
        count: unreadCount,
        message: `Sample emails reset: ${unreadCount} unread`,
        showUndo: false,
      });

      if (snackbarTimerRef.current) {
        clearTimeout(snackbarTimerRef.current);
      }
      snackbarTimerRef.current = setTimeout(() => {
        setReadSnackbar(null);
      }, 5000);
    }
  }, []);

  const recordUnsubscribeAction = useCallback(() => {
    setUnsubscribeCount((prev) => {
      const next = prev + 1;
      try {
        localStorage.setItem(STORAGE_KEY_UNSUBSCRIBE_COUNT_V2, String(next));
      } catch (e) {}
      return next;
    });
  }, []);

  // Profile: Delete Saved Data (clears categories, rules, blocked senders, unsubscribe count, sorting results)
  const deleteSavedUserData = useCallback(async () => {
    try {
      localStorage.removeItem(STORAGE_KEY_CATEGORIES_V2);
      localStorage.removeItem(STORAGE_KEY_ASSIGNMENTS_V2);
      localStorage.removeItem(STORAGE_KEY_SENDER_OVERRIDES_V2);
      localStorage.removeItem(STORAGE_KEY_PRIORITY_RULES_V2);
      localStorage.removeItem(STORAGE_KEY_BLOCKED_SENDERS_V2);
      localStorage.removeItem(STORAGE_KEY_UNSUBSCRIBE_COUNT_V2);
      localStorage.removeItem(STORAGE_KEY_CLEANUP_OUTDATED_DAYS_V1);
      localStorage.removeItem(STORAGE_KEY_PROTECTED_SENDERS_V1);
      localStorage.removeItem(STORAGE_KEY_CLEANUP_HISTORY_V1);
    } catch (e) {}

    // Unblock all senders in emailProvider
    const currentBlocked = await emailProvider.getBlockedSenders();
    for (const s of currentBlocked) {
      await emailProvider.unblockSender(s);
    }
    // Reset provider read overrides
    if ((emailProvider as any).resetReadStates) {
      await (emailProvider as any).resetReadStates();
    }

    setBlockedSenders([]);
    setUnsubscribeCount(0);
    setSearchQuery('');
    setReadSnackbar(null);
    setLastMarkedReadIds([]);
    setOutdatedAfterDaysState(30);
    setProtectedSenders([]);
    setCleanupHistory([]);

    const freshCats = [...DEFAULT_CATEGORIES, UNCATEGORIZED_CATEGORY];
    setCategories(freshCats);
    setEmailAssignments({});
    setSenderCategoryOverrides({});
    setPriorityRules([
      { id: 'rule-bills', type: 'category', target: 'bills', priority: 'High' },
      { id: 'rule-promotions', type: 'category', target: 'promotions', priority: 'Low' },
    ]);
    setActiveCategoryFilter('all');
    setActiveView('dashboard');
    setHubShownThisSession(false);

    await loadEmails();
    hasTriggeredInitialSort.current = false;
    setTimeout(() => {
      runCategorization();
    }, 200);
  }, [loadEmails, runCategorization]);

  // Compute final sorted emails
  const sortedEmails = useMemo(() => {
    const list = [...resolvedEmails];

    list.sort((a, b) => {
      if (sortByPriorityFirst) {
        const prioA = getEmailPriority(a);
        const prioB = getEmailPriority(b);
        const prioOrder: Record<PriorityLevel, number> = { High: 0, Normal: 1, Low: 2 };
        if (prioOrder[prioA] !== prioOrder[prioB]) {
          return prioOrder[prioA] - prioOrder[prioB];
        }
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return list;
  }, [resolvedEmails, sortByPriorityFirst, getEmailPriority]);

  // Count of emails that are unread AND High priority AND from the last 30 days (READ_FIRST_DAYS)
  const highPriorityUnreadCount = useMemo(() => {
    const thirtyDaysAgoMs = Date.now() - READ_FIRST_DAYS * 24 * 60 * 60 * 1000;
    return resolvedEmails.filter((e) => {
      if (!e.isUnread || getEmailPriority(e) !== 'High') return false;
      const emailTime = new Date(e.date).getTime();
      return !isNaN(emailTime) && emailTime >= thirtyDaysAgoMs;
    }).length;
  }, [resolvedEmails, getEmailPriority]);

  // Cleanup feature operations
  const trashEmails = useCallback(async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    setRawEmails((prev) =>
      prev.map((e) => (idSet.has(e.id) ? { ...e, isTrashed: true } : e))
    );
    setSelectedEmail((prev) => (prev && idSet.has(prev.id) ? null : prev));
    try {
      await emailProvider.trashEmails(ids);
    } catch (e) {
      console.warn('Failed to trash emails in provider:', e);
    }
  }, []);

  const archiveEmails = useCallback(async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    setRawEmails((prev) =>
      prev.map((e) => (idSet.has(e.id) ? { ...e, isArchived: true } : e))
    );
    setSelectedEmail((prev) => (prev && idSet.has(prev.id) ? null : prev));
    try {
      await emailProvider.archiveEmails(ids);
    } catch (e) {
      console.warn('Failed to archive emails in provider:', e);
    }
  }, []);

  const restoreEmails = useCallback(async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    setRawEmails((prev) =>
      prev.map((e) => (idSet.has(e.id) ? { ...e, isTrashed: false, isArchived: false } : e))
    );
    try {
      await emailProvider.restoreEmails(ids);
    } catch (e) {
      console.warn('Failed to restore emails in provider:', e);
    }
  }, []);

  const recordCleanupAction = useCallback(
    async (action: Omit<CleanupActionRecord, 'id' | 'date'>): Promise<string> => {
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cleanup-${Date.now()}`;
      const newRecord: CleanupActionRecord = {
        ...action,
        id,
        date: new Date().toISOString(),
      };
      setCleanupHistory((prev) => {
        const next = [newRecord, ...prev];
        try {
          localStorage.setItem(STORAGE_KEY_CLEANUP_HISTORY_V1, JSON.stringify(next));
        } catch (e) {
          console.warn('Failed saving cleanup history:', e);
        }
        return next;
      });
      return id;
    },
    []
  );

  const undoCleanupAction = useCallback(
    async (id: string): Promise<void> => {
      const record = cleanupHistory.find((r) => r.id === id);
      if (!record) return;

      await restoreEmails(record.emailIds);

      setCleanupHistory((prev) => {
        const next = prev.filter((r) => r.id !== id);
        try {
          localStorage.setItem(STORAGE_KEY_CLEANUP_HISTORY_V1, JSON.stringify(next));
        } catch (e) {
          console.warn('Failed saving updated cleanup history:', e);
        }
        return next;
      });
    },
    [cleanupHistory, restoreEmails]
  );

  const cleanupGroups = useMemo(() => {
    return getCleanupGroups(rawEmails, {
      outdatedAfterDays,
      protectedSenders,
    });
  }, [rawEmails, outdatedAfterDays, protectedSenders]);

  const value: InboxContextType = {
    isAuthenticated,
    isAuthInitializing,
    authInitError,
    retryAuthInit,
    isDemo,
    enterDemo,
    setIsAuthenticated,
    firebaseUser,
    signInWithGoogle,
    signOut,
    activeView,
    setActiveView,
    hubShownThisSession,
    setHubShownThisSession,

    // Gmail & Read-Only Mode
    isReadOnlyMode,
    needsGmailConnect,
    isGmailTokenExpired,
    isGmailLoading,
    gmailProgress,
    gmailErrorState,
    hasLoadedGmailSuccessfully,
    gmailDebugStatus,
    reconnectGmail,
    loadEmails,

    emails: sortedEmails,
    selectedEmail,
    setSelectedEmail,
    openEmailById,
    markAsRead,

    // Search
    searchQuery,
    setSearchQuery,

    // Mark all as read & Snackbar
    markAllAsRead,
    undoMarkAllAsRead,
    readSnackbar,
    dismissReadSnackbar,

    categories,
    getCategoryName,
    getCategoryById,
    checkCategoryNameDuplicate,
    createCategory,
    updateCategory,
    requestDeleteCategory,
    confirmDeleteCategory,
    cancelDeleteCategory,
    deletePrompt,

    undoDeleteState,
    undoDeleteCategory,
    dismissUndo,

    activeCategoryFilter,
    setActiveCategoryFilter,
    highPriorityUnreadCount,
    isHighPriorityUnreadFilterActive,
    setIsHighPriorityUnreadFilterActive,
    moveEmailToCategory,

    priorityRules,
    addPriorityRule,
    removePriorityRule,
    sortByPriorityFirst,
    setSortByPriorityFirst,
    getEmailPriority,

    blockedSenders,
    blockSender,
    unblockSender,

    isCategorizing,
    categorizeProgress,
    categorizeError,
    retryCategorization,

    listDensity,
    setListDensity,
    themeMode,
    setThemeMode,

    isRagOpen,
    setIsRagOpen,

    unsubscribeCount,
    recordUnsubscribeAction,
    deleteSavedUserData,

    // Raw emails
    rawEmails,

    // Cleanup Feature
    outdatedAfterDays,
    setOutdatedAfterDays,
    protectedSenders,
    addProtectedSender,
    removeProtectedSender,
    cleanupGroups,
    cleanupHistory,
    trashEmails,
    archiveEmails,
    restoreEmails,
    recordCleanupAction,
    undoCleanupAction,

    resetCategoryData,
    resetSampleEmails,
    layoutDebugOverlay,
    setLayoutDebugOverlay,
    useLargeDataset,
    setUseLargeDataset,
  };

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
};

export const useInbox = () => {
  const context = useContext(InboxContext);
  if (!context) {
    throw new Error('useInbox must be used within an InboxProvider');
  }
  return context;
};
