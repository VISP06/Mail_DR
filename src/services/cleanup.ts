import { Email, CleanupGroup, CleanupSettings } from '../types';
import { PROTECT_RECENT_DAYS } from '../constants/app';

/**
 * Case-insensitive subject keyword blacklist for protecting financial, transactional, and travel receipts/tickets.
 */
export const PROTECTED_SUBJECT_KEYWORDS: readonly string[] = [
  'receipt',
  'invoice',
  'statement',
  'bill',
  'payment',
  'order confirmation',
  'booking',
  'reservation',
  'itinerary',
  'ticket',
  'boarding',
  'tax',
  'refund',
];

/**
 * Pure helper function to determine if an email is PROTECTED from any cleanup group.
 * An email is protected if:
 * 1. isStarred
 * 2. hasAttachment
 * 3. userHasReplied
 * 4. received within PROTECT_RECENT_DAYS (7 days)
 * 5. its sender is in the saved protectedSenders list (case-insensitive email)
 * 6. its subject contains (case-insensitive) any of the protected keywords
 */
export function isEmailProtected(
  email: Email,
  protectedSenders: string[] = [],
  referenceTimeMs: number = Date.now()
): boolean {
  if (email.isStarred) return true;
  if (email.hasAttachment) return true;
  if (email.userHasReplied) return true;

  // Received within PROTECT_RECENT_DAYS (7 days)
  const emailTime = new Date(email.date).getTime();
  if (!isNaN(emailTime)) {
    const ageDays = (referenceTimeMs - emailTime) / (24 * 60 * 60 * 1000);
    if (ageDays <= PROTECT_RECENT_DAYS) {
      return true;
    }
  }

  // Sender is in protectedSenders list
  const senderLower = email.senderEmail.toLowerCase();
  if (protectedSenders.some((s) => s.toLowerCase() === senderLower)) {
    return true;
  }

  // Subject contains protected transactional/financial keywords
  const subjectLower = email.subject.toLowerCase();
  for (const keyword of PROTECTED_SUBJECT_KEYWORDS) {
    if (subjectLower.includes(keyword)) {
      return true;
    }
  }

  return false;
}

/**
 * Computes top 3 senders by email count for a set of emails.
 */
function getTopSenders(emails: Email[]): string[] {
  const senderCounts: Record<string, number> = {};
  for (const e of emails) {
    const key = e.senderName || e.senderEmail;
    senderCounts[key] = (senderCounts[key] || 0) + 1;
  }

  return Object.entries(senderCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([sender]) => sender);
}

/**
 * Pure function getCleanupGroups(emails, settings)
 * Candidates: not trashed/archived and older than outdatedAfterDays.
 * Each email belongs to at most one group, first match wins, in this order:
 * a. "Old promotions": gmailCategory is "promotions"
 * b. "Social notifications": gmailCategory is "social"
 * c. "Newsletters": has an unsubscribeUrl and its sender has sent 3 or more emails
 * d. "Automated notifications": gmailCategory is "updates"
 * e. "Unread for a long time": unread and in no group above
 */
export function getCleanupGroups(
  emails: Email[],
  settings: CleanupSettings,
  referenceTimeMs: number = Date.now()
): CleanupGroup[] {
  const { outdatedAfterDays, protectedSenders } = settings;
  const thresholdMs = referenceTimeMs - outdatedAfterDays * 24 * 60 * 60 * 1000;

  // Filter candidates: not trashed, not archived, older than outdatedAfterDays
  const candidates = emails.filter((e) => {
    if (e.isTrashed || e.isArchived) return false;
    const emailTime = new Date(e.date).getTime();
    if (isNaN(emailTime)) return false;
    return emailTime < thresholdMs;
  });

  // Calculate sender frequency across all emails (or candidate pool) to identify newsletters (3+ emails sent by sender)
  const senderGlobalCounts: Record<string, number> = {};
  for (const e of emails) {
    if (e.isTrashed || e.isArchived) continue;
    const sKey = e.senderEmail.toLowerCase();
    senderGlobalCounts[sKey] = (senderGlobalCounts[sKey] || 0) + 1;
  }

  // Define group buckets
  const groupDefs = [
    {
      id: 'old-promotions',
      title: 'Old promotions',
      description: 'Promotional deals, discounts, and store marketing older than your threshold.',
      matcher: (e: Email) => e.gmailCategory === 'promotions',
    },
    {
      id: 'social-notifications',
      title: 'Social notifications',
      description: 'Activity alerts, reactions, follower updates, and network digests.',
      matcher: (e: Email) => e.gmailCategory === 'social',
    },
    {
      id: 'newsletters',
      title: 'Newsletters',
      description: 'Recurring subscriptions and mailings with an unsubscribe link from senders who sent 3+ emails.',
      matcher: (e: Email) => {
        if (!e.unsubscribeUrl) return false;
        const count = senderGlobalCounts[e.senderEmail.toLowerCase()] || 0;
        return count >= 3;
      },
    },
    {
      id: 'automated-notifications',
      title: 'Automated notifications',
      description: 'System alerts, build updates, verification codes, and background status pings.',
      matcher: (e: Email) => e.gmailCategory === 'updates',
    },
    {
      id: 'unread-long-time',
      title: 'Unread for a long time',
      description: 'Unread emails that have sat in your inbox without action past your threshold.',
      matcher: (e: Email) => e.isUnread,
    },
  ];

  // Bucket assignments: first match wins
  const assignedEmailIds = new Set<string>();

  const groups: CleanupGroup[] = groupDefs.map((def) => {
    const matchingCandidates: Email[] = [];

    for (const email of candidates) {
      if (assignedEmailIds.has(email.id)) continue;
      if (def.matcher(email)) {
        assignedEmailIds.add(email.id);
        matchingCandidates.push(email);
      }
    }

    // Partition matching candidates into unprotected vs protected
    const unprotectedEmails: Email[] = [];
    let skippedProtectedCount = 0;

    for (const email of matchingCandidates) {
      if (isEmailProtected(email, protectedSenders, referenceTimeMs)) {
        skippedProtectedCount++;
      } else {
        unprotectedEmails.push(email);
      }
    }

    return {
      id: def.id,
      title: def.title,
      description: def.description,
      emailIds: unprotectedEmails.map((e) => e.id),
      count: unprotectedEmails.length,
      skippedProtectedCount,
      sampleSenders: getTopSenders(unprotectedEmails),
    };
  });

  return groups;
}
