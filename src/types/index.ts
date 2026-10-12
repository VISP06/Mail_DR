export type CategorySource = 'ai' | 'user' | 'fallback';

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
export type ActiveView = 'dashboard' | 'settings' | 'profile';

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
