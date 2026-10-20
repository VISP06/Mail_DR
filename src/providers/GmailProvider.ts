import { Email } from '../types';
import { EmailProvider } from './EmailProvider';
import { getGmailAccessToken } from '../services/firebase';

export const GMAIL_FETCH_LIMIT = 200;

export class GmailAuthExpiredError extends Error {
  readonly status = 401;
  constructor(message = 'Your Gmail connection expired') {
    super(message);
    this.name = 'GmailAuthExpiredError';
  }
}

export class GmailPermissionDeniedError extends Error {
  readonly status = 403;
  readonly reason: string;
  readonly hint: string;
  constructor(reason: string, details?: string) {
    const hint = 'The Gmail API may not be enabled for this project, or the permission was not granted. Try signing out and signing in again.';
    const plainReason = reason || 'Access denied';
    const message = details ? `${plainReason} (${details}). ${hint}` : `${plainReason}. ${hint}`;
    super(message);
    this.name = 'GmailPermissionDeniedError';
    this.reason = plainReason;
    this.hint = hint;
  }
}

export class GmailRateLimitError extends Error {
  readonly status = 429;
  constructor(message = 'Gmail is busy, retrying...') {
    super(message);
    this.name = 'GmailRateLimitError';
  }
}

export interface GmailDebugStatus {
  tokenPresent: boolean;
  lastRequestPath: string | null;
  lastHttpStatus: number | null;
  lastErrorReason: string | null;
  emailsRequested: number;
  emailsLoaded: number;
  lastAttemptTime: string | null;
  profileHealth: {
    status: 'ok' | 'error';
    emailAddress?: string;
    messagesTotal?: number;
    threadsTotal?: number;
    error?: string;
    checkedAt: string;
  } | null;
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailPart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: {
    size?: number;
    data?: string;
    attachmentId?: string;
  };
  parts?: GmailPart[];
}

interface GmailMessageResponse {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate: string;
  payload?: GmailPart;
}

// Decode base64url string to UTF-8
function decodeBase64Url(data?: string): string {
  if (!data) return '';
  try {
    const m = data.length % 4;
    const padded = data + (m ? '='.repeat(4 - m) : '');
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    return '';
  }
}

// Convert HTML to clean plain text with tags removed
function htmlToPlainText(html: string): string {
  if (!html) return '';
  let text = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<br\s*[\/]?>/gi, '\n');
  text = text.replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
  return text.trim();
}

// Recursively find body text: prefer text/plain, fallback to text/html
function extractBodyText(payload?: GmailPart): string {
  if (!payload) return '';

  let plainText = '';
  let htmlText = '';

  const walk = (part: GmailPart) => {
    const mime = (part.mimeType || '').toLowerCase();
    if (mime === 'text/plain' && part.body?.data && !plainText) {
      plainText = decodeBase64Url(part.body.data);
    } else if (mime === 'text/html' && part.body?.data && !htmlText) {
      htmlText = htmlToPlainText(decodeBase64Url(part.body.data));
    }

    if (part.parts && part.parts.length > 0) {
      for (const subPart of part.parts) {
        walk(subPart);
      }
    }
  };

  walk(payload);

  const chosen = plainText.trim() || htmlText.trim();
  // Trimmed to 5,000 characters
  return chosen.slice(0, 5000);
}

// Check if any part has a filename
function hasAttachmentPart(payload?: GmailPart): boolean {
  if (!payload) return false;
  if (payload.filename && payload.filename.trim().length > 0) {
    return true;
  }
  if (payload.parts && payload.parts.length > 0) {
    return payload.parts.some((p) => hasAttachmentPart(p));
  }
  return false;
}

// Parse sender header "Name <email@example.com>" or "email@example.com"
function parseSender(fromHeader: string): { senderName: string; senderEmail: string } {
  if (!fromHeader) {
    return { senderName: 'Unknown Sender', senderEmail: 'unknown@example.com' };
  }

  const match = fromHeader.match(/^(?:"?([^"]*)"?\s)?(?:<?([^\s<]+@[^\s>]+)>?)$/);
  if (match) {
    const rawName = (match[1] || '').trim();
    const rawEmail = (match[2] || '').trim();
    return {
      senderName: rawName || rawEmail.split('@')[0] || 'Unknown',
      senderEmail: rawEmail || 'unknown@example.com',
    };
  }

  // Fallback for simple email format
  const emailMatch = fromHeader.match(/([^\s<]+@[^\s>]+)/);
  if (emailMatch) {
    const email = emailMatch[1];
    return {
      senderName: email.split('@')[0] || email,
      senderEmail: email,
    };
  }

  return {
    senderName: fromHeader.trim() || 'Unknown',
    senderEmail: 'unknown@example.com',
  };
}

// Parse List-Unsubscribe header for https link
function parseUnsubscribeUrl(headerValue?: string): string | undefined {
  if (!headerValue) return undefined;
  const match = headerValue.match(/<(https:\/\/[^>]+)>/i) || headerValue.match(/(https:\/\/[^\s,>]+)/i);
  return match ? match[1] : undefined;
}

// Delay with jitter for polite HTTP 429 retry
function delay(ms: number): Promise<void> {
  const jitter = Math.floor(Math.random() * 200);
  return new Promise((resolve) => setTimeout(resolve, ms + jitter));
}

// Extract URL path without query string for clean logging and debug status
function getPathOnly(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname;
  } catch {
    return url.split('?')[0];
  }
}

// Parse Google API error details safely
async function parseGoogleError(res: Response): Promise<{ reason: string; message: string }> {
  try {
    const json = await res.clone().json();
    const err = json?.error;
    const reason = err?.errors?.[0]?.reason || err?.status || `HTTP ${res.status}`;
    const message = err?.message || res.statusText || 'Unknown error';
    return { reason, message };
  } catch {
    return { reason: `HTTP ${res.status}`, message: res.statusText || 'Request failed' };
  }
}

export type GmailProgressCallback = (loaded: number, total: number, partialEmails: Email[]) => void;

export class GmailProvider implements EmailProvider {
  private inMemoryEmails: Email[] = [];

  // Debug & Diagnostics state
  private lastRequestPath: string | null = null;
  private lastHttpStatus: number | null = null;
  private lastErrorReason: string | null = null;
  private emailsRequested: number = 0;
  private emailsLoaded: number = 0;
  private lastAttemptTime: string | null = null;
  private profileHealth: GmailDebugStatus['profileHealth'] = null;

  public getDebugStatus(): GmailDebugStatus {
    return {
      tokenPresent: Boolean(getGmailAccessToken()),
      lastRequestPath: this.lastRequestPath,
      lastHttpStatus: this.lastHttpStatus,
      lastErrorReason: this.lastErrorReason,
      emailsRequested: this.emailsRequested,
      emailsLoaded: this.emailsLoaded,
      lastAttemptTime: this.lastAttemptTime,
      profileHealth: this.profileHealth,
    };
  }

  // Health check: right after getting a token, call https://gmail.googleapis.com/gmail/v1/users/me/profile once
  public async checkHealth(): Promise<GmailDebugStatus['profileHealth']> {
    const url = 'https://gmail.googleapis.com/gmail/v1/users/me/profile';
    try {
      const res = await this.fetchWithAuth(url);
      const data = await res.json();
      this.profileHealth = {
        status: 'ok',
        emailAddress: data.emailAddress,
        messagesTotal: data.messagesTotal,
        threadsTotal: data.threadsTotal,
        checkedAt: new Date().toLocaleTimeString(),
      };
      return this.profileHealth;
    } catch (err: any) {
      const reason = err?.reason || err?.message || 'Profile check failed';
      this.profileHealth = {
        status: 'error',
        error: reason,
        checkedAt: new Date().toLocaleTimeString(),
      };
      return this.profileHealth;
    }
  }

  // Authenticated fetch with automatic backoff on 429, 401 expiration handling, 403 reason extraction, and path tracking
  private async fetchWithAuth(
    url: string,
    retries = 3,
    onRateLimitRetry?: () => void
  ): Promise<Response> {
    const path = getPathOnly(url);
    this.lastRequestPath = path;
    this.lastAttemptTime = new Date().toLocaleTimeString();

    const token = getGmailAccessToken();
    if (!token) {
      this.lastHttpStatus = 401;
      this.lastErrorReason = 'No Gmail access token in memory';
      console.error('[Gmail] Request failed:', { status: 401, reason: this.lastErrorReason, path });
      throw new GmailAuthExpiredError('No Gmail access token in memory');
    }

    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      this.lastHttpStatus = res.status;

      if (res.status === 401) {
        this.lastErrorReason = 'Your Gmail connection expired';
        console.error('[Gmail] Request failed:', { status: 401, reason: this.lastErrorReason, path });
        throw new GmailAuthExpiredError('Your Gmail connection expired');
      }

      if (res.status === 403) {
        const { reason, message } = await parseGoogleError(res);
        this.lastErrorReason = reason;
        console.error('[Gmail] Request failed:', { status: 403, reason, path });
        throw new GmailPermissionDeniedError(reason, message);
      }

      if (res.status === 429) {
        this.lastErrorReason = 'Rate limit exceeded';
        console.error('[Gmail] Request failed:', { status: 429, reason: 'Gmail is busy, retrying...', path });
        if (retries > 0) {
          onRateLimitRetry?.();
          const waitMs = (4 - retries) * 1500;
          await delay(waitMs);
          return this.fetchWithAuth(url, retries - 1, onRateLimitRetry);
        }
        throw new GmailRateLimitError('Gmail is busy, retrying...');
      }

      if (!res.ok) {
        const { reason, message } = await parseGoogleError(res);
        this.lastErrorReason = reason;
        console.error('[Gmail] Request failed:', { status: res.status, reason, path });
        throw new Error(message || `Gmail request failed with status ${res.status}`);
      }

      this.lastErrorReason = null;
      return res;
    } catch (err: any) {
      if (
        err instanceof GmailAuthExpiredError ||
        err instanceof GmailPermissionDeniedError ||
        err instanceof GmailRateLimitError
      ) {
        throw err;
      }
      if (retries > 0) {
        await delay(1000);
        return this.fetchWithAuth(url, retries - 1, onRateLimitRetry);
      }
      this.lastErrorReason = err?.message || 'Network error';
      console.error('[Gmail] Request failed:', {
        status: this.lastHttpStatus || 0,
        reason: this.lastErrorReason,
        path,
      });
      throw err;
    }
  }

  // listEmails(): load the most recent 200 messages from the inbox
  public async listEmails(
    onProgress?: GmailProgressCallback,
    onRateLimitRetry?: () => void
  ): Promise<Email[]> {
    this.emailsRequested = GMAIL_FETCH_LIMIT;
    this.emailsLoaded = 0;

    // 1. Sent messages check: list recent sent messages (q "in:sent", up to 300) once
    const sentThreadIds = new Set<string>();
    try {
      const sentRes = await this.fetchWithAuth(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?q=in:sent&maxResults=300',
        2,
        onRateLimitRetry
      );
      if (sentRes.ok) {
        const sentData = await sentRes.json();
        const sentList: Array<{ id: string; threadId: string }> = sentData.messages || [];
        for (const msg of sentList) {
          if (msg.threadId) {
            sentThreadIds.add(msg.threadId);
          }
        }
      }
    } catch (err) {
      if (err instanceof GmailAuthExpiredError || err instanceof GmailPermissionDeniedError) {
        throw err;
      }
      console.warn('[Gmail] Sent check non-fatal error:', err);
    }

    // 2. Load inbox message list (q "in:inbox", up to GMAIL_FETCH_LIMIT = 200)
    const inboxListRes = await this.fetchWithAuth(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=in:inbox&maxResults=${GMAIL_FETCH_LIMIT}`,
      3,
      onRateLimitRetry
    );

    const inboxData = await inboxListRes.json();
    const messageStubs: Array<{ id: string; threadId: string }> = inboxData.messages || [];

    if (messageStubs.length === 0) {
      this.inMemoryEmails = [];
      this.emailsLoaded = 0;
      onProgress?.(0, 0, []);
      return [];
    }

    const totalToFetch = Math.min(messageStubs.length, GMAIL_FETCH_LIMIT);
    const targetStubs = messageStubs.slice(0, totalToFetch);
    const fetchedEmails: Email[] = [];

    // 3. Fetch full messages format=full with concurrency: at most 5 at a time
    const CONCURRENCY = 5;
    for (let i = 0; i < targetStubs.length; i += CONCURRENCY) {
      const batchStubs = targetStubs.slice(i, i + CONCURRENCY);

      const batchPromises = batchStubs.map(async (stub) => {
        try {
          const detailRes = await this.fetchWithAuth(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${stub.id}?format=full`,
            3,
            onRateLimitRetry
          );
          const data: GmailMessageResponse = await detailRes.json();
          return this.mapMessageToEmail(data, sentThreadIds);
        } catch (e) {
          if (e instanceof GmailAuthExpiredError || e instanceof GmailPermissionDeniedError) {
            throw e;
          }
          console.warn(`[Gmail] Failed to fetch message ID ${stub.id}`);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      for (const res of batchResults) {
        if (res) {
          fetchedEmails.push(res);
        }
      }

      this.emailsLoaded = fetchedEmails.length;
      // Progress notification: "Reading your emails, 40 of 200..." and partial emails as they arrive
      onProgress?.(fetchedEmails.length, totalToFetch, [...fetchedEmails]);
    }

    // Keep all email content in memory only
    this.inMemoryEmails = fetchedEmails;
    return fetchedEmails;
  }

  private mapMessageToEmail(
    msg: GmailMessageResponse,
    sentThreadIds: Set<string>
  ): Email {
    const headers = msg.payload?.headers || [];
    const getHeader = (name: string): string => {
      const found = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
      return found ? found.value : '';
    };

    const fromVal = getHeader('From');
    const { senderName, senderEmail } = parseSender(fromVal);
    const subject = getHeader('Subject') || '(No subject)';
    const unsubscribeHeader = getHeader('List-Unsubscribe');
    const unsubscribeUrl = parseUnsubscribeUrl(unsubscribeHeader);

    // internalDate in milliseconds
    const internalDateMs = parseInt(msg.internalDate, 10);
    const dateStr = !isNaN(internalDateMs)
      ? new Date(internalDateMs).toISOString()
      : new Date().toISOString();

    const labelIds = msg.labelIds || [];
    const isUnread = labelIds.includes('UNREAD');
    const isStarred = labelIds.includes('STARRED');
    const hasAttachment = hasAttachmentPart(msg.payload);

    // Category mapping
    let gmailCategory: Email['gmailCategory'] = 'primary';
    if (labelIds.includes('CATEGORY_PROMOTIONS')) {
      gmailCategory = 'promotions';
    } else if (labelIds.includes('CATEGORY_SOCIAL')) {
      gmailCategory = 'social';
    } else if (labelIds.includes('CATEGORY_UPDATES')) {
      gmailCategory = 'updates';
    } else if (labelIds.includes('CATEGORY_FORUMS')) {
      gmailCategory = 'forums';
    }

    const bodyText = extractBodyText(msg.payload);
    const snippet = msg.snippet || '';
    const userHasReplied = sentThreadIds.has(msg.threadId);

    return {
      id: msg.id,
      senderName,
      senderEmail,
      subject,
      date: dateStr,
      bodyText,
      snippet,
      isUnread,
      isStarred,
      hasAttachment,
      userHasReplied,
      gmailCategory,
      unsubscribeUrl,
      isTrashed: false,
      isArchived: false,
    };
  }

  public async getEmail(id: string): Promise<Email | null> {
    const found = this.inMemoryEmails.find((e) => e.id === id);
    return found || null;
  }

  // Read-only implementations (no mutations on user's Gmail mailbox)
  public async blockSender(_senderEmail: string): Promise<void> {
    return Promise.resolve();
  }

  public async unblockSender(_senderEmail: string): Promise<void> {
    return Promise.resolve();
  }

  public async getBlockedSenders(): Promise<string[]> {
    return [];
  }

  public async markAsRead(_ids: string[]): Promise<void> {
    return Promise.resolve();
  }

  public async markAsUnread(_ids: string[]): Promise<void> {
    return Promise.resolve();
  }

  public async trashEmails(_ids: string[]): Promise<void> {
    return Promise.resolve();
  }

  public async archiveEmails(_ids: string[]): Promise<void> {
    return Promise.resolve();
  }

  public async restoreEmails(_ids: string[]): Promise<void> {
    return Promise.resolve();
  }
}
