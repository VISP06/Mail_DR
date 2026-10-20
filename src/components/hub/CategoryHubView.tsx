import React, { useMemo, useState } from 'react';
import { Sparkles, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useInbox } from '../../context/InboxContext';
import { Email } from '../../types';
import { OrganicBlob } from '../common/OrganicBlob';
import { getCategoryIcon } from '../../constants/categoryIcons';
import { ConnectGmailCard } from '../auth/ConnectGmailCard';

interface HubCardData {
  id: string;
  name: string;
  color: string;
  totalCount: number;
  unreadCount: number;
  highPriorityCount: number;
  newestUnreadSubject: string | null;
}

export const CategoryHubView: React.FC = () => {
  const {
    emails,
    categories,
    firebaseUser,
    getEmailPriority,
    setActiveCategoryFilter,
    setSelectedEmail,
    setActiveView,
    setHubShownThisSession,
    isReadOnlyMode,
    needsGmailConnect,
    isGmailTokenExpired,
    isGmailLoading,
    gmailProgress,
    gmailErrorState,
    hasLoadedGmailSuccessfully,
    reconnectGmail,
    loadEmails,
    signOut,
  } = useInbox();

  const [isExiting, setIsExiting] = useState(false);

  // Calm human date (e.g. "Sunday, October 11")
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  // Time-of-day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // First name for greeting (Firebase user's first name, or 'Maya' in demo mode)
  const userFirstName = useMemo(() => {
    if (firebaseUser?.displayName) {
      const first = firebaseUser.displayName.trim().split(/\s+/)[0];
      if (first) return first;
    }
    if (firebaseUser?.email) {
      const emailName = firebaseUser.email.split('@')[0];
      if (emailName) {
        return emailName.charAt(0).toUpperCase() + emailName.slice(1);
      }
    }
    return 'Maya';
  }, [firebaseUser]);

  // Active emails (not trashed and not archived)
  const activeEmails = useMemo(() => {
    return emails.filter((e) => !e.isTrashed && !e.isArchived);
  }, [emails]);

  const totalActiveUnreadEmails = useMemo(() => {
    return activeEmails.filter((e) => e.isUnread);
  }, [activeEmails]);

  const thirtyDaysAgoMs = useMemo(() => {
    return Date.now() - 30 * 24 * 60 * 60 * 1000;
  }, []);

  // Qualifying emails for "What should I read first?":
  // - unread
  // - not trashed or archived
  // - from the last 30 days
  // - Rank: High priority first, then newest
  // - Maximum 3
  const qualifyingReadFirstEmails = useMemo(() => {
    const candidates = totalActiveUnreadEmails.filter((e) => {
      const emailTime = new Date(e.date).getTime();
      return !isNaN(emailTime) && emailTime >= thirtyDaysAgoMs;
    });

    return candidates.sort((a, b) => {
      const aIsHigh = getEmailPriority(a) === 'High' ? 1 : 0;
      const bIsHigh = getEmailPriority(b) === 'High' ? 1 : 0;
      if (aIsHigh !== bIsHigh) {
        return bIsHigh - aIsHigh; // High priority first
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime(); // Then newest first
    });
  }, [totalActiveUnreadEmails, getEmailPriority, thirtyDaysAgoMs]);

  const readFirstEmails = useMemo(() => {
    return qualifyingReadFirstEmails.slice(0, 3);
  }, [qualifyingReadFirstEmails]);

  // High-priority unread count in the last 30 days
  const highPriorityUnread30DaysCount = useMemo(() => {
    return qualifyingReadFirstEmails.filter((e) => getEmailPriority(e) === 'High').length;
  }, [qualifyingReadFirstEmails, getEmailPriority]);

  // Accent line text under greeting:
  // - No unread emails at all -> "You're all caught up."
  // - Unread emails exist but none are High priority in last 30 days -> "Nothing urgent right now."
  // - Otherwise -> "N high-priority email(s) are waiting for you."
  const accentLineText = useMemo(() => {
    if (isReadOnlyMode && !hasLoadedGmailSuccessfully) {
      if (needsGmailConnect) {
        return 'MailDR needs permission to read your mail.';
      }
      if (isGmailLoading) {
        return gmailProgress ? `Reading your emails, ${gmailProgress.loaded} of ${gmailProgress.total}...` : 'Reading your emails...';
      }
      return 'MailDR needs permission to read your mail.';
    }
    if (totalActiveUnreadEmails.length === 0) {
      return "You're all caught up.";
    }
    if (highPriorityUnread30DaysCount === 0) {
      return 'Nothing urgent right now.';
    }
    if (highPriorityUnread30DaysCount === 1) {
      return '1 high-priority email is waiting for you.';
    }
    return `${highPriorityUnread30DaysCount} high-priority emails are waiting for you.`;
  }, [
    totalActiveUnreadEmails.length,
    highPriorityUnread30DaysCount,
    isReadOnlyMode,
    hasLoadedGmailSuccessfully,
    needsGmailConnect,
    isGmailLoading,
    gmailProgress,
  ]);

  // Format date helper for rows and cards
  const formatRowDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Helper to resolve human category name
  const getCategoryName = (categoryId?: string): string => {
    if (!categoryId || categoryId === 'uncategorized') return 'Uncategorized';
    const found = categories.find((c) => c.id === categoryId);
    return found ? found.name : 'Inbox';
  };

  // Helper to compute card metrics for an email subset
  const computeCardMetrics = (
    subset: Email[],
    id: string,
    name: string,
    color: string
  ): HubCardData => {
    const unreadEmails = subset
      .filter((e) => e.isUnread)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const highPriorityCount = unreadEmails.filter((e) => {
      if (getEmailPriority(e) !== 'High') return false;
      const emailTime = new Date(e.date).getTime();
      return !isNaN(emailTime) && emailTime >= thirtyDaysAgoMs;
    }).length;

    return {
      id,
      name,
      color,
      totalCount: subset.length,
      unreadCount: unreadEmails.length,
      highPriorityCount,
      newestUnreadSubject: unreadEmails[0]?.subject || null,
    };
  };

  // Compute all hub cards in the exact required order:
  // 1. "All emails"
  // 2. "Unread"
  // 3. User's categories in their order
  // 4. "Uncategorized" last, ONLY when it has emails
  const hubCards = useMemo<HubCardData[]>(() => {
    const list: HubCardData[] = [];

    // 1. All emails
    list.push(computeCardMetrics(activeEmails, 'all', 'All emails', '#5B7553'));

    // 2. Unread
    list.push(computeCardMetrics(activeEmails, 'unread', 'Unread', '#E07A5F'));

    // 3. User categories in user's category order
    for (const cat of categories) {
      const catEmails = activeEmails.filter((e) => e.categoryId === cat.id);
      list.push(computeCardMetrics(catEmails, cat.id, cat.name, cat.color || '#C8B8D8'));
    }

    // 4. Uncategorized (only when it has emails)
    const uncategorizedEmails = activeEmails.filter(
      (e) => e.categoryId === 'uncategorized' || !e.categoryId
    );
    if (uncategorizedEmails.length > 0) {
      list.push(
        computeCardMetrics(
          uncategorizedEmails,
          'uncategorized',
          'Uncategorized',
          '#8B8680'
        )
      );
    }

    return list;
  }, [activeEmails, categories, computeCardMetrics]);

  // Label helper: "10 unread" for categories and Unread card, "840 emails" for All emails, or null if 0 unread
  const getCardCountLabel = (card: HubCardData): string | null => {
    if (card.id === 'all') {
      return `${card.totalCount} ${card.totalCount === 1 ? 'email' : 'emails'}`;
    }
    if (card.unreadCount > 0) {
      return `${card.unreadCount} unread`;
    }
    // When a category has no unread emails, show no count pill
    return null;
  };

  // Handler when a hub card is tapped (with 200ms exit fade-out)
  const handleSelectCard = (cardId: string) => {
    if (isExiting) return;
    setIsExiting(true);

    const isReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const exitDuration = isReduced ? 0 : 200;

    setTimeout(() => {
      setActiveCategoryFilter(cardId);
      setHubShownThisSession(true);
      setActiveView('dashboard');
    }, exitDuration);
  };

  // Handler when a recommended email card is tapped (with 200ms exit fade-out)
  const handleSelectEmail = (email: Email) => {
    if (isExiting) return;
    setIsExiting(true);

    const isReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const exitDuration = isReduced ? 0 : 200;

    setTimeout(() => {
      setSelectedEmail(email);
      setHubShownThisSession(true);
      setActiveView('dashboard');
    }, exitDuration);
  };

  return (
    <div
      className={`w-full max-w-[960px] mx-auto px-4 sm:px-6 md:px-8 pt-8 sm:pt-12 md:pt-16 pb-24 sm:pb-32 space-y-6 sm:space-y-7 select-text ${
        isExiting ? 'hub-exiting' : ''
      }`}
    >
      {/* 1. Hub Header: Date, Greeting, and High-Priority Accent Sentence */}
      <header className="pb-1 space-y-1">
        <div className="hub-animate-entrance" style={{ animationDelay: '0ms' }}>
          <span
            className="text-xs font-semibold tracking-wide uppercase block mb-1 opacity-80"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {todayFormatted}
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            {greeting}, {userFirstName}
          </h1>
        </div>

        <div className="hub-animate-entrance" style={{ animationDelay: '50ms' }}>
          <p
            className="font-accent text-[17px] sm:text-lg mt-1.5 leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {accentLineText}
          </p>
        </div>
      </header>

      {/* Reconnect notice if token expired while emails were previously loaded */}
      {isReadOnlyMode && (isGmailTokenExpired || gmailErrorState?.type === '401') && (
        <div className="mb-4">
          <ConnectGmailCard isExpired={true} onConnect={reconnectGmail} />
        </div>
      )}

      {/* Streaming progress indicator */}
      {isReadOnlyMode && isGmailLoading && emails.length > 0 && (
        <div className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between gap-3 text-xs mb-3">
          <div className="flex items-center gap-2.5">
            <Loader2 size={15} className="animate-spin text-[var(--accent-chartreuse)] shrink-0" />
            <span className="font-medium text-[var(--color-text-body)]">
              {gmailProgress ? `Reading your emails, ${gmailProgress.loaded} of ${gmailProgress.total}...` : 'Reading your emails...'}
            </span>
          </div>
          {gmailProgress && (
            <span className="text-[11px] text-[var(--color-text-secondary)] font-mono">
              {Math.round((gmailProgress.loaded / (gmailProgress.total || 1)) * 100)}%
            </span>
          )}
        </div>
      )}

      {/* If restored session with no token in memory -> show Connect Gmail card */}
      {needsGmailConnect && emails.length === 0 ? (
        <div className="py-8">
          <ConnectGmailCard isExpired={isGmailTokenExpired} onConnect={reconnectGmail} />
        </div>
      ) : isReadOnlyMode && isGmailLoading && emails.length === 0 ? (
        /* Loading Gmail emails state */
        <div className="py-20 px-6 text-center flex flex-col items-center justify-center rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--accent-chartreuse)] text-[#292D1E] mb-4 shadow-xs">
            <Loader2 size={22} className="animate-spin" />
          </div>
          <h3 className="font-heading text-xl font-bold tracking-tight text-[var(--color-text-body)]">
            {gmailProgress ? `Reading your emails, ${gmailProgress.loaded} of ${gmailProgress.total}...` : 'Reading your emails...'}
          </h3>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)] max-w-sm">
            Securely loading your most recent inbox messages in memory only.
          </p>
        </div>
      ) : isReadOnlyMode && gmailErrorState?.type === '403' && emails.length === 0 ? (
        /* 403 Forbidden state */
        <div className="p-7 sm:p-9 rounded-[28px] border border-amber-500/40 bg-[var(--color-surface)] text-center flex flex-col items-center my-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-amber-500/15 text-amber-600 dark:text-amber-400 mb-4">
            <AlertCircle size={24} />
          </div>
          <h3 className="font-heading text-xl font-bold text-[var(--color-text-body)]">
            Gmail Access Denied
          </h3>
          <p className="text-xs font-mono text-[var(--color-text-secondary)] mt-1.5">
            Reason: {gmailErrorState.reason || 'Forbidden'}
          </p>
          <p className="mt-3 text-xs text-[var(--color-text-secondary)] max-w-md leading-relaxed">
            The Gmail API may not be enabled for this project, or the permission was not granted. Try signing out and signing in again.
          </p>
          <div className="flex items-center gap-3 mt-6">
            <button
              type="button"
              onClick={() => loadEmails()}
              className="px-6 py-2.5 rounded-full font-semibold text-xs border border-[var(--color-border)] hover:bg-[var(--color-hover-tint)] transition-all cursor-pointer"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={signOut}
              className="px-6 py-2.5 rounded-full font-semibold text-xs bg-[var(--color-primary-btn)] text-[var(--color-primary-btn-text)] transition-all cursor-pointer shadow-xs"
            >
              Sign out
            </button>
          </div>
        </div>
      ) : isReadOnlyMode && gmailErrorState?.type === 'other' && emails.length === 0 ? (
        /* Other error state */
        <div className="p-7 rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] text-center flex flex-col items-center my-6">
          <AlertCircle size={24} className="text-rose-500 mb-3" />
          <h3 className="font-heading text-base font-bold text-[var(--color-text-body)] mb-1">
            Unable to Load Gmail
          </h3>
          <p className="text-xs text-[var(--color-text-secondary)] max-w-sm mb-4">
            {gmailErrorState.message || 'An error occurred while reading your Gmail inbox.'}
          </p>
          <button
            type="button"
            onClick={() => loadEmails()}
            className="px-6 py-2.5 rounded-full text-xs font-semibold border border-[var(--color-border)] hover:bg-[var(--color-hover-tint)] cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* 2. "What should I read first?" Section */}
          <section
            className="p-5 sm:p-6 rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] space-y-4 hub-animate-entrance transition-all"
            style={{ animationDelay: '100ms' }}
            aria-label="What should I read first?"
          >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--accent-chartreuse)]/25 text-[#292D1E] dark:text-[var(--accent-chartreuse)] shrink-0">
              <Sparkles size={18} />
            </span>
            <h2 className="font-heading text-base sm:text-lg font-bold tracking-tight text-[var(--color-text-body)]">
              What should I read first?
            </h2>
          </div>
          {readFirstEmails.length > 0 && (
            <span className="text-[11px] font-medium text-[var(--color-text-secondary)] hidden sm:inline">
              {readFirstEmails.length} {readFirstEmails.length === 1 ? 'recommendation' : 'recommendations'}
            </span>
          )}
        </div>

        {readFirstEmails.length === 0 ? (
          /* Empty state: keep container, soft organic blob, text in accent font */
          <div className="py-7 sm:py-9 text-center space-y-3">
            <OrganicBlob variant="empty-state" className="w-28 h-24 sm:w-32 sm:h-28 mx-auto opacity-75" />
            <p className="font-accent text-xl sm:text-2xl text-[var(--color-text-body)] tracking-wide">
              {totalActiveUnreadEmails.length === 0 && (!isReadOnlyMode || hasLoadedGmailSuccessfully)
                ? "You're all caught up"
                : 'Nothing urgent right now'}
            </p>
          </div>
        ) : (
          /* Up to 3 smaller email cards in a row (stacked below 640px width) */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-3.5">
            {readFirstEmails.map((email) => {
              const isHigh = getEmailPriority(email) === 'High';
              const catName = getCategoryName(email.categoryId);
              const reasonText = isHigh ? `High priority in ${catName}` : `Unread in ${catName}`;

              return (
                <button
                  type="button"
                  key={email.id}
                  onClick={() => handleSelectEmail(email)}
                  className="w-full text-left p-4 sm:p-4.5 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-hover-tint)] active:scale-[0.98] transition-all flex flex-col justify-between gap-3 group cursor-pointer shadow-none focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
                >
                  <div className="space-y-1.5 w-full">
                    {/* Top: Sender Name and optional High priority pill */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs sm:text-sm text-[var(--color-text-body)] truncate flex-1 min-w-0">
                        {email.senderName || email.senderEmail}
                      </span>
                      {isHigh && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E07A5F]/15 text-[#9C4C14] dark:text-[var(--accent-peach)] border border-[#E07A5F]/30 shrink-0">
                          High priority
                        </span>
                      )}
                    </div>

                    {/* Subject (clamped to 2 lines) */}
                    <h3 className="text-xs sm:text-sm font-semibold text-[var(--color-text-body)] line-clamp-2 leading-snug">
                      {email.subject}
                    </h3>

                    {/* Reason line in secondary text */}
                    <p className="text-[11px] sm:text-xs text-[var(--color-text-secondary)] truncate font-medium">
                      {reasonText}
                    </p>
                  </div>

                  {/* Open email link + date */}
                  <div className="pt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between w-full">
                    <span className="text-[11px] sm:text-xs font-semibold text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-body)] inline-flex items-center gap-1 transition-colors">
                      Open email <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                    <span className="text-[10px] text-[var(--color-text-secondary)] opacity-70">
                      {formatRowDate(email.date)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Grid of Category Cards: 2 columns from 480px width, 1 column below 480px */}
      <section
        className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-3 sm:gap-4"
        aria-label="Category cards"
      >
        {hubCards.map((card, index) => {
          const cardBaseDelay = 150;
          const cardDelay = cardBaseDelay + Math.min(index * 50, 500);
          const countLabel = getCardCountLabel(card);
          const CardIcon = getCategoryIcon(card.id, card.name);

          return (
            <div
              key={card.id}
              className="hub-animate-entrance w-full"
              style={{ animationDelay: `${cardDelay}ms` }}
            >
              <button
                type="button"
                onClick={() => handleSelectCard(card.id)}
                className="hub-card relative overflow-hidden w-full text-left p-5 sm:p-6 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-hover-tint)] outline-hidden shadow-none flex flex-col justify-between min-h-[128px] sm:min-h-[136px] group cursor-pointer"
              >
                {/* Decorative Art: large icon (~110px, stroke 1.25) + organic blob outline in bottom-right corner */}
                <div
                  className="hub-card-art pointer-events-none select-none absolute -right-4 -bottom-4 z-0 flex items-center justify-center opacity-[0.18] dark:opacity-[0.14]"
                  style={{ color: card.color }}
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 160 160"
                    className="absolute w-[145px] h-[145px]"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M 42,28 C 82,12 128,22 144,56 C 160,90 146,134 112,146 C 78,158 28,144 16,110 C 4,76 10,36 42,28 Z"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeDasharray="4 2"
                    />
                  </svg>
                  <CardIcon size={110} strokeWidth={1.25} />
                </div>

                {/* Content sits above art in relative z-10 */}
                <div className="relative z-10 space-y-2.5 w-full">
                  {/* Top line: Color Dot + Category Name, Labelled Count & High Priority pill */}
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: card.color }}
                        aria-hidden="true"
                      />
                      <h2 className="font-heading text-base sm:text-lg font-bold text-[var(--color-text-body)] truncate">
                        {card.name}
                      </h2>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {card.highPriorityCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E07A5F]/15 text-[#9C4C14] dark:text-[var(--accent-peach)] border border-[#E07A5F]/30 shrink-0">
                          {card.highPriorityCount} high priority
                        </span>
                      )}
                      {countLabel && (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-body)] shrink-0">
                          {countLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* One-line secondary text: newest unread email subject or "All caught up" */}
                  <p
                    className={`text-xs truncate leading-relaxed ${
                      card.unreadCount > 0 && card.newestUnreadSubject
                        ? 'text-[var(--color-text-secondary)] font-medium group-hover:text-[var(--color-text-body)]'
                        : 'text-[var(--color-text-secondary)] opacity-60'
                    }`}
                  >
                    {card.unreadCount === 0
                      ? 'All caught up'
                      : card.newestUnreadSubject || 'All caught up'}
                  </p>
                </div>
              </button>
            </div>
          );
        })}
      </section>
        </>
      )}
    </div>
  );
};
