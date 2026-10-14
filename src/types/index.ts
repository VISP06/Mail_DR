export type CategorySource = 'ai' | 'user' | 'fallback' | 'rule';
export type GmailCategory = 'primary' | 'promotions' | 'social' | 'updates' | 'forums';

export interface Email {
  id: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  date: string; // ISO or human-readable timestamp
  bodyText: string;
  snippet: string;
  isUnread: boolean;
  unsubscribeUrl?: string;
  categoryId?: string;
  categorySource?: CategorySource;
  isStarred?: boolean;
  hasAttachment?: boolean;
  userHasReplied?: boolean;
  gmailCategory?: GmailCategory;
  isTrashed?: boolean;
  isArchived?: boolean;
}

export interface EmailCategory {
  id: string;
  name: string;
  description: string;
  color: string; // Pastel accent hex code
  isSystem?: boolean;
}

export type PriorityLevel = 'High' | 'Normal' | 'Low';

export interface PriorityRule {
  id: string;
  type: 'sender' | 'category';
  target: string; // sender email or category id
  priority: PriorityLevel;
}

export interface EmailProvider {
  listEmails(): Promise<Email[]>;
  getEmail(id: string): Promise<Email | null>;
  blockSender(senderEmail: string): Promise<void>;
  markAsRead(ids: string[]): Promise<void>;
  markAsUnread(ids: string[]): Promise<void>;
  trashEmails(ids: string[]): Promise<void>;
  archiveEmails(ids: string[]): Promise<void>;
  restoreEmails(ids: string[]): Promise<void>;
}

export interface CleanupGroup {
  id: string;
  title: string;
  description: string;
  emailIds: string[]; // unprotected only
  count: number;
  skippedProtectedCount: number;
  sampleSenders: string[]; // top 3 by count
}

export interface CleanupActionRecord {
  id: string;
  date: string;
  groupTitle: string;
  action: 'trash' | 'archive';
  emailIds: string[];
}

export interface CleanupSettings {
  outdatedAfterDays: number;
  protectedSenders: string[];
}

export interface EmailSummary {
  summary: string;
  actionNeeded?: string;
  deadline?: string;
}

export interface ReadFirstItem {
  emailId: string;
  reason: string;
}

export type ThemeMode = 'system' | 'light' | 'dark';
export type ListDensity = 'comfortable' | 'compact';
export type ActiveView = 'dashboard' | 'cleanup' | 'settings' | 'profile';

export interface RagCitation {
  id: string;
  subject: string;
  senderName: string;
  index: number;
}

export interface RagChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  citations?: RagCitation[];
  timestamp: string;
  isLoading?: boolean;
  error?: string;
}
