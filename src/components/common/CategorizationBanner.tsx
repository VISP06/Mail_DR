import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Loader2, HelpCircle, X } from 'lucide-react';
import { useInbox } from '../../context/InboxContext';

export const CategorizationBanner: React.FC = () => {
  const {
    categorizeFailedCount,
    categorizeFailedReason,
    isCategorizing,
    isRetryingCategorize,
    retryResultBanner,
    dismissedFailedCount,
    retryCategorization,
    dismissCategorizeBanner,
    clearRetryResultBanner,
  } = useInbox();

  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    if (!showTooltip) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setShowTooltip(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showTooltip]);

  // If initial AI categorization is actively running, don't show the error banner yet
  if (isCategorizing && !isRetryingCategorize) {
    return null;
  }

  // Determine what message and type to show
  let bannerType: 'warning' | 'success' | null = null;
  let bannerMessage = '';
  let showRetryButton = false;

  if (retryResultBanner) {
    bannerType = retryResultBanner.type === 'success' ? 'success' : 'warning';
    bannerMessage = retryResultBanner.message;
    // If retry still left failed emails, keep the Retry button available
    if (retryResultBanner.type !== 'success' && categorizeFailedCount > 0) {
      showRetryButton = true;
    }
  } else if (categorizeFailedCount > 0) {
    // Check if dismissed by user for this exact failure count
    if (dismissedFailedCount === categorizeFailedCount) {
      return null;
    }
    bannerType = 'warning';
    bannerMessage = `Couldn't sort ${categorizeFailedCount} ${
      categorizeFailedCount === 1 ? 'email' : 'emails'
    }${categorizeFailedReason ? `: ${categorizeFailedReason}` : ''}`;
    showRetryButton = true;
  } else {
    return null;
  }

  const isSuccess = bannerType === 'success';

  return (
    <div
      role="region"
      aria-label="Email categorization status"
      className="relative flex items-center justify-between gap-2.5 py-2 px-3 sm:px-3.5 rounded-xl border text-xs transition-all shadow-xs"
      style={{
        backgroundColor: isSuccess ? 'var(--status-success-bg)' : 'var(--status-warning-bg)',
        color: isSuccess ? 'var(--status-success-text)' : 'var(--status-warning-text)',
        borderColor: isSuccess ? 'var(--status-success-border)' : 'var(--status-warning-border)',
      }}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {isSuccess ? (
          <CheckCircle2 size={14} className="shrink-0" style={{ color: 'var(--status-success-text)' }} />
        ) : (
          <AlertCircle size={14} className="shrink-0" style={{ color: 'var(--status-warning-text)' }} />
        )}

        <span className="font-medium truncate leading-tight">{bannerMessage}</span>

        {/* Explain "?" icon with tooltip/sheet */}
        <div className="relative shrink-0" ref={tooltipRef}>
          <button
            type="button"
            onClick={() => setShowTooltip((prev) => !prev)}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            aria-label="How sorting works"
            className="w-4 h-4 rounded-full flex items-center justify-center opacity-85 hover:opacity-100 transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current"
            style={{
              backgroundColor: isSuccess ? 'rgba(20, 83, 45, 0.12)' : 'rgba(120, 53, 15, 0.12)',
            }}
          >
            <HelpCircle size={11} />
          </button>

          {showTooltip && (
            <div
              role="tooltip"
              className="absolute left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 bottom-full mb-2 w-64 p-2.5 rounded-xl shadow-lg border text-[11px] leading-relaxed z-50 animate-nav-fade-in backdrop-blur-md"
              style={{
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-body)',
                borderColor: 'var(--color-border)',
              }}
            >
              <p className="font-medium">
                MailDR sorts each email into a category. Rules handle most. AI handles the rest. Unsorted
                emails still appear under All and Unread.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {showRetryButton && (
          <button
            type="button"
            onClick={retryCategorization}
            disabled={isRetryingCategorize}
            className="px-2.5 py-1 rounded-lg font-semibold text-[11px] border transition-all cursor-pointer shadow-2xs flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-body)',
              borderColor: 'var(--status-warning-border)',
            }}
          >
            {isRetryingCategorize ? (
              <>
                <Loader2 size={12} className="animate-spin text-[var(--status-warning-text)]" />
                <span>Sorting...</span>
              </>
            ) : (
              <span>Retry</span>
            )}
          </button>
        )}

        {/* Dismiss 'X' button */}
        <button
          type="button"
          onClick={() => {
            if (retryResultBanner) {
              clearRetryResultBanner();
            }
            dismissCategorizeBanner();
          }}
          aria-label="Dismiss notice"
          className="p-1 rounded-md opacity-75 hover:opacity-100 transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
};
