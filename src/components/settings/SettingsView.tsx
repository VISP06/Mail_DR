import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Shield,
  Palette,
  Tags,
  Sliders,
  Sun,
  Moon,
  Monitor,
  Bug,
  AlertCircle,
  X,
  Lock,
  ArrowUpDown,
  Inbox,
  Check,
  Clock,
  Mail,
} from 'lucide-react';
import { useInbox } from '../../context/InboxContext';
import { EmailCategory, PriorityLevel, ThemeMode } from '../../types';
import { DeleteCategoryModal } from './DeleteCategoryModal';
import { UNCATEGORIZED_CATEGORY_ID, PROTECT_RECENT_DAYS } from '../../constants/app';
import { isEmailProtected } from '../../services/cleanup';

const COLOR_OPTIONS = [
  '#C8B8D8', // lavender
  '#E6A0C7', // pink
  '#F0A66F', // peach
  '#E8F49A', // chartreuse
  '#74795A', // sage
  '#A0C4E6', // soft sky blue
  '#D8C8B8', // sand
  '#C0D8B8', // mint
];

export const SettingsView: React.FC = () => {
  const {
    setActiveView,
    emails,
    rawEmails,
    categories,
    getCategoryName,
    checkCategoryNameDuplicate,
    createCategory,
    updateCategory,
    requestDeleteCategory,
    confirmDeleteCategory,
    cancelDeleteCategory,
    deletePrompt,
    undoDeleteState,
    undoDeleteCategory,
    dismissUndo,
    priorityRules,
    addPriorityRule,
    removePriorityRule,
    sortByPriorityFirst,
    setSortByPriorityFirst,
    outdatedAfterDays,
    setOutdatedAfterDays,
    protectedSenders,
    cleanupGroups,
    listDensity,
    setListDensity,
    blockedSenders,
    unblockSender,
    themeMode,
    setThemeMode,
    resetCategoryData,
    resetSampleEmails,
    layoutDebugOverlay,
    setLayoutDebugOverlay,
    useLargeDataset,
    setUseLargeDataset,
    isDemo,
    gmailDebugStatus,
    lastCategorizeError,
  } = useInbox();

  const [isResettingEmails, setIsResettingEmails] = useState(false);

  // Live email counts for Debug section
  const emailCounts = useMemo(() => {
    const total = rawEmails.length;
    const unread = rawEmails.filter((e) => e.isUnread && !e.isTrashed && !e.isArchived).length;
    const trashed = rawEmails.filter((e) => Boolean(e.isTrashed)).length;
    const archived = rawEmails.filter((e) => Boolean(e.isArchived)).length;
    return { total, unread, trashed, archived };
  }, [rawEmails]);

  // Category editing state
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editColor, setEditColor] = useState(COLOR_OPTIONS[0]);
  const [editError, setEditError] = useState<string | null>(null);

  // New category state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState(COLOR_OPTIONS[0]);
  const [newError, setNewError] = useState<string | null>(null);

  // New priority rule state
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [ruleType, setRuleType] = useState<'sender' | 'category'>('sender');
  const [ruleTarget, setRuleTarget] = useState('');
  const [rulePriority, setRulePriority] = useState<PriorityLevel>('High');

  // Reset confirmation state
  const [isResetting, setIsResetting] = useState(false);

  const handleStartEditCategory = (cat: EmailCategory) => {
    if (cat.isSystem || cat.id === UNCATEGORIZED_CATEGORY_ID) return;
    setEditingCategoryId(cat.id);
    setEditName(cat.name);
    setEditDesc(cat.description);
    setEditColor(cat.color);
    setEditError(null);
  };

  const handleSaveEditCategory = () => {
    if (!editingCategoryId) return;
    const validationError = checkCategoryNameDuplicate(editName, editingCategoryId);
    if (validationError) {
      setEditError(validationError);
      return;
    }

    const res = updateCategory({
      id: editingCategoryId,
      name: editName,
      description: editDesc,
      color: editColor,
    });

    if (!res.success) {
      setEditError(res.error || 'Failed to update category.');
      return;
    }

    setEditingCategoryId(null);
    setEditError(null);
  };

  const handleSaveNewCategory = () => {
    const validationError = checkCategoryNameDuplicate(newName);
    if (validationError) {
      setNewError(validationError);
      return;
    }

    const res = createCategory({
      name: newName,
      description: newDesc,
      color: newColor,
    });

    if (!res.success) {
      setNewError(res.error || 'Failed to create category.');
      return;
    }

    setNewName('');
    setNewDesc('');
    setNewError(null);
    setIsAddingCategory(false);
  };

  const handleSaveNewRule = () => {
    if (!ruleTarget.trim()) return;
    addPriorityRule({
      type: ruleType,
      target: ruleTarget.trim(),
      priority: rulePriority,
    });
    setRuleTarget('');
    setIsAddingRule(false);
  };

  const remainingCategoriesForDelete = categories.filter(
    (c) => c.id !== deletePrompt?.category.id && c.id !== UNCATEGORIZED_CATEGORY_ID
  );

  return (
    <div className="max-w-4xl mx-auto py-2 space-y-8 pb-32">
      {/* 10-Second Undo Banner for Deleted Category */}
      {undoDeleteState && (
        <aside
          className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-md flex items-center justify-between gap-4 animate-fadeIn"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2.5 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: undoDeleteState.deletedCategory.color }}
            />
            <span>
              Category <strong>"{undoDeleteState.deletedCategory.name}"</strong> deleted.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={undoDeleteCategory}
              className="px-3.5 py-1.5 rounded-full bg-[var(--color-primary-btn)] text-[var(--color-primary-btn-text)] text-xs font-bold flex items-center gap-1.5 shadow-xs hover:opacity-90 active:scale-95 transition-all"
            >
              <RotateCcw size={12} />
              <span>Undo</span>
            </button>
            <button
              type="button"
              onClick={dismissUndo}
              className="p-1 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-tint)]"
              title="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        </aside>
      )}

      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setActiveView('dashboard')}
          className="min-h-[48px] px-4 py-2 rounded-full border border-[var(--color-border)] flex items-center gap-2 text-xs font-semibold hover:bg-[var(--color-hover-tint)] transition-all focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
          style={{ color: 'var(--color-text-body)' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Inbox</span>
        </button>

        <h1 className="font-heading text-xl sm:text-2xl font-extrabold tracking-tight">Settings</h1>
      </div>

      {/* =========================================================================
          SECTION 1: APPEARANCE (Theme as segmented control & List density)
         ========================================================================= */}
      <section
        className="p-6 rounded-[28px] border border-[var(--color-border)] transition-colors space-y-6"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <div className="flex items-center gap-2.5">
          <Palette size={18} className="text-[var(--accent-chartreuse)]" />
          <h2 className="font-heading text-base font-semibold tracking-tight">Appearance</h2>
        </div>

        {/* 1A. Theme Mode Segmented Control */}
        <div>
          <label className="text-xs font-bold block mb-1 text-[var(--color-text-body)]">
            Color Theme
          </label>
          <p
            className="text-xs mb-3 leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Follow system settings or lock to light or dark mode.
          </p>

          <div
            className="inline-flex p-1.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] text-xs w-full max-w-sm"
            role="group"
            aria-label="Theme selection"
          >
            {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => {
              const isSelected = themeMode === mode;
              const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor;

              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setThemeMode(mode)}
                  className={`flex-1 py-2 px-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all capitalize focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)] ${
                    isSelected
                      ? 'bg-[var(--color-primary-btn)] text-[var(--color-primary-btn-text)] shadow-xs'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)]'
                  }`}
                >
                  <Icon size={14} />
                  <span>{mode}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 1B. List Density Segmented Control */}
        <div className="pt-4 border-t border-[var(--color-border)]">
          <label className="text-xs font-bold block mb-1 text-[var(--color-text-body)]">
            Inbox List Density
          </label>
          <p
            className="text-xs mb-3 leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Control the spacing and preview length of email list rows.
          </p>

          <div
            className="inline-flex p-1.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] text-xs w-full max-w-sm"
            role="group"
            aria-label="Density selection"
          >
            {(['comfortable', 'compact'] as const).map((density) => {
              const isSelected = listDensity === density;

              return (
                <button
                  key={density}
                  type="button"
                  onClick={() => setListDensity(density)}
                  className={`flex-1 py-2 px-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all capitalize focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)] ${
                    isSelected
                      ? 'bg-[var(--color-primary-btn)] text-[var(--color-primary-btn-text)] shadow-xs'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)]'
                  }`}
                >
                  <span>{density}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: INBOX (Default sort: Priority first / Newest first)
         ========================================================================= */}
      <section
        className="p-6 rounded-[28px] border border-[var(--color-border)] transition-colors"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <div className="flex items-center gap-2.5 mb-2">
          <Inbox size={18} className="text-[var(--accent-lavender)]" />
          <h2 className="font-heading text-base font-semibold tracking-tight">Inbox</h2>
        </div>
        <p
          className="text-xs mb-4 leading-relaxed"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Preferences for sorting and managing your emails.
        </p>

        {/* Inbox Sorting */}
        <div className="mb-6">
          <label className="text-xs font-semibold block mb-2 text-[var(--color-text-body)]">
            Inbox Sorting
          </label>
          <div
            className="inline-flex p-1.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] text-xs w-full max-w-md"
            role="group"
            aria-label="Default sort selection"
          >
            <button
              type="button"
              onClick={() => setSortByPriorityFirst(true)}
              className={`flex-1 py-2 px-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)] ${
                sortByPriorityFirst
                  ? 'bg-[var(--color-primary-btn)] text-[var(--color-primary-btn-text)] shadow-xs'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)]'
              }`}
            >
              <ArrowUpDown size={14} />
              <span>Priority First</span>
            </button>
            <button
              type="button"
              onClick={() => setSortByPriorityFirst(false)}
              className={`flex-1 py-2 px-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)] ${
                !sortByPriorityFirst
                  ? 'bg-[var(--color-primary-btn)] text-[var(--color-primary-btn-text)] shadow-xs'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)]'
              }`}
            >
              <span>Newest First</span>
            </button>
          </div>
        </div>

        {/* Consider emails outdated after */}
        <div className="pt-6 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-2 mb-1.5">
            <Clock size={15} className="text-[var(--accent-peach)]" />
            <label className="text-xs font-semibold text-[var(--color-text-body)]">
              Consider emails outdated after
            </label>
          </div>
          <p
            className="text-xs mb-3 leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Emails older than this threshold become candidates for cleanup suggestions. Emails received within {PROTECT_RECENT_DAYS} days are always protected.
          </p>

          <div
            className="inline-flex p-1.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] text-xs w-full max-w-lg"
            role="group"
            aria-label="Consider emails outdated after"
          >
            {[
              { label: '30 days', days: 30 },
              { label: '90 days', days: 90 },
              { label: '6 months', days: 180 },
              { label: '1 year', days: 365 },
            ].map(({ label, days }) => {
              const isSelected = outdatedAfterDays === days;
              return (
                <button
                  key={days}
                  type="button"
                  onClick={() => setOutdatedAfterDays(days)}
                  className={`flex-1 py-2 px-2.5 rounded-xl font-semibold flex items-center justify-center transition-all focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)] ${
                    isSelected
                      ? 'bg-[var(--color-primary-btn)] text-[var(--color-primary-btn-text)] shadow-xs'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)]'
                  }`}
                >
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: ORGANIZE (Categories, Priority rules, Blocked senders)
         ========================================================================= */}
      <div className="space-y-6">
        <div className="px-1">
          <h2 className="font-heading text-lg font-bold tracking-tight text-[var(--color-text-body)]">
            Organize
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Manage category definitions, routing rules, and sender restrictions.
          </p>
        </div>

        {/* 3A. Categories Management */}
        <section
          className="p-6 rounded-[28px] border border-[var(--color-border)] transition-colors"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <Tags size={18} className="text-[var(--accent-peach)]" />
              <h3 className="font-heading text-base font-semibold tracking-tight">Email Categories</h3>
            </div>
            {!isAddingCategory && (
              <button
                type="button"
                onClick={() => {
                  setIsAddingCategory(true);
                  setNewError(null);
                }}
                className="min-h-[40px] px-3.5 py-1.5 text-xs font-semibold rounded-full border border-[var(--color-border)] hover:bg-[var(--color-hover-tint)] transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
              >
                <Plus size={14} />
                <span>Add Category</span>
              </button>
            )}
          </div>
          <p
            className="text-xs mb-5 leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Emails are auto-assigned using Gemini based on these descriptions. Duplicate names are not permitted.
          </p>

          {/* New Category Form with Inline Validation */}
          {isAddingCategory && (
            <div className="p-4 mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider">New Category</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium block mb-1">Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      if (newError) setNewError(null);
                    }}
                    placeholder="e.g. Travel, Side Project"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-chartreuse)]"
                  />
                  {newError && (
                    <p className="mt-1 text-[11px] font-medium text-rose-600 flex items-center gap-1">
                      <AlertCircle size={12} />
                      <span>{newError}</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-[11px] font-medium block mb-1">Color</label>
                  <div className="flex items-center gap-2 mt-1">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewColor(c)}
                        className={`w-6 h-6 rounded-full border transition-transform ${
                          newColor === c ? 'scale-125 ring-2 ring-offset-1' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: c, borderColor: 'rgba(0,0,0,0.1)' }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium block mb-1">
                  Description (used by Gemini AI to classify emails)
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  placeholder="Describe what kind of emails belong here..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-chartreuse)]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCategory(false);
                    setNewError(null);
                  }}
                  className="px-3 py-1.5 text-xs rounded-full border border-[var(--color-border)] hover:bg-[var(--color-hover-tint)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewCategory}
                  disabled={!newName.trim()}
                  className="px-4 py-1.5 text-xs font-semibold rounded-full bg-[var(--color-primary-btn)] text-[var(--color-primary-btn-text)] disabled:opacity-50"
                >
                  Save Category
                </button>
              </div>
            </div>
          )}

          {/* Existing Categories List */}
          <div className="divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
            {categories.map((cat) => {
              const isEditing = editingCategoryId === cat.id;

              if (isEditing) {
                return (
                  <div key={cat.id} className="p-4 bg-[var(--color-bg)] space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-medium block mb-1">Name</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => {
                            setEditName(e.target.value);
                            if (editError) setEditError(null);
                          }}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
                        />
                        {editError && (
                          <p className="mt-1 text-[11px] font-medium text-rose-600 flex items-center gap-1">
                            <AlertCircle size={12} />
                            <span>{editError}</span>
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-[11px] font-medium block mb-1">Color</label>
                        <div className="flex items-center gap-2 mt-1">
                          {COLOR_OPTIONS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setEditColor(c)}
                              className={`w-6 h-6 rounded-full border ${
                                editColor === c ? 'scale-125 ring-2 ring-offset-1' : ''
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-medium block mb-1">Description</label>
                      <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategoryId(null);
                          setEditError(null);
                        }}
                        className="px-3 py-1.5 text-xs rounded-full border border-[var(--color-border)]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEditCategory}
                        className="px-4 py-1.5 text-xs font-semibold rounded-full bg-[var(--color-primary-btn)] text-[var(--color-primary-btn-text)]"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={cat.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-[var(--color-hover-tint)] transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5"
                      style={{ backgroundColor: cat.color }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold">{cat.name}</h4>
                        {cat.isSystem && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-medium bg-[var(--color-hover-tint)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                            <Lock size={9} />
                            <span>System</span>
                          </span>
                        )}
                      </div>
                      <p
                        className="text-xs line-clamp-1 leading-relaxed mt-0.5"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {cat.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!cat.isSystem && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStartEditCategory(cat)}
                          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--color-hover-tint)] text-[var(--color-text-secondary)]"
                          title="Edit category"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => requestDeleteCategory(cat.id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-500/10 text-red-500"
                          title="Delete category"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3B. Priority Rules Management */}
        <section
          className="p-6 rounded-[28px] border border-[var(--color-border)] transition-colors"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <Sliders size={18} className="text-[var(--accent-chartreuse)]" />
              <h3 className="font-heading text-base font-semibold tracking-tight">Custom Priority Rules</h3>
            </div>
            {!isAddingRule && (
              <button
                type="button"
                onClick={() => {
                  setIsAddingRule(true);
                  setRuleTarget(categories[0]?.id || '');
                }}
                className="min-h-[40px] px-3.5 py-1.5 text-xs font-semibold rounded-full border border-[var(--color-border)] hover:bg-[var(--color-hover-tint)] transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
              >
                <Plus size={14} />
                <span>Add Priority Rule</span>
              </button>
            )}
          </div>
          <p
            className="text-xs mb-5 leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Assign High, Normal, or Low priority by sender or by category. The inbox sorts by priority first, then date. <strong>AI suggestions never override user rules.</strong>
          </p>

          {/* New Rule Form */}
          {isAddingRule && (
            <div className="p-4 mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider">New Priority Rule</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium block mb-1">Target Type</label>
                  <select
                    value={ruleType}
                    onChange={(e) => {
                      const newT = e.target.value as 'sender' | 'category';
                      setRuleType(newT);
                      setRuleTarget(newT === 'category' ? categories[0]?.id || '' : '');
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-body)]"
                  >
                    <option value="sender">Specific Sender Email</option>
                    <option value="category">Category</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium block mb-1">
                    {ruleType === 'sender' ? 'Sender Email Address' : 'Choose Category'}
                  </label>
                  {ruleType === 'sender' ? (
                    <input
                      type="email"
                      value={ruleTarget}
                      onChange={(e) => setRuleTarget(e.target.value)}
                      placeholder="e.g. boss@company.com"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-body)]"
                    />
                  ) : (
                    <select
                      value={ruleTarget || categories[0]?.id}
                      onChange={(e) => setRuleTarget(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-body)]"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-medium block mb-1">Priority Level</label>
                  <select
                    value={rulePriority}
                    onChange={(e) => setRulePriority(e.target.value as PriorityLevel)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-body)]"
                  >
                    <option value="High">High Priority</option>
                    <option value="Normal">Normal Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingRule(false)}
                  className="px-3 py-1.5 text-xs rounded-full border border-[var(--color-border)] hover:bg-[var(--color-hover-tint)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewRule}
                  disabled={!ruleTarget.trim()}
                  className="px-4 py-1.5 text-xs font-semibold rounded-full bg-[var(--color-primary-btn)] text-[var(--color-primary-btn-text)] disabled:opacity-50"
                >
                  Save Rule
                </button>
              </div>
            </div>
          )}

          {/* Priority Rules List */}
          <div className="divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
            {priorityRules.length === 0 ? (
              <p className="p-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                No custom rules configured yet.
              </p>
            ) : (
              priorityRules.map((rule) => {
                const displayTarget = rule.type === 'category' ? getCategoryName(rule.target) : rule.target;

                return (
                  <div
                    key={rule.id}
                    className="p-3.5 flex items-center justify-between gap-4 hover:bg-[var(--color-hover-tint)] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Accessible High/Low Priority Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${
                          rule.priority === 'High'
                            ? 'bg-[#F0A66F]/25 text-[#8A3A05] dark:text-[#FED7AA] border border-[#F0A66F]/50'
                            : rule.priority === 'Low'
                            ? 'bg-[#74795A]/20 text-[#3E4329] dark:text-[#D6D9BF] border border-[#74795A]/40'
                            : 'bg-[#C8B8D8]/25 text-[#3D304A] dark:text-[#E8DEF2] border border-[#C8B8D8]/40'
                        }`}
                      >
                        {rule.priority}
                      </span>
                      <div>
                        <span className="text-xs font-semibold">{displayTarget}</span>
                        <span
                          className="text-[11px] ml-2"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          ({rule.type})
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removePriorityRule(rule.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-500/10 text-red-500"
                      title="Remove rule"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* 3C. Blocked Senders List with Undo Option */}
        <section
          className="p-6 rounded-[28px] border border-[var(--color-border)] transition-colors"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          <div className="flex items-center gap-2.5 mb-2">
            <Shield size={18} className="text-[#C9557F]" />
            <h3 className="font-heading text-base font-semibold tracking-tight">Blocked Senders</h3>
          </div>
          <p
            className="text-xs mb-5 leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Emails from blocked senders are hidden from your inbox. You can restore any sender at any time.
          </p>

          {blockedSenders.length === 0 ? (
            <div
              className="p-4 rounded-2xl border border-[var(--color-border)] font-accent text-[16px] text-center"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              No blocked senders. Your inbox is serene.
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
              {blockedSenders.map((sender) => (
                <div
                  key={sender}
                  className="p-3.5 flex items-center justify-between gap-4 hover:bg-[var(--color-hover-tint)]"
                >
                  <span className="text-xs font-medium truncate">{sender}</span>
                  <button
                    type="button"
                    onClick={() => unblockSender(sender)}
                    className="min-h-[36px] px-3 py-1 rounded-full border border-[var(--color-border)] hover:bg-[var(--color-hover-tint)] text-xs font-semibold flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
                    title="Unblock sender"
                  >
                    <RotateCcw size={12} />
                    <span>Undo Block</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* =========================================================================
          SECTION 4: DEBUG (TEMPORARY)
         ========================================================================= */}
      <section
        className="p-6 rounded-[28px] border border-[var(--color-border)] transition-colors"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <Bug size={18} className="text-[var(--accent-chartreuse)]" />
            <h2 className="font-heading text-base font-semibold tracking-tight">Debug (temporary)</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isDemo && (
              <button
                type="button"
                onClick={async () => {
                  if (
                    window.confirm(
                      'Reset sample emails back to their original read, unread, trashed, and archived states? (Categories, rules, and protected senders will not be changed)'
                    )
                  ) {
                    setIsResettingEmails(true);
                    await resetSampleEmails();
                    setIsResettingEmails(false);
                  }
                }}
                disabled={isResettingEmails}
                className="min-h-[36px] px-4 py-1.5 text-xs font-bold rounded-full border border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-50"
              >
                {isResettingEmails ? 'Resetting emails...' : 'Reset sample emails'}
              </button>
            )}

            <button
              type="button"
              onClick={async () => {
                if (window.confirm('Reset all categories and assignments back to factory state?')) {
                  setIsResetting(true);
                  await resetCategoryData();
                  setIsResetting(false);
                }
              }}
              disabled={isResetting}
              className="min-h-[36px] px-4 py-1.5 text-xs font-bold rounded-full border border-rose-400/40 text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
            >
              {isResetting ? 'Resetting...' : 'Reset category data'}
            </button>
          </div>
        </div>

        <p
          className="text-xs mb-3 leading-relaxed"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Internal diagnostics: raw category IDs, resolved category names, and classification source per email.
        </p>

        {/* Live email counts line */}
        <p className="text-xs font-mono font-medium text-[var(--color-text-secondary)] mb-4">
          Emails: {emailCounts.total} total, {emailCounts.unread} unread, {emailCounts.trashed} trashed, {emailCounts.archived} archived
        </p>

        {/* Gmail Status Diagnostic Block (Requirement 6) */}
        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--color-text-body)] flex items-center gap-2">
              <Mail size={14} className="text-[var(--accent-chartreuse)]" />
              Gmail status
            </span>
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                gmailDebugStatus.tokenPresent
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-zinc-500/15 text-zinc-500 border-zinc-500/30'
              }`}
            >
              token present ({gmailDebugStatus.tokenPresent ? 'yes' : 'no'})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
            <div className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <span className="text-[11px] text-[var(--color-text-secondary)] block font-sans mb-0.5">
                Last request path:
              </span>
              <span className="font-semibold text-[var(--color-text-body)] break-all">
                {gmailDebugStatus.lastRequestPath || 'None'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <span className="text-[11px] text-[var(--color-text-secondary)] block font-sans mb-0.5">
                HTTP status &amp; error reason:
              </span>
              <span className="font-semibold text-[var(--color-text-body)]">
                {gmailDebugStatus.lastHttpStatus !== null
                  ? `${gmailDebugStatus.lastHttpStatus}${
                      gmailDebugStatus.lastErrorReason ? ` (${gmailDebugStatus.lastErrorReason})` : ''
                    }`
                  : 'None'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <span className="text-[11px] text-[var(--color-text-secondary)] block font-sans mb-0.5">
                Emails requested / loaded:
              </span>
              <span className="font-semibold text-[var(--color-text-body)]">
                {gmailDebugStatus.emailsRequested} requested / {gmailDebugStatus.emailsLoaded} loaded
              </span>
            </div>

            <div className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <span className="text-[11px] text-[var(--color-text-secondary)] block font-sans mb-0.5">
                Last attempt time:
              </span>
              <span className="font-semibold text-[var(--color-text-body)]">
                {gmailDebugStatus.lastAttemptTime || 'None'}
              </span>
            </div>
          </div>

          {/* Health check profile response (Requirement 5) */}
          {gmailDebugStatus.profileHealth && (
            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-sans font-semibold text-[var(--color-text-body)]">
                  Profile Health Check (/profile)
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    gmailDebugStatus.profileHealth.status === 'ok'
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/20 text-rose-500'
                  }`}
                >
                  {gmailDebugStatus.profileHealth.status}
                </span>
              </div>
              {gmailDebugStatus.profileHealth.status === 'ok' ? (
                <p className="font-mono text-[11px] text-[var(--color-text-secondary)]">
                  Account: {gmailDebugStatus.profileHealth.emailAddress} • Messages: {gmailDebugStatus.profileHealth.messagesTotal} • Threads: {gmailDebugStatus.profileHealth.threadsTotal} • Checked: {gmailDebugStatus.profileHealth.checkedAt}
                </p>
              ) : (
                <p className="font-mono text-[11px] text-rose-500">
                  Error: {gmailDebugStatus.profileHealth.error} • Checked: {gmailDebugStatus.profileHealth.checkedAt}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Layout debug overlay toggle */}
        <div className="flex items-center justify-between p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] mb-4">
          <div className="pr-4">
            <label
              htmlFor="layout-debug-overlay-toggle"
              className="text-xs font-bold block text-[var(--color-text-body)] cursor-pointer"
            >
              Layout debug overlay
            </label>
            <p
              className="text-xs leading-relaxed mt-0.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Show fixed viewport dimensions, active navigation component, bounding boxes, and media query status in the top-left corner.
            </p>
          </div>

          <button
            id="layout-debug-overlay-toggle"
            type="button"
            role="switch"
            aria-checked={layoutDebugOverlay}
            onClick={() => setLayoutDebugOverlay(!layoutDebugOverlay)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)] ${
              layoutDebugOverlay
                ? 'bg-[var(--accent-chartreuse)]'
                : 'bg-zinc-300 dark:bg-zinc-700'
            }`}
            title="Toggle layout debug overlay"
          >
            <span className="sr-only">Layout debug overlay</span>
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-zinc-900 shadow-sm ring-0 transition duration-200 ease-in-out ${
                layoutDebugOverlay ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Use large sample set toggle (Demo mode only) */}
        {isDemo && (
          <div className="flex items-center justify-between p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] mb-4">
            <div className="pr-4">
              <label
                htmlFor="large-dataset-toggle"
                className="text-xs font-bold block text-[var(--color-text-body)] cursor-pointer"
              >
                Use large sample set
              </label>
              <p
                className="text-xs leading-relaxed mt-0.5"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Load the full dataset (800+ emails) for testing Cleanup and volume stress tests. Switch off to return to just the original 40 hand-written emails.
              </p>
            </div>

            <button
              id="large-dataset-toggle"
              type="button"
              role="switch"
              aria-checked={useLargeDataset}
              onClick={() => setUseLargeDataset(!useLargeDataset)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)] ${
                useLargeDataset
                  ? 'bg-[var(--accent-chartreuse)]'
                  : 'bg-zinc-300 dark:bg-zinc-700'
              }`}
              title="Toggle large sample dataset"
            >
              <span className="sr-only">Use large sample set</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-zinc-900 shadow-sm ring-0 transition duration-200 ease-in-out ${
                  useLargeDataset ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )}

        {/* Category & Source Diagnostic Counts */}
        {(() => {
          const catCounts: Record<string, number> = {};
          const sourceCounts: Record<string, number> = {};
          for (const email of emails) {
            const cId = email.categoryId || UNCATEGORIZED_CATEGORY_ID;
            catCounts[cId] = (catCounts[cId] || 0) + 1;
            const src = email.categorySource || 'fallback';
            sourceCounts[src] = (sourceCounts[src] || 0) + 1;
          }

          let accountedTotal = 0;
          for (const count of Object.values(catCounts)) {
            accountedTotal += count;
          }
          const hasMismatch = accountedTotal !== emails.length;

          return (
            <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--color-text-body)]">
                  Category &amp; Source Diagnostics
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    hasMismatch
                      ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                      : 'bg-[var(--accent-chartreuse)]/25 text-[#292D1E] dark:text-[var(--accent-chartreuse)]'
                  }`}
                >
                  Category totals: {accountedTotal} of {emails.length} emails accounted for
                </span>
              </div>

              {hasMismatch && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>
                    Warning: Category total count ({accountedTotal}) does not match the total email count ({emails.length}).
                  </span>
                </div>
              )}

              {/* Counts per Category */}
              <div>
                <span className="text-[11px] font-semibold block text-[var(--color-text-secondary)] mb-1">
                  Count per category:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((c) => {
                    const cnt = catCounts[c.id] || 0;
                    return (
                      <span
                        key={c.id}
                        className="text-[11px] px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center gap-1.5"
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="font-medium text-[var(--color-text-body)]">{c.name}:</span>
                        <span className="font-bold">{cnt}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Counts per CategorySource */}
              <div>
                <span className="text-[11px] font-semibold block text-[var(--color-text-secondary)] mb-1">
                  Count per categorySource:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(['rule', 'ai', 'user', 'fallback'] as const).map((src) => {
                    const cnt = sourceCounts[src] || 0;
                    return (
                      <span
                        key={src}
                        className="text-[11px] px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center gap-1.5 font-mono"
                      >
                        <span className="font-medium uppercase text-[10px] text-[var(--color-text-secondary)]">{src}:</span>
                        <span className="font-bold text-[var(--color-text-body)]">{cnt}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Last Categorization Error (STEP 5) */}
              <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
                  Last categorization error:
                </span>
                <span className="font-mono font-medium text-[var(--color-text-body)]">
                  {lastCategorizeError ? (
                    <span className="text-rose-500 font-semibold">{lastCategorizeError}</span>
                  ) : (
                    <span className="text-[var(--color-text-secondary)]">None</span>
                  )}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Cleanup Feature Diagnostic Groups */}
        {(() => {
          let totalUnprotected = 0;
          let totalSkippedProtected = 0;
          let leakedProtectedCount = 0;

          for (const g of cleanupGroups) {
            totalUnprotected += g.count;
            totalSkippedProtected += g.skippedProtectedCount;
            // Validate safety: ensure no protected email appears in any cleanup group
            for (const emailId of g.emailIds) {
              const email = rawEmails.find((e) => e.id === emailId);
              if (email && isEmailProtected(email, protectedSenders)) {
                leakedProtectedCount++;
              }
            }
          }
          const totalCandidates = totalUnprotected + totalSkippedProtected;

          return (
            <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] mb-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-[var(--color-text-body)] block">
                    Cleanup Feature Groups (8 Built-in Groups)
                  </span>
                  <span className="text-[11px] text-[var(--color-text-secondary)]">
                    Outdated after: {outdatedAfterDays} days (Verification codes: 7 days) • Safety window: {PROTECT_RECENT_DAYS} days
                  </span>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-body)]">
                  Total candidates: {totalCandidates} ({totalUnprotected} actionable, {totalSkippedProtected} protected)
                </span>
              </div>

              {/* Safety Confirmation / Red Warning */}
              {leakedProtectedCount > 0 ? (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2 font-semibold">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>
                    Warning: {leakedProtectedCount} protected {leakedProtectedCount === 1 ? 'email appears' : 'emails appear'} in cleanup groups!
                  </span>
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1.5 font-medium">
                  <Check size={14} className="shrink-0" />
                  <span>No protected email appears in any cleanup group. ({totalSkippedProtected} protected candidates safely skipped)</span>
                </div>
              )}

              {/* Groups List */}
              <div className="space-y-2">
                {cleanupGroups.map((g) => (
                  <div
                    key={g.id}
                    className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-[var(--color-text-body)]">{g.title}</span>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="px-2.5 py-0.5 rounded-md font-semibold bg-[var(--accent-chartreuse)]/25 text-[#292D1E] dark:text-[var(--accent-chartreuse)]">
                          Count: {g.count}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                          Skipped for safety: {g.skippedProtectedCount}
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] text-[var(--color-text-secondary)]">
                      <span className="font-semibold text-[var(--color-text-body)]">Top senders: </span>
                      {g.sampleSenders.length > 0 ? g.sampleSenders.join(', ') : 'None'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="max-h-72 overflow-y-auto rounded-2xl border border-[var(--color-border)] divide-y divide-[var(--color-border)] text-[11px] font-mono">
          {emails.map((email) => {
            const resolvedName = getCategoryName(email.categoryId);

            return (
              <div
                key={email.id}
                className="p-3 flex flex-wrap items-center justify-between gap-2 hover:bg-[var(--color-hover-tint)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--color-text-body)]">[{email.id}]</span>
                    <span className="truncate opacity-90">{email.subject}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]">
                    id: {email.categoryId}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[var(--accent-chartreuse)]/25 text-[#292D1E]">
                    {resolvedName}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded ${
                      email.categorySource === 'user'
                        ? 'bg-purple-100 text-purple-800'
                        : email.categorySource === 'ai'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {email.categorySource}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Delete Category Confirmation Dialog */}
      <DeleteCategoryModal
        isOpen={Boolean(deletePrompt)}
        category={deletePrompt?.category || null}
        affectedCount={deletePrompt?.affectedCount || 0}
        remainingCategories={remainingCategoriesForDelete}
        onConfirm={confirmDeleteCategory}
        onCancel={cancelDeleteCategory}
      />
    </div>
  );
};
