import React from 'react';
import { useInbox } from '../../context/InboxContext';
import { UNCATEGORIZED_CATEGORY_ID } from '../../constants/app';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';

export const CategoryFilterChips: React.FC = () => {
  const {
    categories,
    activeCategoryFilter,
    setActiveCategoryFilter,
    emails,
    highPriorityUnreadCount,
    getEmailPriority,
    isCategorizing,
    categorizeProgress,
    categorizeError,
    retryCategorization,
  } = useInbox();

  // Compute total unread count (for Unread chip)
  const unreadTotal = emails.filter((e) => e.isUnread).length;

  // Category unread counts
  const categoryUnreadCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of categories) {
      counts[cat.id] = emails.filter(
        (e) => e.categoryId === cat.id && e.isUnread
      ).length;
    }
    return counts;
  }, [categories, emails]);

  // High-priority unread counts per category (last 30 days)
  const categoryHighPriorityCounts = React.useMemo(() => {
    const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const counts: Record<string, number> = {};
    for (const cat of categories) {
      counts[cat.id] = emails.filter((e) => {
        if (e.categoryId !== cat.id || !e.isUnread || e.isTrashed || e.isArchived) return false;
        if (getEmailPriority(e) !== 'High') return false;
        const emailTime = new Date(e.date).getTime();
        return !isNaN(emailTime) && emailTime >= thirtyDaysAgoMs;
      }).length;
    }
    return counts;
  }, [categories, emails, getEmailPriority]);

  // Total emails per category (to hide Uncategorized if 0)
  const categoryTotalCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of categories) {
      counts[cat.id] = emails.filter((e) => e.categoryId === cat.id).length;
    }
    return counts;
  }, [categories, emails]);

  // Track horizontal scroll state to render soft fade overlays on edges
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const checkScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  React.useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, categories.length, emails.length]);

  return (
    <div className="space-y-2">
      {/* AI Sorting Status / Retry Notification */}
      {(isCategorizing || categorizeError) && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-secondary)] animate-fadeIn">
          <div className="flex items-center gap-2">
            {isCategorizing ? (
              <>
                <Loader2 size={13} className="animate-spin text-[var(--accent-chartreuse)]" />
                <span>
                  Sorting your emails...
                  {categorizeProgress && ` (${categorizeProgress.processed}/${categorizeProgress.total})`}
                </span>
              </>
            ) : (
              <>
                <AlertCircle size={13} className="text-[var(--accent-peach)]" />
                <span>Some emails could not be categorized automatically.</span>
              </>
            )}
          </div>

          {categorizeError && (
            <button
              type="button"
              onClick={retryCategorization}
              className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-[var(--color-border)] hover:bg-[var(--color-hover-tint)] flex items-center gap-1 text-[var(--color-text-body)]"
            >
              <RefreshCw size={11} />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}

      {/* Chips Carousel Container with edge fade masks */}
      <div className="relative w-full">
        {/* Soft fade on the left edge (when scrolled) */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-8 pointer-events-none z-10 transition-opacity duration-200 ${
            canScrollLeft ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background:
              'linear-gradient(to right, var(--color-bg) 20%, transparent 100%)',
          }}
          aria-hidden="true"
        />

        {/* Soft fade on the right edge */}
        <div
          className={`absolute right-0 top-0 bottom-0 w-8 pointer-events-none z-10 transition-opacity duration-200 ${
            canScrollRight ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background:
              'linear-gradient(to left, var(--color-bg) 20%, transparent 100%)',
          }}
          aria-hidden="true"
        />

        <div
          ref={scrollRef}
          className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar"
          role="tablist"
          aria-label="Filter emails by category"
        >
        {/* All Emails Chip */}
        <button
          type="button"
          role="tab"
          aria-selected={activeCategoryFilter === 'all'}
          onClick={() => setActiveCategoryFilter('all')}
          className={`min-h-[40px] px-4 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all border focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)] ${
            activeCategoryFilter === 'all'
              ? 'border-[var(--accent-chartreuse)] bg-[var(--color-primary-btn)] text-[var(--color-primary-btn-text)] shadow-sm'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)] hover:bg-[var(--color-hover-tint)]'
          }`}
        >
          <span>All</span>
          <span className="ml-1.5 text-[11px] opacity-80">({emails.length})</span>
        </button>

        {/* Unread Chip */}
        <button
          type="button"
          role="tab"
          aria-selected={activeCategoryFilter === 'unread'}
          onClick={() => setActiveCategoryFilter('unread')}
          className={`min-h-[40px] px-4 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all border focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)] ${
            activeCategoryFilter === 'unread'
              ? 'border-[var(--accent-peach)] bg-[var(--color-primary-btn)] text-[var(--color-primary-btn-text)] shadow-sm'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)] hover:bg-[var(--color-hover-tint)]'
          }`}
        >
          <span>Unread</span>
          {unreadTotal > 0 && (
            <span
              className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold"
              style={{
                backgroundColor: 'var(--accent-peach)',
                color: '#292D1E',
              }}
            >
              {unreadTotal}
            </span>
          )}
        </button>

        {/* High Priority Chip: Directly after Unread and before categories */}
        <button
          type="button"
          role="tab"
          aria-selected={activeCategoryFilter === 'high-priority'}
          onClick={() => setActiveCategoryFilter('high-priority')}
          className={`min-h-[40px] px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all border flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)] ${
            activeCategoryFilter === 'high-priority'
              ? 'border-[var(--color-primary-btn)] bg-[var(--color-primary-btn)] text-[var(--color-primary-btn-text)] shadow-sm'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)] hover:bg-[var(--color-hover-tint)]'
          }`}
        >
          {/* Small orange dot */}
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: 'var(--accent-peach)' }}
          />
          <span>High priority</span>
          <span
            className="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
            style={{
              backgroundColor: 'var(--accent-peach)',
              color: '#292D1E',
            }}
          >
            {highPriorityUnreadCount}
          </span>
        </button>

        {/* Dynamic Categories */}
        {categories.map((cat) => {
          const totalInCat = categoryTotalCounts[cat.id] || 0;
          // Show Uncategorized chip whenever it contains emails
          if (cat.id === UNCATEGORIZED_CATEGORY_ID && totalInCat === 0) {
            return null;
          }

          const isSelected = activeCategoryFilter === cat.id;
          const unread = categoryUnreadCounts[cat.id] || 0;
          const highPriorityInCat = categoryHighPriorityCounts[cat.id] || 0;

          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setActiveCategoryFilter(cat.id)}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all border flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)] ${
                isSelected
                  ? 'border-[var(--color-primary-btn)] bg-[var(--color-primary-btn)] text-[var(--color-primary-btn-text)] shadow-sm'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)] hover:bg-[var(--color-hover-tint)]'
              }`}
            >
              {/* Category Color Dot */}
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <span>{cat.name}</span>
              <span className="text-[11px] opacity-80">({totalInCat})</span>
              {highPriorityInCat > 0 && (
                <span
                  className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#E07A5F]/20 text-[#9C4C14] dark:text-[var(--accent-peach)] border border-[#E07A5F]/30"
                  title={`${highPriorityInCat} high priority`}
                >
                  {highPriorityInCat} high priority
                </span>
              )}
              {unread > 0 && (
                <span
                  className="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
                  style={{
                    backgroundColor: cat.color,
                    color: '#292D1E',
                  }}
                  title={`${unread} unread`}
                >
                  {unread}
                </span>
              )}
            </button>
          );
        })}
        </div>
      </div>
    </div>
  );
};
