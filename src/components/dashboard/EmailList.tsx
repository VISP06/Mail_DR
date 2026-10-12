import React, { useMemo } from 'react';
import { useInbox } from '../../context/InboxContext';
import { SenderAvatar, CategoryBadge } from '../common/CategoryBadge';
import { OrganicBlob } from '../common/OrganicBlob';
import { ArrowUpDown, CheckCheck, Check, Search } from 'lucide-react';
import { searchEmails, highlightMatch } from '../../services/searchService';

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
  } = useInbox();

  // 1. Filter emails by category or high priority filter
  const categoryFilteredEmails = useMemo(() => {
    if (activeCategoryFilter === 'all') return emails;
    if (activeCategoryFilter === 'unread') return emails.filter((e) => e.isUnread);
    if (activeCategoryFilter === 'high-priority') {
      return emails.filter((e) => e.isUnread && getEmailPriority(e) === 'High');
    }
    return emails.filter((e) => e.categoryId === activeCategoryFilter);
  }, [emails, activeCategoryFilter, getEmailPriority]);

  // 2. Filter by search query inside current filter
  const filteredEmails = useMemo(() => {
    return searchEmails(searchQuery, categoryFilteredEmails);
  }, [searchQuery, categoryFilteredEmails]);

  // Total unread in the Unread category view
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

  return (
    <div id="email-list-section" className="space-y-4 scroll-mt-6">
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
              onClick={() => markAllAsRead(categoryFilteredEmails.filter((e) => e.isUnread).map((e) => e.id))}
              className="min-h-[38px] px-3.5 py-1 text-xs font-semibold rounded-full border border-[var(--color-border)] bg-[var(--color-hover-tint)] hover:bg-[var(--accent-chartreuse)]/25 text-[var(--color-text-body)] transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)] shadow-2xs active:scale-95"
              title={`Mark all ${unreadCountInUnreadView} unread emails as read`}
            >
              <Check size={13} className="text-[var(--color-text-body)] stroke-[2.5]" />
              <span>Mark all as read ({unreadCountInUnreadView})</span>
            </button>
          )}

          <span
            className="text-xs"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {filteredEmails.length} {filteredEmails.length === 1 ? 'message' : 'messages'}
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

      {/* Empty State: Search empty vs Catch-up empty */}
      {filteredEmails.length === 0 ? (
        isSearching ? (
          /* Empty search result */
          <div className="py-16 px-6 text-center flex flex-col items-center justify-center rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="w-12 h-12 rounded-full mb-3 flex items-center justify-center bg-[var(--accent-chartreuse)]/20 text-[#292D1E] border border-[var(--color-border)]">
              <Search size={20} />
            </div>
            <h3 className="text-base font-bold tracking-tight text-[var(--color-text-body)]">
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
          /* Empty State: You're all caught up (3 of 3 places with organic blob shape) */
          <div className="relative py-20 px-6 text-center flex flex-col items-center justify-center rounded-[28px] border border-[var(--color-border)] overflow-hidden">
            <div className="absolute w-56 h-48 opacity-80 pointer-events-none">
              <OrganicBlob variant="empty-state" className="w-full h-full" />
            </div>

            <div className="relative z-10 flex flex-col items-center max-w-sm">
              <div className="w-12 h-12 rounded-full mb-3 flex items-center justify-center bg-[var(--accent-chartreuse)]/20 text-[#292D1E] border border-[var(--color-border)]">
                <CheckCheck size={22} />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-[var(--color-text-body)]">
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
          {filteredEmails.map((email) => {
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
                      {/* Priority: small pill for High or Low only! Accessible contrast in both themes */}
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

                {/* Category Chip (on desktop) */}
                {category && (
                  <div className="hidden lg:block shrink-0">
                    <CategoryBadge category={category} size="sm" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
