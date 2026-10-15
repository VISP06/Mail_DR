import React, { useMemo, useState } from 'react';
import { useInbox } from '../../context/InboxContext';
import { Email } from '../../types';

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
    getEmailPriority,
    setActiveCategoryFilter,
    setSelectedEmail,
    setActiveView,
    setHubShownThisSession,
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

  // Active emails (not trashed and not archived)
  const activeEmails = useMemo(() => {
    return emails.filter((e) => !e.isTrashed && !e.isArchived);
  }, [emails]);

  const thirtyDaysAgoMs = useMemo(() => {
    return Date.now() - 30 * 24 * 60 * 60 * 1000;
  }, []);

  // Qualifying emails for "Needs you first" strip:
  // - unread
  // - High priority
  // - from the last 30 days
  // - not trashed or archived
  // - newest first
  const qualifyingHighPriorityEmails = useMemo(() => {
    return activeEmails
      .filter((e) => {
        if (!e.isUnread) return false;
        if (getEmailPriority(e) !== 'High') return false;
        const emailTime = new Date(e.date).getTime();
        return !isNaN(emailTime) && emailTime >= thirtyDaysAgoMs;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activeEmails, getEmailPriority, thirtyDaysAgoMs]);

  // Strip rows: up to 3 newest qualifying emails
  const needsYouFirstRows = useMemo(() => {
    return qualifyingHighPriorityEmails.slice(0, 3);
  }, [qualifyingHighPriorityEmails]);

  // Format date helper for rows
  const formatRowDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
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

  // Handler when a row in "Needs you first" is tapped (with 200ms exit fade-out)
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
            {greeting}, Maya
          </h1>
        </div>

        <div className="hub-animate-entrance" style={{ animationDelay: '50ms' }}>
          <p
            className="font-accent text-[17px] sm:text-lg mt-1.5 leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {qualifyingHighPriorityEmails.length === 0
              ? 'Nothing urgent right now.'
              : qualifyingHighPriorityEmails.length === 1
              ? '1 high-priority email is waiting for you.'
              : `${qualifyingHighPriorityEmails.length} high-priority emails are waiting for you.`}
          </p>
        </div>
      </header>

      {/* 2. "Needs you first" Strip: Shown ONLY when there are qualifying emails */}
      {needsYouFirstRows.length > 0 && (
        <section
          className="space-y-2.5 hub-animate-entrance"
          style={{ animationDelay: '100ms' }}
          aria-label="Needs you first"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Needs you first
            </h2>
            <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">
              {qualifyingHighPriorityEmails.length}{' '}
              {qualifyingHighPriorityEmails.length === 1 ? 'urgent email' : 'urgent emails'}
            </span>
          </div>

          <div className="space-y-2">
            {needsYouFirstRows.map((email) => (
              <button
                type="button"
                key={email.id}
                onClick={() => handleSelectEmail(email)}
                className="w-full text-left p-3.5 sm:p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-hover-tint)] active:scale-[0.99] transition-all flex items-center justify-between gap-3 focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)] group cursor-pointer shadow-none"
              >
                <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                  <span className="font-bold text-xs sm:text-sm text-[var(--color-text-body)] shrink-0 max-w-[120px] sm:max-w-[160px] truncate">
                    {email.senderName || email.senderEmail}
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-body)] truncate flex-1 min-w-0">
                    {email.subject}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E07A5F]/15 text-[#9C4C14] dark:text-[var(--accent-peach)] border border-[#E07A5F]/30">
                    High priority
                  </span>
                  <span className="text-[11px] text-[var(--color-text-secondary)] font-medium">
                    {formatRowDate(email.date)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 3. Grid of Category Cards: 2 columns from 480px width, 1 column below 480px */}
      <section
        className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-3 sm:gap-4"
        aria-label="Category cards"
      >
        {hubCards.map((card, index) => {
          const cardBaseDelay = needsYouFirstRows.length > 0 ? 150 : 100;
          const cardDelay = cardBaseDelay + Math.min(index * 50, 500);
          const countLabel = getCardCountLabel(card);

          return (
            <div
              key={card.id}
              className="hub-animate-entrance w-full"
              style={{ animationDelay: `${cardDelay}ms` }}
            >
              <button
                type="button"
                onClick={() => handleSelectCard(card.id)}
                className="hub-card w-full text-left p-5 sm:p-6 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-hover-tint)] outline-hidden shadow-none flex flex-col justify-between min-h-[120px] sm:min-h-[130px] group cursor-pointer"
              >
                <div className="space-y-2.5 w-full">
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
    </div>
  );
};
