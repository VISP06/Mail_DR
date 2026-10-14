import React, { useState, useMemo, useRef } from 'react';
import {
  Sparkles,
  Trash2,
  Archive,
  Eye,
  Shield,
  RotateCcw,
  ArrowRight,
  Clock,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useInbox } from '../../context/InboxContext';
import { CleanupGroup, Email } from '../../types';
import { OrganicBlob } from '../common/OrganicBlob';
import { useNavBreakpoint } from '../../hooks/useMediaQuery';

export const CleanupView: React.FC = () => {
  const {
    cleanupGroups,
    outdatedAfterDays,
    rawEmails,
    trashEmails,
    archiveEmails,
    restoreEmails,
    recordCleanupAction,
    undoCleanupAction,
    cleanupHistory,
    protectedSenders,
    addProtectedSender,
    setActiveView,
  } = useInbox();

  const { isDesktop } = useNavBreakpoint();

  // Fast email lookup map for sample preview in Review sheet
  const emailMap = useMemo(() => {
    const map = new Map<string, Email>();
    for (const email of rawEmails) {
      map.set(email.id, email);
    }
    return map;
  }, [rawEmails]);

  // Overall count of actionable emails safe to clear
  const totalSafeToClear = useMemo(() => {
    return cleanupGroups.reduce((acc, g) => acc + g.count, 0);
  }, [cleanupGroups]);

  // Modals and sheets state
  const [reviewGroup, setReviewGroup] = useState<CleanupGroup | null>(null);
  const [confirmState, setConfirmState] = useState<{
    group: CleanupGroup;
    action: 'trash' | 'archive';
  } | null>(null);
  const [keepGroup, setKeepGroup] = useState<CleanupGroup | null>(null);

  // Floating snackbar state with 10s auto-dismiss
  const [snackbar, setSnackbar] = useState<{
    message: string;
    actionRecordId: string;
  } | null>(null);
  const snackbarTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Group action execution
  const handleExecuteAction = async (group: CleanupGroup, action: 'trash' | 'archive') => {
    const ids = group.emailIds;
    if (ids.length === 0) return;

    // 1. Perform action on emails
    if (action === 'trash') {
      await trashEmails(ids);
    } else {
      await archiveEmails(ids);
    }

    // 2. Record action in history
    const actionRecordId = await recordCleanupAction({
      groupTitle: group.title,
      action,
      emailIds: ids,
    });

    // 3. Close open sheets/modals
    setConfirmState(null);
    setReviewGroup(null);

    // 4. Trigger snackbar with Undo for ~10 seconds
    const count = ids.length;
    const actionText = action === 'trash' ? 'moved to Trash' : 'archived';
    setSnackbar({
      message: `${count} ${count === 1 ? 'email' : 'emails'} ${actionText}`,
      actionRecordId,
    });

    if (snackbarTimerRef.current) {
      clearTimeout(snackbarTimerRef.current);
    }
    snackbarTimerRef.current = setTimeout(() => {
      setSnackbar(null);
    }, 10000);
  };

  // Undo action from snackbar
  const handleUndo = async () => {
    if (!snackbar) return;
    await undoCleanupAction(snackbar.actionRecordId);
    setSnackbar(null);
    if (snackbarTimerRef.current) {
      clearTimeout(snackbarTimerRef.current);
    }
  };

  // Sender breakdown for Review sheet (top senders by count in this group)
  const reviewSenderBreakdown = useMemo(() => {
    if (!reviewGroup) return [];
    const counts: Record<string, number> = {};
    for (const id of reviewGroup.emailIds) {
      const email = emailMap.get(id);
      if (email) {
        const key = email.senderName || email.senderEmail;
        counts[key] = (counts[key] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [reviewGroup, emailMap]);

  // Sample emails (maximum 10) for Review sheet
  const reviewSampleEmails = useMemo(() => {
    if (!reviewGroup) return [];
    const samples: Email[] = [];
    for (const id of reviewGroup.emailIds) {
      const email = emailMap.get(id);
      if (email) {
        samples.push(email);
        if (samples.length >= 10) break;
      }
    }
    return samples;
  }, [reviewGroup, emailMap]);

  // Unique senders for Keep dialog
  const keepGroupSenders = useMemo(() => {
    if (!keepGroup) return [];
    const sendersMap = new Map<string, string>();
    for (const id of keepGroup.emailIds) {
      const email = emailMap.get(id);
      if (email && email.senderEmail) {
        const emailLower = email.senderEmail.toLowerCase();
        if (!sendersMap.has(emailLower)) {
          sendersMap.set(emailLower, email.senderName || email.senderEmail);
        }
      }
    }
    return Array.from(sendersMap.entries()).map(([email, name]) => ({
      email,
      name,
    }));
  }, [keepGroup, emailMap]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32 select-text">
      {/* =========================================================================
          1. HEADER
         ========================================================================= */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--accent-chartreuse)]/25 text-[#292D1E] dark:text-[var(--accent-chartreuse)]">
                <Sparkles size={18} />
              </span>
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight">
                Cleanup
              </h1>
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-body)' }}>
              {totalSafeToClear === 1
                ? '1 email looks safe to clear'
                : `${totalSafeToClear} emails look safe to clear`}
            </p>
            <p
              className="font-accent text-[17px] leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Nothing is deleted for 30 days.
            </p>
          </div>

          {/* Outdated setting shortcut linking to Settings */}
          <button
            type="button"
            onClick={() => setActiveView('settings')}
            title="Configure outdated email threshold in Settings"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)] hover:bg-[var(--color-hover-tint)] transition-all active:scale-95 shadow-xs focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
          >
            <Clock size={14} className="text-[var(--accent-peach)]" />
            <span>Outdated after {outdatedAfterDays} days</span>
            <ArrowRight size={13} className="opacity-70" />
          </button>
        </div>
      </header>

      {/* =========================================================================
          2. EMPTY STATE (When no group has actionable emails)
         ========================================================================= */}
      {totalSafeToClear === 0 ? (
        <section
          className="p-8 sm:p-12 rounded-[28px] border border-[var(--color-border)] text-center relative overflow-hidden transition-colors"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          <OrganicBlob variant="empty-state" className="w-32 h-28 mx-auto mb-4 opacity-70" />
          <h2 className="font-accent text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-[var(--color-text-body)]">
            Your inbox is tidy
          </h2>
          <p
            className="text-xs sm:text-sm max-w-md mx-auto leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            No emails are currently older than your {outdatedAfterDays}-day threshold, or all older candidates have been automatically protected.
          </p>
        </section>
      ) : (
        /* =========================================================================
            3. GROUP CARDS (One card per group, not a card per email)
           ========================================================================= */
        <section className="space-y-4" aria-label="Cleanup candidate groups">
          {cleanupGroups.map((group) => {
            const hasEmails = group.count > 0;

            return (
              <article
                key={group.id}
                className={`p-6 sm:p-7 rounded-[28px] border border-[var(--color-border)] transition-all ${
                  hasEmails ? 'hover:shadow-xs' : 'opacity-65'
                }`}
                style={{ backgroundColor: 'var(--color-surface)' }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left info column */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <h2 className="font-heading text-lg font-bold tracking-tight text-[var(--color-text-body)]">
                        {group.title}
                      </h2>
                    </div>

                    <p
                      className="text-xs leading-relaxed max-w-xl"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {group.description}
                    </p>

                    {/* Top senders */}
                    {group.sampleSenders.length > 0 && (
                      <div className="text-xs pt-1 flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-[var(--color-text-secondary)]">
                          Top senders:
                        </span>
                        <span className="text-[var(--color-text-body)] font-medium">
                          {group.sampleSenders.slice(0, 3).join(', ')}
                        </span>
                      </div>
                    )}

                    {/* Protected count muted line */}
                    {group.skippedProtectedCount > 0 && (
                      <p
                        className="text-xs pt-0.5 flex items-center gap-1.5 opacity-80"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        <Shield size={12} className="shrink-0 text-[var(--accent-sage)]" />
                        <span>
                          {group.skippedProtectedCount === 1
                            ? '1 kept safe (starred, attachments, replies, receipts)'
                            : `${group.skippedProtectedCount} kept safe (starred, attachments, replies, receipts)`}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Right big count */}
                  <div className="shrink-0 text-left sm:text-right">
                    <span className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-text-body)]">
                      {group.count}
                    </span>
                    <span
                      className="block text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {group.count === 1 ? 'email' : 'emails'}
                    </span>
                  </div>
                </div>

                {/* Bottom action buttons */}
                <div className="mt-6 pt-5 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Review Button */}
                    <button
                      type="button"
                      disabled={!hasEmails}
                      onClick={() => setReviewGroup(group)}
                      className="px-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-hover-tint)] text-xs font-semibold text-[var(--color-text-body)] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
                    >
                      <Eye size={14} />
                      <span>Review</span>
                    </button>

                    {/* Move to Trash Button (Primary pill) */}
                    <button
                      type="button"
                      disabled={!hasEmails}
                      onClick={() => setConfirmState({ group, action: 'trash' })}
                      className="px-4 py-2 rounded-full font-semibold text-xs transition-all active:scale-95 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
                      style={{
                        backgroundColor: 'var(--color-primary-btn)',
                        color: 'var(--color-primary-btn-text)',
                      }}
                    >
                      <Trash2 size={13} />
                      <span>Move to Trash</span>
                    </button>

                    {/* Archive Button (Secondary) */}
                    <button
                      type="button"
                      disabled={!hasEmails}
                      onClick={() => setConfirmState({ group, action: 'archive' })}
                      className="px-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-hover-tint)] text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
                    >
                      <Archive size={13} />
                      <span>Archive</span>
                    </button>
                  </div>

                  {/* Keep text button */}
                  <button
                    type="button"
                    disabled={!hasEmails}
                    onClick={() => setKeepGroup(group)}
                    className="text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)] underline underline-offset-4 transition-colors disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed p-1"
                  >
                    Keep senders safe
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* =========================================================================
          4. HISTORY SECTION (Last 20 actions with Restore)
         ========================================================================= */}
      <section
        className="p-6 sm:p-7 rounded-[28px] border border-[var(--color-border)] space-y-4 transition-colors"
        style={{ backgroundColor: 'var(--color-surface)' }}
        aria-label="Cleanup history"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-base font-bold tracking-tight text-[var(--color-text-body)]">
              Cleanup History
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Recent cleanup batches. Trashed and archived emails can be restored at any time.
            </p>
          </div>
          {cleanupHistory.length > 0 && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-secondary)]">
              {cleanupHistory.length} {cleanupHistory.length === 1 ? 'record' : 'records'}
            </span>
          )}
        </div>

        {cleanupHistory.length === 0 ? (
          <div className="py-6 text-center text-xs text-[var(--color-text-secondary)] border border-dashed border-[var(--color-border)] rounded-2xl bg-[var(--color-bg)]">
            No cleanup actions taken yet.
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden">
            {cleanupHistory.slice(0, 20).map((record) => {
              const formattedDate = (() => {
                try {
                  const d = new Date(record.date);
                  return d.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  });
                } catch {
                  return record.date;
                }
              })();

              return (
                <div
                  key={record.id}
                  className="p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs hover:bg-[var(--color-hover-tint)] transition-colors"
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--color-text-body)]">
                        {record.groupTitle}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          record.action === 'trash'
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25'
                            : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25'
                        }`}
                      >
                        {record.action}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--color-text-secondary)]">
                      {record.emailIds.length} {record.emailIds.length === 1 ? 'email' : 'emails'} • {formattedDate}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => undoCleanupAction(record.id)}
                    className="px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-hover-tint)] font-semibold text-xs text-[var(--color-text-body)] transition-all active:scale-95 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)] shadow-xs"
                    title="Restore these emails back to inbox"
                  >
                    <RotateCcw size={12} />
                    <span>Restore</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =========================================================================
          5. REVIEW SHEET (Bottom sheet on mobile, side panel on desktop)
         ========================================================================= */}
      {reviewGroup && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px] animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-sheet-title"
        >
          {/* Backdrop click to dismiss */}
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() => setReviewGroup(null)}
            aria-hidden="true"
          />

          {/* Panel Container */}
          <aside
            className={`relative z-10 w-full ${
              isDesktop
                ? 'max-w-md h-full border-l border-[var(--color-border)] shadow-2xl flex flex-col'
                : 'mt-auto max-h-[85vh] rounded-t-[28px] border-t border-[var(--color-border)] shadow-2xl flex flex-col'
            }`}
            style={{
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-body)',
            }}
          >
            {/* Review Header */}
            <div className="p-5 sm:p-6 border-b border-[var(--color-border)] flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Reviewing {reviewGroup.count} emails
                </span>
                <h3 id="review-sheet-title" className="font-heading text-lg font-bold tracking-tight">
                  {reviewGroup.title}
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  Showing 10 sample emails from this group.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setReviewGroup(null)}
                className="p-1.5 rounded-full hover:bg-[var(--color-hover-tint)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)] transition-colors"
                aria-label="Close review"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* Sender breakdown */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2.5 text-[var(--color-text-secondary)]">
                  Sender Breakdown
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {reviewSenderBreakdown.map(([sender, count]) => (
                    <span
                      key={sender}
                      className="text-xs px-2.5 py-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] flex items-center gap-1.5"
                    >
                      <span className="font-medium truncate max-w-[140px]">{sender}:</span>
                      <span className="font-bold text-[var(--color-text-body)]">{count}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Sample emails (Max 10) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2.5 text-[var(--color-text-secondary)]">
                  Sample Emails ({reviewSampleEmails.length})
                </h4>
                <div className="divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden">
                  {reviewSampleEmails.map((email) => {
                    const formattedDate = (() => {
                      try {
                        const d = new Date(email.date);
                        return d.toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        });
                      } catch {
                        return email.date;
                      }
                    })();

                    return (
                      <div key={email.id} className="p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[var(--color-text-body)] truncate">
                            {email.senderName || email.senderEmail}
                          </span>
                          <span className="text-[10px] text-[var(--color-text-secondary)] shrink-0 font-medium">
                            {formattedDate}
                          </span>
                        </div>
                        <p className="text-[var(--color-text-secondary)] truncate">
                          {email.subject}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-4 sm:p-5 border-t border-[var(--color-border)] bg-[var(--color-surface)] space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmState({ group: reviewGroup, action: 'trash' })}
                  className="flex-1 py-2.5 px-4 rounded-full font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
                  style={{
                    backgroundColor: 'var(--color-primary-btn)',
                    color: 'var(--color-primary-btn-text)',
                  }}
                >
                  <Trash2 size={13} />
                  <span>Move to Trash ({reviewGroup.count})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmState({ group: reviewGroup, action: 'archive' })}
                  className="py-2.5 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-hover-tint)] font-semibold text-xs text-[var(--color-text-body)] transition-all active:scale-95"
                >
                  <Archive size={13} />
                  <span>Archive</span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setKeepGroup(reviewGroup)}
                  className="text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)] underline underline-offset-4 transition-colors"
                >
                  Keep senders safe
                </button>
                <button
                  type="button"
                  onClick={() => setReviewGroup(null)}
                  className="text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* =========================================================================
          6. CONFIRMATION DIALOG BEFORE TRASH / ARCHIVE
         ========================================================================= */}
      {confirmState && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div
            className="w-full max-w-md p-6 rounded-[24px] border border-[var(--color-border)] shadow-xl transition-all space-y-4"
            style={{
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-body)',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-full shrink-0 ${
                  confirmState.action === 'trash'
                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                    : 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                }`}
              >
                {confirmState.action === 'trash' ? <Trash2 size={18} /> : <Archive size={18} />}
              </div>
              <div>
                <h3 id="confirm-dialog-title" className="font-heading text-base font-bold">
                  {confirmState.action === 'trash' ? 'Move to Trash' : 'Archive Emails'}
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1.5 leading-relaxed">
                  {confirmState.action === 'trash'
                    ? `Move ${confirmState.group.count} ${
                        confirmState.group.count === 1 ? 'email' : 'emails'
                      } to Trash? Gmail deletes trashed emails permanently after 30 days. You can undo this right away.`
                    : `Archive ${confirmState.group.count} ${
                        confirmState.group.count === 1 ? 'email' : 'emails'
                      }? They leave your inbox but stay searchable.`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmState(null)}
                className="px-4 py-2 rounded-xl border border-[var(--color-border)] text-xs font-semibold hover:bg-[var(--color-hover-tint)] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleExecuteAction(confirmState.group, confirmState.action)}
                className="px-4 py-2 rounded-full font-semibold text-xs shadow-xs transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
                style={{
                  backgroundColor: 'var(--color-primary-btn)',
                  color: 'var(--color-primary-btn-text)',
                }}
              >
                {confirmState.action === 'trash' ? 'Move to Trash' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. KEEP SENDERS DIALOG (Protect Senders)
         ========================================================================= */}
      {keepGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="keep-dialog-title"
        >
          <div
            className="w-full max-w-md p-6 rounded-[24px] border border-[var(--color-border)] shadow-xl transition-all space-y-4 max-h-[85vh] flex flex-col"
            style={{
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-body)',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Shield size={18} className="text-[var(--accent-sage)]" />
                <h3 id="keep-dialog-title" className="font-heading text-base font-bold">
                  Protect Senders from {keepGroup.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setKeepGroup(null)}
                className="p-1 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-tint)]"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Emails from protected senders will never be suggested for cleanup. Protect specific senders or all senders in this group.
            </p>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  for (const s of keepGroupSenders) {
                    addProtectedSender(s.email);
                  }
                  setKeepGroup(null);
                }}
                className="text-xs font-bold text-[var(--color-text-body)] underline underline-offset-4 hover:opacity-80"
              >
                Protect all {keepGroupSenders.length} senders
              </button>
            </div>

            {/* Senders List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]">
              {keepGroupSenders.map(({ email, name }) => {
                const isAlreadyProtected = protectedSenders.some(
                  (s) => s.toLowerCase() === email.toLowerCase()
                );

                return (
                  <div
                    key={email}
                    className="p-3 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-bold block truncate text-[var(--color-text-body)]">
                        {name}
                      </span>
                      <span className="text-[11px] text-[var(--color-text-secondary)] truncate block">
                        {email}
                      </span>
                    </div>

                    {isAlreadyProtected ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                        <Check size={11} />
                        <span>Protected</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addProtectedSender(email)}
                        className="px-3 py-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-hover-tint)] font-semibold text-[11px] text-[var(--color-text-body)] transition-all active:scale-95"
                      >
                        Protect
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setKeepGroup(null)}
                className="px-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold hover:bg-[var(--color-hover-tint)] transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          8. CLEANUP SNACKBAR (With 10-second Undo)
         ========================================================================= */}
      {snackbar && (
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
              {snackbar.message}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleUndo}
              className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
              style={{
                backgroundColor: 'var(--color-primary-btn)',
                color: 'var(--color-primary-btn-text)',
              }}
            >
              <RotateCcw size={12} />
              <span>Undo</span>
            </button>

            <button
              type="button"
              onClick={() => setSnackbar(null)}
              className="p-1 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-tint)] transition-colors"
              title="Dismiss notification"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        </aside>
      )}
    </div>
  );
};
