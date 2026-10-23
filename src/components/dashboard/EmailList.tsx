import React, { useMemo } from 'react';
import { useInbox } from '../../context/InboxContext';
import { SenderAvatar, CategoryBadge } from '../common/CategoryBadge';
import { OrganicBlob } from '../common/OrganicBlob';
import { ArrowUpDown, CheckCheck, Check, Search, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { searchEmails, highlightMatch } from '../../services/searchService';
import { READ_FIRST_DAYS } from '../../constants/app';
import { ConnectGmailCard } from '../auth/ConnectGmailCard';
import { CategorizationBanner } from '../common/CategorizationBanner';

export const EmailList: React.FC = () => {
  const {
    emails,
    activeCategoryFilter,
    openEmailById,
    getEmailPriority,
    getCategoryById,
    listDensity,
    setListDensity,
    sortByPriorityFirst,
    setSortByPriorityFirst,
    searchQuery,
    setSearchQuery,
    markAllAsRead,
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
    categories,
    moveEmailToCategory,
    isCategorizing,
    categorizeProgress,
    categorizeFailedCount,
    categorizeFailedReason,
    retryCategorization,
  } = useInbox();

  // 1. Filter emails by category or high priority filter
  const categoryFilteredEmails = useMemo(() => {
    if (activeCategoryFilter === 'all') return emails;
    if (activeCategoryFilter === 'unread') return emails.filter((e) => e.isUnread);
    if (activeCategoryFilter === 'high-priority') {
      const thirtyDaysAgoMs = Date.now() - READ_FIRST_DAYS * 24 * 60 * 60 * 1000;
      return emails.filter((e) => {
        if (!e.isUnread || getEmailPriority(e) !== 'High') return false;
        const emailTime = new Date(e.date).getTime();
        return !isNaN(emailTime) && emailTime >= thirtyDaysAgoMs;
      });
    }
    return emails.filter((e) => e.categoryId === activeCategoryFilter);
  }, [emails, activeCategoryFilter, getEmailPriority]);

  // 2. Filter by search query inside current filter
  const filteredEmails = useMemo(() => {
    return searchEmails(searchQuery, categoryFilteredEmails);
  }, [searchQuery, categoryFilteredEmails]);

  // Total unread in the Unread category view (uses ALL emails, not just visible ones)
  const unreadCountInUnreadView = useMemo(() => {
    return categoryFilteredEmails.filter((e) => e.isUnread).length;
  }, [categoryFilteredEmails]);

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const isSearching = Boolean(searchQuery.trim());

  // Performance pagination: show 50 emails at first, load 50 more with "Show more"
  const [visibleCount, setVisibleCount] = React.useState<number>(50);

  // Reset pagination when category filter, search query, or sort order changes
  React.useEffect(() => {
    setVisibleCount(50);
  }, [activeCategoryFilter, searchQuery, sortByPriorityFirst]);

  const visibleEmails = useMemo(() => {
    return filteredEmails.slice(0, visibleCount);
  }, [filteredEmails, visibleCount]);

  const hasMore = visibleCount < filteredEmails.length;
  const remainingCount = filteredEmails.length - visibleCount;

  const handleShowMore = () => {
    setVisibleCount((prev) => prev + 50);
  };

  // State 1: Restored session with no token in memory -> show Connect Gmail card
  if (needsGmailConnect && emails.length === 0) {
    return (
      <div className="py-8">
        <ConnectGmailCard isExpired={isGmailTokenExpired} onConnect={reconnectGmail} />
      </div>
    );
  }

  // State 2: Initial Gmail loading with 0 emails loaded yet -> show calm loading card
  if (isReadOnlyMode && isGmailLoading && emails.length === 0) {
    return (
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
    );
  }

  // State 3: 403 Forbidden with 0 emails loaded
  if (isReadOnlyMode && gmailErrorState?.type === '403' && emails.length === 0) {
    return (
      <div
        className="p-7 sm:p-9 rounded-[28px] border text-center flex flex-col items-center my-6"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--status-warning-border)',
        }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{
            backgroundColor: 'var(--status-warning-bg)',
            color: 'var(--status-warning-text)',
          }}
        >
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
    );
  }

  // State 4: Other error with 0 emails loaded
  if (isReadOnlyMode && gmailErrorState?.type === 'other' && emails.length === 0) {
    return (
      <div className="p-7 rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] text-center flex flex-col items-center my-6">
        <AlertCircle size={24} className="text-rose-500 mb-3" />
        <h3 className="font-heading text-base font-bold text-[var(--color-text-body)] mb-1">
          Unable to Load Gmail
        </h3>
        <p className="text-xs text-[var(--color-text-secondary)] max-w-sm mb-4">
          {gmailErrorState.message || 'An error occurred while connecting to Gmail.'}
        </p>
        <button
          type="button"
          onClick={() => loadEmails()}
          className="px-6 py-2.5 rounded-full text-xs font-semibold border border-[var(--color-border)] hover:bg-[var(--color-hover-tint)] cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div id="email-list-section" className="space-y-4 scroll-mt-6">
      {/* Expired connection card (keep everything on screen until user reconnects!) */}
      {isReadOnlyMode && (isGmailTokenExpired || gmailErrorState?.type === '401') && (
        <div className="mb-4">
          <ConnectGmailCard isExpired={true} onConnect={reconnectGmail} />
        </div>
      )}

      {/* 429 Rate limit retry notice */}
      {isReadOnlyMode && gmailErrorState?.type === '429' && (
        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center gap-2.5 text-xs text-[var(--color-text-body)]">
          <Loader2 size={16} className="animate-spin text-[var(--accent-chartreuse)]" />
          <span>Gmail is busy, retrying...</span>
        </div>
      )}

      {/* Incremental loading progress bar while emails are streaming in */}
      {isReadOnlyMode && isGmailLoading && emails.length > 0 && (
        <div className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between gap-3 text-xs">
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

      {/* Categorization progress indicator */}
      {isCategorizing && categorizeProgress && (
        <div className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Loader2 size={15} className="animate-spin text-[var(--accent-chartreuse)] shrink-0" />
            <span className="font-medium text-[var(--color-text-body)]">
              Sorting your emails, {categorizeProgress.processed} of {categorizeProgress.total}...
            </span>
          </div>
          <span className="text-[11px] text-[var(--color-text-secondary)] font-mono">
            {Math.round((categorizeProgress.processed / (categorizeProgress.total || 1)) * 100)}%
          </span>
        </div>
      )}

      {/* Categorization banner: with quiet auto-retry, status tokens, explain tooltip, and retry progress */}
      <CategorizationBanner />

      {/* List Toolbar: Density, Priority Sorters, and Mark All As Read */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 pb-1 border-b border-[var(--color-border)]">
        <div className="flex flex-wrap items-center gap-2">
          {/* Sort by Priority First Toggle */}
          <button
            type="button"
            onClick={() => setSortByPriorityFirst(!sortByPriorityFirst)}
            className={`min-h-[38px] px-3 py-1 text-xs rounded-full border transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)] ${
              sortByPriorityFirst
                ? 'border-[var(--accent-chartreuse)] bg-[var(--color-hover-tint)] font-semibold text-[var(--color-text-body)]'
                : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)]'
            }`}
            title="Sort priority items first, then date"
          >
            <ArrowUpDown size={13} />
            <span>Sort by Priority</span>
          </button>

          {/* Mark all as read button: appears ONLY when Unread filter chip is selected and there are unread emails */}
          {activeCategoryFilter === 'unread' && unreadCountInUnreadView > 0 && (
            <button
              type="button"
              disabled={isReadOnlyMode}
              onClick={() => {
                if (isReadOnlyMode) return;
                markAllAsRead(categoryFilteredEmails.filter((e) => e.isUnread).map((e) => e.id));
              }}
              className="min-h-[38px] px-3.5 py-1 text-xs font-semibold rounded-full border border-[var(--color-border)] bg-[var(--color-hover-tint)] hover:bg-[var(--accent-chartreuse)]/25 text-[var(--color-text-body)] transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)] shadow-2xs active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              title={isReadOnlyMode ? 'Read-only for now' : `Mark all ${unreadCountInUnreadView} unread emails as read`}
            >
              <Check size={13} className="text-[var(--color-text-body)] stroke-[2.5]" />
              <span>Mark all as read ({unreadCountInUnreadView})</span>
            </button>
          )}

          <span
            className="text-xs"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {filteredEmails.length} {filteredEmails.length === 1 ? 'email' : 'emails'}
          </span>
        </div>

        {/* Segmented Buttons for List Density */}
        <div
          className="inline-flex p-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-xs"
          role="group"
          aria-label="List density"
        >
          <button
            type="button"
            onClick={() => setListDensity('comfortable')}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              listDensity === 'comfortable'
                ? 'bg-[var(--color-primary-btn)] text-[var(--color-primary-btn-text)] font-semibold shadow-xs'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)]'
            }`}
          >
            Comfortable
          </button>
          <button
            type="button"
            onClick={() => setListDensity('compact')}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              listDensity === 'compact'
                ? 'bg-[var(--color-primary-btn)] text-[var(--color-primary-btn-text)] font-semibold shadow-xs'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)]'
            }`}
          >
            Compact
          </button>
        </div>
      </div>

      {/* Empty State: Only show "You're all caught up" if load succeeded and returned 0 emails */}
      {filteredEmails.length === 0 ? (
        isReadOnlyMode && !hasLoadedGmailSuccessfully ? null : isSearching ? (
          /* Empty search result */
          <div className="py-16 px-6 text-center flex flex-col items-center justify-center rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="w-12 h-12 rounded-full mb-3 flex items-center justify-center bg-[var(--accent-chartreuse)]/20 text-[#292D1E] border border-[var(--color-border)]">
              <Search size={20} />
            </div>
            <h3 className="font-accent text-[18px] tracking-tight text-[var(--color-text-body)]">
              No emails match "{searchQuery.trim()}"
            </h3>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)] max-w-sm">
              Try checking for typos or searching in a different category.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-4 px-4 py-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-hover-tint)] text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
            >
              Clear search
            </button>
          </div>
        ) : (
          /* Empty State: You're all caught up */
          <div className="relative py-20 px-6 text-center flex flex-col items-center justify-center rounded-[28px] border border-[var(--color-border)] overflow-hidden">
            <div className="absolute w-56 h-48 opacity-80 pointer-events-none">
              <OrganicBlob variant="empty-state" className="w-full h-full" />
            </div>

            <div className="relative z-10 flex flex-col items-center max-w-sm">
              <div className="w-12 h-12 rounded-full mb-3 flex items-center justify-center bg-[var(--accent-chartreuse)]/20 text-[#292D1E] border border-[var(--color-border)]">
                <CheckCheck size={22} />
              </div>
              <h3 className="font-accent text-[18px] tracking-tight text-[var(--color-text-body)]">
                {activeCategoryFilter === 'high-priority'
                  ? 'Nothing high priority is waiting.'
                  : "You're all caught up"}
              </h3>
              <p
                className="mt-1 text-sm leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {activeCategoryFilter === 'high-priority'
                  ? 'No high-priority unread emails right now. Enjoy the calm.'
                  : 'No emails in this view. Enjoy the calm and quiet.'}
              </p>
            </div>
          </div>
        )
      ) : (
        /* Email List */
        <div
          className="rounded-[24px] border border-[var(--color-border)] overflow-hidden divide-y divide-[var(--color-border)]"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          {visibleEmails.map((email) => {
            const category = getCategoryById(email.categoryId);
            const priority = getEmailPriority(email);

            return (
              <div
                key={email.id}
                role="button"
                tabIndex={0}
                onClick={() => openEmailById(email.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openEmailById(email.id);
                  }
                }}
                className={`group w-full text-left transition-all cursor-pointer flex items-center gap-3.5 hover:bg-[var(--color-hover-tint)] focus-visible:outline-none focus-visible:bg-[var(--color-hover-tint)] ${
                  listDensity === 'compact' ? 'px-4 py-2.5 min-h-[48px]' : 'px-5 py-4 min-h-[64px]'
                } ${email.isUnread ? 'bg-[var(--color-hover-tint)]/40' : ''}`}
              >
                {/* Sender Initial Circle with Category Color */}
                <SenderAvatar
                  name={email.senderName}
                  color={category?.color || '#C8B8D8'}
                  size={listDensity === 'compact' ? 'sm' : 'md'}
                />

                {/* Email Core Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Bold sender and small dot for unread */}
                      <span
                        className={`text-sm truncate ${
                          email.isUnread ? 'font-bold text-[var(--color-text-body)]' : 'font-medium'
                        }`}
                      >
                        {highlightMatch(email.senderName, searchQuery)}
                      </span>
                      {email.isUnread && (
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: 'var(--accent-peach)' }}
                          title="Unread"
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Priority: small pill for High or Low only! */}
                      {priority === 'High' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight uppercase bg-[#F0A66F]/25 dark:bg-[#F0A66F]/20 text-[#7C2D12] dark:text-[#FED7AA] border border-[#F0A66F]/50">
                          High
                        </span>
                      )}
                      {priority === 'Low' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-tight uppercase bg-[#74795A]/20 dark:bg-[#74795A]/25 text-[#2E331E] dark:text-[#DCE0C6] border border-[#74795A]/40">
                          Low
                        </span>
                      )}

                      <span
                        className="text-xs font-medium"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {formatDate(email.date)}
                      </span>
                    </div>
                  </div>

                  {/* Subject and Snippet */}
                  <div className="flex items-baseline gap-2">
                    <p
                      className={`text-xs truncate ${
                        email.isUnread
                          ? 'font-semibold text-[var(--color-text-body)]'
                          : 'font-normal opacity-90'
                      }`}
                    >
                      {highlightMatch(email.subject, searchQuery)}
                    </p>
                    {listDensity === 'comfortable' && (
                      <p
                        className="text-xs truncate hidden sm:block opacity-65 flex-1"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        — {email.snippet}
                      </p>
                    )}
                  </div>
                </div>

                {/* Category Tag on right side: normal contrast, category color, tap-to-change (remembers for sender) */}
                {category && (
                  <div
                    className="hidden sm:flex items-center shrink-0 relative"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <label htmlFor={`cat-select-${email.id}`} className="sr-only">
                      Change category for {email.senderName}
                    </label>
                    <div className="relative inline-flex items-center group/cat">
                      <div
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border shadow-2xs group-hover/cat:opacity-90 active:scale-95 cursor-pointer"
                        style={{
                          backgroundColor: `${category.color}25`,
                          borderColor: `${category.color}80`,
                          color: 'var(--color-text-body)',
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium">{category.name}</span>
                        <ChevronDown size={11} className="opacity-70 shrink-0 -mr-0.5" />
                      </div>

                      <select
                        id={`cat-select-${email.id}`}
                        value={email.categoryId || ''}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (e.target.value) {
                            moveEmailToCategory(email.id, e.target.value, true);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-xs"
                        title={`Change category (currently ${category.name}, remembers for ${email.senderName})`}
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Show More Pagination Button */}
      {hasMore && (
        <div className="pt-2 pb-6 flex flex-col items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleShowMore}
            className="min-h-[44px] px-6 py-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-hover-tint)] hover:border-[var(--accent-chartreuse)] text-xs font-semibold tracking-wide transition-all shadow-xs active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)] inline-flex items-center gap-2"
            style={{ color: 'var(--color-text-body)' }}
          >
            <span>Show 50 more</span>
            <span
              className="text-[11px] font-normal opacity-75"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              ({remainingCount} left)
            </span>
          </button>
          <span
            className="text-[11px]"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Showing {visibleEmails.length} of {filteredEmails.length}
          </span>
        </div>
      )}
    </div>
  );
};
