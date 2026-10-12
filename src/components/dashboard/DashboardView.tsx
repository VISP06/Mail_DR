import React from 'react';
import { useInbox } from '../../context/InboxContext';
import { ReadFirstCard } from './ReadFirstCard';
import { CategoryFilterChips } from './CategoryFilterChips';
import { EmailList } from './EmailList';
import { InboxSearch } from './InboxSearch';
import { searchEmails } from '../../services/searchService';

export const DashboardView: React.FC = () => {
  const {
    emails,
    getEmailPriority,
    activeCategoryFilter,
    searchQuery,
    highPriorityUnreadCount,
  } = useInbox();

  // Get current date string in calm human format (e.g. "Sunday, October 11")
  const todayFormatted = React.useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  // Friendly greeting based on hour
  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Compute search result count inside active category or high priority filter
  const searchResultCount = React.useMemo(() => {
    let baseEmails = emails;
    if (activeCategoryFilter === 'unread') {
      baseEmails = emails.filter((e) => e.isUnread);
    } else if (activeCategoryFilter === 'high-priority') {
      baseEmails = emails.filter((e) => e.isUnread && getEmailPriority(e) === 'High');
    } else if (activeCategoryFilter !== 'all') {
      baseEmails = emails.filter((e) => e.categoryId === activeCategoryFilter);
    }

    return searchEmails(searchQuery, baseEmails).length;
  }, [emails, activeCategoryFilter, searchQuery, getEmailPriority]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-36 sm:pb-32">
      {/* 1. Dashboard Header: Greeting, Date, and High Priority Status Line */}
      <header className="pb-2">
        <div>
          <span
            className="text-xs font-semibold tracking-wide uppercase block mb-1 opacity-80"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {todayFormatted}
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight">
            {greeting}, Maya
          </h1>
          <p
            className="font-accent text-[17px] mt-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {highPriorityUnreadCount === 0
              ? "You're all caught up."
              : highPriorityUnreadCount === 1
              ? '1 high-priority email is waiting for you.'
              : `${highPriorityUnreadCount} high-priority emails are waiting for you.`}
          </p>
        </div>
      </header>

      {/* 2. "What should I read first?" Card (Place 2 of 3 with organic SVG blob shape) */}
      <ReadFirstCard />

      {/* 3. Category Filter Chips with Unread and High Priority Chips */}
      <CategoryFilterChips />

      {/* 4. Inbox Search: Pill-shaped input with icon, clear button, and result counts */}
      <InboxSearch resultCount={searchResultCount} />

      {/* 5 & 6. Sort and density row + Email List */}
      <EmailList />
    </div>
  );
};
