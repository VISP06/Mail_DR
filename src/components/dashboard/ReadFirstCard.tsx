import React from 'react';
import { Sparkles, RefreshCw, ArrowRight } from 'lucide-react';
import { useInbox } from '../../context/InboxContext';
import { OrganicBlob } from '../common/OrganicBlob';

export const ReadFirstCard: React.FC = () => {
  const {
    readFirstSuggestions,
    isLoadingSuggestions,
    refreshReadFirst,
    emails,
    openEmailById,
  } = useInbox();

  // Map suggestion emailId to actual email object
  const items = readFirstSuggestions
    .map((sug) => {
      const email = emails.find((e) => e.id === sug.emailId);
      return email ? { email, reason: sug.reason } : null;
    })
    .filter(Boolean)
    .slice(0, 5);

  if (items.length === 0 && !isLoadingSuggestions) {
    return null;
  }

  return (
    <section
      className="relative overflow-hidden rounded-[24px] border border-[var(--color-border)] p-6 transition-all"
      style={{
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text-body)',
      }}
      aria-label="What should I read first"
    >
      {/* Background Soft Organic Blob Shape (2 of 3 places) */}
      <div className="absolute -top-10 -right-6 w-48 h-32 opacity-70 pointer-events-none">
        <OrganicBlob variant="read-first" className="w-full h-full" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[var(--accent-chartreuse)]/25 flex items-center justify-center text-[#292D1E]">
              <Sparkles size={15} />
            </div>
            <h2 className="text-base font-bold tracking-tight">
              What should I read first?
            </h2>
          </div>

          <button
            type="button"
            onClick={refreshReadFirst}
            disabled={isLoadingSuggestions}
            title="Refresh AI suggestions"
            className="min-h-[40px] min-w-[40px] px-2.5 py-1 text-xs rounded-full border border-[var(--color-border)] flex items-center gap-1.5 hover:bg-[var(--color-hover-tint)] transition-all focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)] disabled:opacity-50"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <RefreshCw
              size={13}
              className={isLoadingSuggestions ? 'animate-spin' : ''}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {isLoadingSuggestions ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 rounded-2xl animate-pulse bg-[var(--color-hover-tint)]"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => (
              <button
                key={item!.email.id}
                type="button"
                onClick={() => openEmailById(item!.email.id)}
                className="group text-left p-3.5 rounded-2xl border border-[var(--color-border)] hover:border-[var(--accent-chartreuse)] hover:bg-[var(--color-hover-tint)] transition-all flex flex-col justify-between focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold truncate">
                      {item!.email.senderName}
                    </span>
                    {item!.email.isUnread && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: 'var(--accent-peach)' }}
                      />
                    )}
                  </div>
                  <p className="text-xs font-medium line-clamp-1 opacity-90 mb-1">
                    {item!.email.subject}
                  </p>
                  <p
                    className="text-xs line-clamp-2 leading-relaxed"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {item!.reason}
                  </p>
                </div>
                <div
                  className="mt-3 flex items-center gap-1 text-[11px] font-semibold transition-transform group-hover:translate-x-0.5"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <span>Open email</span>
                  <ArrowRight size={12} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
