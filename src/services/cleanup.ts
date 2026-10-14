import { Email, CleanupGroup, CleanupSettings } from '../types';
import { PROTECT_RECENT_DAYS, VERIFICATION_CODE_OUTDATED_DAYS } from '../constants/app';

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

export const VERIFICATION_CODE_REGEX =
  /verification code|security code|one-time|sign-in|login alert|verify your/i;

export const DELIVERED_ORDERS_REGEX =
  /shipped|out for delivery|delivered|tracking/i;

export const CALENDAR_INVITES_REGEX =
  /invitation|invite|reminder|starts at|webinar|rsvp/i;

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
 * First match wins, in this exact order:
 * 1. "Verification codes and sign-in alerts": subject or body matches verification patterns, older than 7 days.
 * 2. "Delivered orders and shipping updates": subject matches shipping patterns, older than outdatedAfterDays.
 * 3. "Old calendar invites and event reminders": subject matches calendar/event patterns, older than outdatedAfterDays.
 * 4. "Newsletters": senderKind is newsletter or has unsubscribeUrl & 3+ sent emails, older than outdatedAfterDays.
 * 5. "Old promotions": gmailCategory is "promotions", older than outdatedAfterDays.
 * 6. "Social notifications": gmailCategory is "social", older than outdatedAfterDays.
 * 7. "Automated notifications": gmailCategory is "updates", older than outdatedAfterDays.
 * 8. "Unread for a long time": unread, older than outdatedAfterDays.
 */
export function getCleanupGroups(
  emails: Email[],
  settings: CleanupSettings,
  referenceTimeMs: number = Date.now()
): CleanupGroup[] {
  const { outdatedAfterDays, protectedSenders } = settings;
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const outdatedThresholdMs = referenceTimeMs - outdatedAfterDays * ONE_DAY_MS;
  const verificationThresholdMs = referenceTimeMs - VERIFICATION_CODE_OUTDATED_DAYS * ONE_DAY_MS;

  // Active candidate emails (not trashed and not archived)
  const activeEmails = emails.filter((e) => !e.isTrashed && !e.isArchived);

  // Global sender counts to identify recurring newsletters without explicit senderKind
  const senderGlobalCounts: Record<string, number> = {};
  for (const e of activeEmails) {
    const sKey = e.senderEmail.toLowerCase();
    senderGlobalCounts[sKey] = (senderGlobalCounts[sKey] || 0) + 1;
  }

  // 8 Built-in Cleanup Groups in exact required order
  const groupDefs = [
    {
      id: 'verification-codes',
      title: 'Verification codes and sign-in alerts',
      description: 'One-time security codes, sign-in alerts, and verification messages older than 7 days.',
      matcher: (e: Email) => {
        const emailTime = new Date(e.date).getTime();
        if (isNaN(emailTime) || emailTime >= verificationThresholdMs) return false;
        const text = `${e.subject || ''} ${e.bodyText || ''} ${e.snippet || ''}`;
        return VERIFICATION_CODE_REGEX.test(text);
      },
    },
    {
      id: 'delivered-orders',
      title: 'Delivered orders and shipping updates',
      description: 'Delivered parcels, tracking notices, and dispatch updates older than your threshold.',
      matcher: (e: Email) => {
        const emailTime = new Date(e.date).getTime();
        if (isNaN(emailTime) || emailTime >= outdatedThresholdMs) return false;
        return DELIVERED_ORDERS_REGEX.test(e.subject || '');
      },
    },
    {
      id: 'calendar-invites',
      title: 'Old calendar invites and event reminders',
      description: 'Past invitations, meeting reminders, webinars, and event RSVP notifications older than your threshold.',
      matcher: (e: Email) => {
        const emailTime = new Date(e.date).getTime();
        if (isNaN(emailTime) || emailTime >= outdatedThresholdMs) return false;
        return CALENDAR_INVITES_REGEX.test(e.subject || '');
      },
    },
    {
      id: 'newsletters',
      title: 'Newsletters',
      description: 'Recurring subscriptions, curated dispatches, and periodic editorial reads older than your threshold.',
      matcher: (e: Email) => {
        const emailTime = new Date(e.date).getTime();
        if (isNaN(emailTime) || emailTime >= outdatedThresholdMs) return false;
        if (e.senderKind === 'newsletter') return true;
        if (e.senderKind !== 'promotion' && e.unsubscribeUrl && !e.gmailCategory) {
          const count = senderGlobalCounts[e.senderEmail.toLowerCase()] || 0;
          return count >= 3;
        }
        return false;
      },
    },
    {
      id: 'old-promotions',
      title: 'Old promotions',
      description: 'Promotional deals, discounts, and store marketing older than your threshold.',
      matcher: (e: Email) => {
        const emailTime = new Date(e.date).getTime();
        if (isNaN(emailTime) || emailTime >= outdatedThresholdMs) return false;
        return e.gmailCategory === 'promotions';
      },
    },
    {
      id: 'social-notifications',
      title: 'Social notifications',
      description: 'Activity alerts, reactions, follower updates, and network digests.',
      matcher: (e: Email) => {
        const emailTime = new Date(e.date).getTime();
        if (isNaN(emailTime) || emailTime >= outdatedThresholdMs) return false;
        return e.gmailCategory === 'social';
      },
    },
    {
      id: 'automated-notifications',
      title: 'Automated notifications',
      description: 'System alerts, build updates, status pings, and background notifications.',
      matcher: (e: Email) => {
        const emailTime = new Date(e.date).getTime();
        if (isNaN(emailTime) || emailTime >= outdatedThresholdMs) return false;
        return e.gmailCategory === 'updates';
      },
    },
    {
      id: 'unread-long-time',
      title: 'Unread for a long time',
      description: 'Unread emails that have sat in your inbox without action past your threshold.',
      matcher: (e: Email) => {
        const emailTime = new Date(e.date).getTime();
        if (isNaN(emailTime) || emailTime >= outdatedThresholdMs) return false;
        return e.isUnread;
      },
    },
  ];

  // Bucket assignments: first match wins
  const assignedEmailIds = new Set<string>();

  const groups: CleanupGroup[] = groupDefs.map((def) => {
    const matchingCandidates: Email[] = [];

    for (const email of activeEmails) {
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
