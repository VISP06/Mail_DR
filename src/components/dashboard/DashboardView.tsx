import React from 'react';
import { useInbox } from '../../context/InboxContext';
import { CategoryFilterChips } from './CategoryFilterChips';
import { EmailList } from './EmailList';
import { InboxSearch } from './InboxSearch';
import { searchEmails } from '../../services/searchService';
import { READ_FIRST_DAYS } from '../../constants/app';

export const DashboardView: React.FC = () => {
  const {
    emails,
    getEmailPriority,
    activeCategoryFilter,
    searchQuery,
  } = useInbox();

  // Compute search result count inside active category or high priority filter
  const searchResultCount = React.useMemo(() => {
    let baseEmails = emails;
    if (activeCategoryFilter === 'unread') {
      baseEmails = emails.filter((e) => e.isUnread);
    } else if (activeCategoryFilter === 'high-priority') {
      const thirtyDaysAgoMs = Date.now() - READ_FIRST_DAYS * 24 * 60 * 60 * 1000;
      baseEmails = emails.filter((e) => {
        if (!e.isUnread || getEmailPriority(e) !== 'High') return false;
        const emailTime = new Date(e.date).getTime();
        return !isNaN(emailTime) && emailTime >= thirtyDaysAgoMs;
      });
    } else if (activeCategoryFilter !== 'all') {
      baseEmails = emails.filter((e) => e.categoryId === activeCategoryFilter);
    }

    return searchEmails(searchQuery, baseEmails).length;
  }, [emails, activeCategoryFilter, searchQuery, getEmailPriority]);

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-5 pb-36 sm:pb-32">
      {/* 1. Inbox Search: Pill-shaped input with icon, clear button, and result counts */}
      <InboxSearch resultCount={searchResultCount} />

      {/* 2. Category Filter Chips with Unread and High Priority Chips */}
      <CategoryFilterChips />

      {/* 3. Sort and density row + Email List */}
      <EmailList />
    </div>
  );
};
