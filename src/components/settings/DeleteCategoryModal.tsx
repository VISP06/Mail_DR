import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { EmailCategory } from '../../types';
import { DeleteCategoryOptions } from '../../context/InboxContext';

interface DeleteCategoryModalProps {
  isOpen: boolean;
  category: EmailCategory | null;
  affectedCount: number;
  remainingCategories: EmailCategory[];
  onConfirm: (options: DeleteCategoryOptions) => void;
  onCancel: () => void;
}

export const DeleteCategoryModal: React.FC<DeleteCategoryModalProps> = ({
  isOpen,
  category,
  affectedCount,
  remainingCategories,
  onConfirm,
  onCancel,
}) => {
  const [action, setAction] = useState<'resort' | 'uncategorize' | 'move'>('resort');
  const [targetCategoryId, setTargetCategoryId] = useState<string>(
    remainingCategories[0]?.id || ''
  );

  if (!isOpen || !category) return null;

  const handleConfirm = () => {
    onConfirm({
      categoryId: category.id,
      action,
      targetCategoryId: action === 'move' ? targetCategoryId : undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-category-title"
    >
      <div
        className="w-full max-w-lg p-6 sm:p-7 rounded-[28px] border border-[var(--color-border)] shadow-xl transition-all"
        style={{
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-body)',
        }}
      >
        <div className="flex items-start gap-3.5 mb-4">
          <div
            className="p-2.5 rounded-full shrink-0"
            style={{
              backgroundColor: 'rgba(230, 160, 199, 0.25)',
              color: '#C9557F',
            }}
          >
            <AlertCircle size={22} />
          </div>
          <div>
            <h3 id="delete-category-title" className="text-lg font-bold tracking-tight">
              Delete category "{category.name}"?
            </h3>
            <p
              className="mt-1 text-xs leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {affectedCount === 1
                ? '1 email currently uses this category.'
                : `${affectedCount} emails currently use this category.`}{' '}
              What should happen to them?
            </p>
          </div>
        </div>

        {/* 3 User Options */}
        <div className="space-y-3 my-5 py-3 border-y border-[var(--color-border)]">
          {/* Option 1: Re-sort automatically (default) */}
          <label className="flex items-start gap-3 p-3 rounded-2xl border border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-hover-tint)] transition-colors">
            <input
              type="radio"
              name="delete-action"
              value="resort"
              checked={action === 'resort'}
              onChange={() => setAction('resort')}
              className="mt-0.5 text-[#292D1E] focus:ring-[var(--accent-chartreuse)]"
            />
            <div className="text-xs">
              <span className="font-bold block text-[var(--color-text-body)]">
                Re-sort automatically (Recommended)
              </span>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                Gemini AI will reassign affected emails among the remaining categories.
              </span>
            </div>
          </label>

          {/* Option 2: Move to Uncategorized */}
          <label className="flex items-start gap-3 p-3 rounded-2xl border border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-hover-tint)] transition-colors">
            <input
              type="radio"
              name="delete-action"
              value="uncategorize"
              checked={action === 'uncategorize'}
              onChange={() => setAction('uncategorize')}
              className="mt-0.5 text-[#292D1E] focus:ring-[var(--accent-chartreuse)]"
            />
            <div className="text-xs">
              <span className="font-bold block text-[var(--color-text-body)]">
                Move to Uncategorized
              </span>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                Leave these emails unassigned until you triage them manually.
              </span>
            </div>
          </label>

          {/* Option 3: Move to another category */}
          <label className="flex flex-col gap-2 p-3 rounded-2xl border border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-hover-tint)] transition-colors">
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="delete-action"
                value="move"
                checked={action === 'move'}
                onChange={() => setAction('move')}
                className="mt-0.5 text-[#292D1E] focus:ring-[var(--accent-chartreuse)]"
              />
              <div className="text-xs">
                <span className="font-bold block text-[var(--color-text-body)]">
                  Move to another category
                </span>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  Reassign all affected emails directly to a selected category.
                </span>
              </div>
            </div>

            {action === 'move' && remainingCategories.length > 0 && (
              <div className="pl-6 pt-1">
                <select
                  value={targetCategoryId}
                  onChange={(e) => setTargetCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-body)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-chartreuse)]"
                >
                  {remainingCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </label>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] px-5 py-2 text-xs font-semibold rounded-full border border-[var(--color-border)] hover:bg-[var(--color-hover-tint)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="min-h-[44px] px-6 py-2 text-xs font-bold rounded-full transition-all bg-[#D65D7A] text-white hover:opacity-90 active:scale-98"
          >
            Delete Category
          </button>
        </div>
      </div>
    </div>
  );
};
