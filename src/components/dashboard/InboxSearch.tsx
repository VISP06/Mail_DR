import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useInbox } from '../../context/InboxContext';

interface InboxSearchProps {
  resultCount: number;
}

export const InboxSearch: React.FC<InboxSearchProps> = ({ resultCount }) => {
  const {
    searchQuery,
    setSearchQuery,
    activeCategoryFilter,
    setActiveCategoryFilter,
    getCategoryName,
  } = useInbox();

  const [inputValue, setInputValue] = useState(searchQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect touch screen to shorten placeholder on mobile/tablets
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        window.matchMedia('(pointer: coarse)').matches ||
        !window.matchMedia('(hover: hover)').matches ||
        (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
      );
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mql = window.matchMedia('(pointer: coarse)');
    const updateTouch = () => {
      setIsTouchDevice(
        mql.matches ||
        !window.matchMedia('(hover: hover)').matches ||
        (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
      );
    };

    if (mql.addEventListener) {
      mql.addEventListener('change', updateTouch);
      return () => mql.removeEventListener('change', updateTouch);
    } else {
      mql.addListener(updateTouch);
      return () => mql.removeListener(updateTouch);
    }
  }, []);

  // Sync internal input when context searchQuery changes (e.g., cleared externally)
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  // Debounce search update by 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(inputValue);
    }, 250);

    return () => clearTimeout(timer);
  }, [inputValue, setSearchQuery]);

  // Desktop keyboard shortcut: "/" focuses search unless inside another input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClear = () => {
    setInputValue('');
    setSearchQuery('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleClear();
    }
  };

  const handleSwitchToAll = () => {
    setActiveCategoryFilter('all');
  };

  // Determine current filter label
  const currentFilterLabel =
    activeCategoryFilter === 'all'
      ? 'All'
      : activeCategoryFilter === 'unread'
      ? 'Unread'
      : activeCategoryFilter === 'high-priority'
      ? 'High priority'
      : getCategoryName(activeCategoryFilter);

  const isSearching = Boolean(searchQuery.trim());

  return (
    <div className="w-full space-y-1.5" role="search">
      <div className="relative w-full max-w-xl">
        <label htmlFor="inbox-search-input" className="sr-only">
          Search emails
        </label>

        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-secondary)]">
          <Search size={16} />
        </div>

        <input
          ref={inputRef}
          id="inbox-search-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search emails"
          className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-secondary)]/70 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
          aria-describedby={isSearching ? 'search-results-info' : undefined}
        />

        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)] transition-colors cursor-pointer"
            title="Clear search (Esc)"
            aria-label="Clear search"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Accessible live region for screen readers */}
      <div role="status" aria-live="polite" className="sr-only">
        {isSearching
          ? `${resultCount} ${resultCount === 1 ? 'result' : 'results'} found in ${currentFilterLabel}`
          : ''}
      </div>

      {/* Small informative line under field when searching */}
      {isSearching && (
        <div
          id="search-results-info"
          className="flex flex-wrap items-center gap-2 text-xs px-1"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span>
            {resultCount} {resultCount === 1 ? 'result' : 'results'} in{' '}
            <strong className="text-[var(--color-text-body)] font-bold">{currentFilterLabel}</strong>
          </span>

          {activeCategoryFilter !== 'all' && (
            <button
              type="button"
              onClick={handleSwitchToAll}
              className="text-xs font-semibold underline underline-offset-2 hover:text-[var(--color-text-body)] transition-colors focus-visible:ring-1 focus-visible:ring-[var(--accent-chartreuse)] rounded-xs cursor-pointer"
            >
              Switch to All
            </button>
          )}
        </div>
      )}
    </div>
  );
};
