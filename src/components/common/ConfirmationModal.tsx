import React, { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="w-full max-w-md p-6 rounded-[24px] border border-[var(--color-border)] shadow-xl transition-all"
        style={{
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-body)',
        }}
      >
        <div className="flex items-start gap-3.5 mb-3">
          <div
            className="p-2.5 rounded-full shrink-0"
            style={{
              backgroundColor: isDestructive ? 'rgba(230, 160, 199, 0.2)' : 'rgba(232, 244, 154, 0.2)',
              color: isDestructive ? '#C9557F' : '#6B7A22',
            }}
          >
            <AlertCircle size={20} />
          </div>
          <div>
            <h3 id="modal-title" className="text-lg font-bold tracking-tight">
              {title}
            </h3>
            <p
              className="mt-1 text-sm leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[48px] px-5 py-2.5 text-sm font-medium rounded-full border border-[var(--color-border)] hover:bg-[var(--color-hover-tint)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[48px] px-6 py-2.5 text-sm font-semibold rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
            style={{
              backgroundColor: isDestructive ? '#D65D7A' : 'var(--color-primary-btn)',
              color: isDestructive ? '#FFFFFF' : 'var(--color-primary-btn-text)',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
