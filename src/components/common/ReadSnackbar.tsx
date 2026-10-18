import React from 'react';
import { createPortal } from 'react-dom';
import { Check, RotateCcw, X } from 'lucide-react';
import { useInbox } from '../../context/InboxContext';
import { useNavBreakpoint } from '../../hooks/useMediaQuery';

export const ReadSnackbar: React.FC = () => {
  const { readSnackbar, undoMarkAllAsRead, dismissReadSnackbar } = useInbox();
  const { isDesktop } = useNavBreakpoint();

  if (!readSnackbar || !readSnackbar.isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <aside
      className={`fixed ${
        isDesktop ? 'bottom-8 sm:bottom-10' : 'bottom-24 sm:bottom-28'
      } left-1/2 -translate-x-1/2 z-50 max-w-[90vw] sm:max-w-md px-4 py-3 rounded-2xl border border-[var(--color-border)] shadow-xl flex items-center justify-between gap-3 animate-fadeIn backdrop-blur-md select-none`}
      style={{
        backgroundColor: 'var(--color-surface-elevated)',
        color: 'var(--color-text-body)',
      }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-5 h-5 rounded-full flex items-center justify-center bg-[var(--accent-chartreuse)]/30 text-[#292D1E] shrink-0">
          <Check size={12} className="stroke-[3]" />
        </div>
        <span className="text-xs font-semibold truncate">
          {readSnackbar.message}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {readSnackbar.showUndo !== false && (
          <button
            type="button"
            onClick={undoMarkAllAsRead}
            className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
            style={{
              backgroundColor: 'var(--color-primary-btn)',
              color: 'var(--color-primary-btn-text)',
            }}
          >
            <RotateCcw size={12} />
            <span>Undo</span>
          </button>
        )}

        <button
          type="button"
          onClick={dismissReadSnackbar}
          className="p-1 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-tint)] transition-colors"
          title="Dismiss notification"
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      </div>
    </aside>,
    document.body
  );
};
