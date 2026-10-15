import React, { useState, useMemo, useRef } from 'react';
import {
  BrushCleaning,
  KeyRound,
  PackageCheck,
  CalendarClock,
  Newspaper,
  Tag,
  Users,
  Bell,
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
  MailX,
  ChevronDown,
  Ban,
  HelpCircle,
} from 'lucide-react';
import { useInbox } from '../../context/InboxContext';
import { CleanupGroup, Email } from '../../types';
import { OrganicBlob } from '../common/OrganicBlob';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { useNavBreakpoint } from '../../hooks/useMediaQuery';
import { isEmailProtected } from '../../services/cleanup';

interface SenderStats {
  email: string;
  name: string;
  totalEmails: number;
  openedCount: number;
  unreadCount: number;
  latestFormattedDate: string;
  hasUnsubscribeUrl: boolean;
  unsubscribeUrl?: string;
  isProtected: boolean;
  isUnsubscribed: boolean;
  actionableOldEmailIds: string[];
  safeKeptCount: number;
}

const SENDER_ACTION_HELP = {
  unsubscribe:
    'Asks the sender to stop emailing you. Best for newsletters and stores you signed up for.',
  block:
    'Sends anything they email you to Trash. Best for spam and senders who ignore unsubscribing.',
  'unsub-and-clear':
    'Unsubscribes, then moves their old emails to Trash. Starred, replied-to and receipt-like emails are kept.',
};

export const CleanupView: React.FC = () => {
  const {
    cleanupGroups,
    outdatedAfterDays,
    rawEmails,
    trashEmails,
    archiveEmails,
    restoreEmails: _restoreEmails,
    recordCleanupAction,
    undoCleanupAction,
    cleanupHistory,
    protectedSenders,
    addProtectedSender,
    setActiveView,
    recordUnsubscribeAction,
    blockSender,
    unblockSender,
  } = useInbox();

  const { isDesktop } = useNavBreakpoint();

  // Top level segmented view control: 'groups' | 'senders'
  const [activeTab, setActiveTab] = useState<'groups' | 'senders'>('groups');

  // Senders filter chips: 'all' | 'never-opened' | 'has-unsub' | 'ten-plus'
  const [senderFilter, setSenderFilter] = useState<
    'all' | 'never-opened' | 'has-unsub' | 'ten-plus'
  >('all');

  // Pagination for fast rendering with 800+ emails (30 first, show 30 more)
  const [visibleSenderCount, setVisibleSenderCount] = useState<number>(30);

  // Set of senders marked unsubscribed in demo mode
  const [unsubscribedSenders, setUnsubscribedSenders] = useState<Set<string>>(
    () => new Set<string>()
  );

  // Modals and sheets state for Block sender action
  const [blockTargetSender, setBlockTargetSender] = useState<SenderStats | null>(null);

  // Helper text sheet state for mobile / modal ("?" sheet)
  const [helpSheetAction, setHelpSheetAction] = useState<
    'unsubscribe' | 'block' | 'unsub-and-clear' | null
  >(null);

  // Fast email lookup map for sample preview in Review sheet
  const emailMap = useMemo(() => {
    const map = new Map<string, Email>();
    for (const email of rawEmails) {
      map.set(email.id, email);
    }
    return map;
  }, [rawEmails]);

  // Overall count of actionable emails safe to clear in groups
  const totalSafeToClear = useMemo(() => {
    return cleanupGroups.reduce((acc, g) => acc + g.count, 0);
  }, [cleanupGroups]);

  // Compute sender statistics once and memoize them
  const senderStatsList = useMemo<SenderStats[]>(() => {
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const outdatedThresholdMs = Date.now() - outdatedAfterDays * ONE_DAY_MS;
    const activeEmails = rawEmails.filter((e) => !e.isTrashed && !e.isArchived);

    const bySender = new Map<string, { email: string; name: string; emails: Email[] }>();
    for (const e of activeEmails) {
      const key = e.senderEmail.toLowerCase();
      let entry = bySender.get(key);
      if (!entry) {
        entry = {
          email: e.senderEmail,
          name: e.senderName || e.senderEmail,
          emails: [],
        };
        bySender.set(key, entry);
      }
      entry.emails.push(e);
    }

    const list: SenderStats[] = [];
    for (const { email, name, emails } of bySender.values()) {
      const totalEmails = emails.length;
      const openedCount = emails.filter((e) => !e.isUnread).length;
      const unreadCount = totalEmails - openedCount;
      const hasUnsubscribeUrl = emails.some((e) => Boolean(e.unsubscribeUrl));
      const unsubEmail = emails.find((e) => Boolean(e.unsubscribeUrl));
      const unsubscribeUrl = unsubEmail?.unsubscribeUrl;
      const isProtected = protectedSenders.some(
        (ps) => ps.toLowerCase() === email.toLowerCase()
      );
      const isUnsubscribed = unsubscribedSenders.has(email.toLowerCase());

      let maxTime = 0;
      for (const e of emails) {
        const t = new Date(e.date).getTime();
        if (!isNaN(t) && t > maxTime) maxTime = t;
      }
      const latestFormattedDate =
        maxTime > 0
          ? new Date(maxTime).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })
          : '';

      const actionableOldEmailIds: string[] = [];
      let safeKeptCount = 0;

      for (const e of emails) {
        const emailTime = new Date(e.date).getTime();
        if (!isNaN(emailTime) && emailTime < outdatedThresholdMs) {
          if (isEmailProtected(e, protectedSenders)) {
            safeKeptCount++;
          } else {
            actionableOldEmailIds.push(e.id);
          }
        }
      }

      list.push({
        email,
        name,
        totalEmails,
        openedCount,
        unreadCount,
        latestFormattedDate,
        hasUnsubscribeUrl,
        unsubscribeUrl,
        isProtected,
        isUnsubscribed,
        actionableOldEmailIds,
        safeKeptCount,
      });
    }

    // Sorted by total email count descending
    return list.sort((a, b) => b.totalEmails - a.totalEmails);
  }, [rawEmails, outdatedAfterDays, protectedSenders, unsubscribedSenders]);

  // Filtered senders based on selected filter chip
  const filteredSenders = useMemo(() => {
    switch (senderFilter) {
      case 'never-opened':
        return senderStatsList.filter((s) => s.openedCount === 0);
      case 'has-unsub':
        return senderStatsList.filter((s) => s.hasUnsubscribeUrl);
      case 'ten-plus':
        return senderStatsList.filter((s) => s.totalEmails >= 10);
      default:
        return senderStatsList;
    }
  }, [senderStatsList, senderFilter]);

  // Senders filter counts for chips
  const senderChipCounts = useMemo(() => {
    return {
      all: senderStatsList.length,
      neverOpened: senderStatsList.filter((s) => s.openedCount === 0).length,
      hasUnsub: senderStatsList.filter((s) => s.hasUnsubscribeUrl).length,
      tenPlus: senderStatsList.filter((s) => s.totalEmails >= 10).length,
    };
  }, [senderStatsList]);

  // Modals and sheets state for Groups
  const [reviewGroup, setReviewGroup] = useState<CleanupGroup | null>(null);
  const [confirmState, setConfirmState] = useState<{
    group: CleanupGroup;
    action: 'trash' | 'archive';
  } | null>(null);
  const [keepGroup, setKeepGroup] = useState<CleanupGroup | null>(null);

  // Modals and sheets state for Senders
  const [senderConfirm, setSenderConfirm] = useState<{
    sender: SenderStats;
    actionType: 'trash-old' | 'unsubscribe' | 'unsub-and-clear';
  } | null>(null);

  // Floating snackbar state with 10s auto-dismiss
  const [snackbar, setSnackbar] = useState<{
    message: string;
    actionRecordId?: string;
    blockedSenderEmail?: string;
    unsubscribedSenderEmail?: string;
  } | null>(null);
  const snackbarTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Group action execution
  const handleExecuteAction = async (group: CleanupGroup, action: 'trash' | 'archive') => {
    const ids = group.emailIds;
    if (ids.length === 0) return;

    if (action === 'trash') {
      await trashEmails(ids);
    } else {
      await archiveEmails(ids);
    }

    const actionRecordId = await recordCleanupAction({
      groupTitle: group.title,
      action,
      emailIds: ids,
    });

    setConfirmState(null);
    setReviewGroup(null);

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

  // Sender action execution
  const handleExecuteSenderAction = async (
    sender: SenderStats,
    actionType: 'trash-old' | 'unsubscribe' | 'unsub-and-clear'
  ) => {
    setSenderConfirm(null);

    if (actionType === 'trash-old') {
      if (sender.actionableOldEmailIds.length === 0) return;
      await trashEmails(sender.actionableOldEmailIds);
      const actionRecordId = await recordCleanupAction({
        groupTitle: sender.name,
        action: 'trash',
        emailIds: sender.actionableOldEmailIds,
      });
      const count = sender.actionableOldEmailIds.length;
      setSnackbar({
        message: `${count} ${count === 1 ? 'email' : 'emails'} moved to Trash`,
        actionRecordId,
      });
    } else if (actionType === 'unsubscribe') {
      setUnsubscribedSenders((prev) => {
        const next = new Set(prev);
        next.add(sender.email.toLowerCase());
        return next;
      });
      recordUnsubscribeAction();
      setSnackbar({
        message: "In demo mode this would open the sender's unsubscribe page",
        unsubscribedSenderEmail: sender.email,
      });
    } else if (actionType === 'unsub-and-clear') {
      setUnsubscribedSenders((prev) => {
        const next = new Set(prev);
        next.add(sender.email.toLowerCase());
        return next;
      });
      recordUnsubscribeAction();

      if (sender.actionableOldEmailIds.length > 0) {
        await trashEmails(sender.actionableOldEmailIds);
        const actionRecordId = await recordCleanupAction({
          groupTitle: `${sender.name} (Unsubscribed)`,
          action: 'trash',
          emailIds: sender.actionableOldEmailIds,
        });
        const count = sender.actionableOldEmailIds.length;
        setSnackbar({
          message: `In demo mode this would open the sender's unsubscribe page. ${count} ${
            count === 1 ? 'email' : 'emails'
          } moved to Trash`,
          actionRecordId,
          unsubscribedSenderEmail: sender.email,
        });
      } else {
        setSnackbar({
          message: "In demo mode this would open the sender's unsubscribe page",
          unsubscribedSenderEmail: sender.email,
        });
      }
    }

    if (snackbarTimerRef.current) {
      clearTimeout(snackbarTimerRef.current);
    }
    snackbarTimerRef.current = setTimeout(() => {
      setSnackbar(null);
    }, 10000);
  };

  // Block sender execution with confirmation and undo
  const handleConfirmBlock = async () => {
    if (!blockTargetSender) return;
    const target = blockTargetSender;
    setBlockTargetSender(null);
    await blockSender(target.email);
    setSnackbar({
      message: `Blocked ${target.name}`,
      blockedSenderEmail: target.email,
    });

    if (snackbarTimerRef.current) {
      clearTimeout(snackbarTimerRef.current);
    }
    snackbarTimerRef.current = setTimeout(() => {
      setSnackbar(null);
    }, 10000);
  };

  // Undo action from snackbar (handles trashing, unsubscribing, and blocking)
  const handleUndo = async () => {
    if (!snackbar) return;

    if (snackbar.actionRecordId) {
      await undoCleanupAction(snackbar.actionRecordId);
    }
    if (snackbar.blockedSenderEmail) {
      await unblockSender(snackbar.blockedSenderEmail);
    }
    if (snackbar.unsubscribedSenderEmail) {
      setUnsubscribedSenders((prev) => {
        const next = new Set(prev);
        next.delete(snackbar.unsubscribedSenderEmail!.toLowerCase());
        return next;
      });
    }

    setSnackbar(null);
    if (snackbarTimerRef.current) {
      clearTimeout(snackbarTimerRef.current);
    }
  };

  // Sender breakdown for Review sheet
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

  // Small icon per built-in cleanup group
  const getGroupIcon = (groupId: string) => {
    switch (groupId) {
      case 'verification-codes':
        return <KeyRound size={16} className="text-[var(--accent-peach)]" />;
      case 'delivered-orders':
        return (
          <PackageCheck
            size={16}
            className="text-[#5B7553] dark:text-[var(--accent-chartreuse)]"
          />
        );
      case 'calendar-invites':
        return (
          <CalendarClock
            size={16}
            className="text-[#886B9A] dark:text-[var(--accent-lavender)]"
          />
        );
      case 'newsletters':
        return <Newspaper size={16} className="text-[#B95D82] dark:text-[var(--accent-pink)]" />;
      case 'old-promotions':
        return <Tag size={16} className="text-[var(--accent-peach)]" />;
      case 'social-notifications':
        return (
          <Users size={16} className="text-[#886B9A] dark:text-[var(--accent-lavender)]" />
        );
      case 'automated-notifications':
        return <Bell size={16} className="text-[#5B7553] dark:text-[var(--accent-sage)]" />;
      case 'unread-long-time':
        return <Clock size={16} className="text-[#B95D82] dark:text-[var(--accent-pink)]" />;
      default:
        return <BrushCleaning size={16} className="text-[var(--color-text-body)]" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-7 pb-32 select-text">
      {/* =========================================================================
          1. HEADER
         ========================================================================= */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--accent-chartreuse)]/25 text-[#292D1E] dark:text-[var(--accent-chartreuse)]">
                <BrushCleaning size={18} />
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
              Trashed emails can be restored for 30 days.
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

        {/* Top Segmented Control: Groups | Senders */}
        <div className="pt-2 flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
          <div
            className="p-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] inline-flex items-center gap-1 shadow-2xs"
            role="tablist"
            aria-label="Cleanup view modes"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'groups'}
              onClick={() => setActiveTab('groups')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'groups'
                  ? 'bg-[var(--accent-chartreuse)] text-[#292D1E] shadow-xs'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)]'
              }`}
            >
              Groups
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'senders'}
              onClick={() => setActiveTab('senders')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'senders'
                  ? 'bg-[var(--accent-chartreuse)] text-[#292D1E] shadow-xs'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)]'
              }`}
            >
              Senders
            </button>
          </div>

          <span className="text-xs text-[var(--color-text-secondary)] font-medium hidden sm:inline">
            {activeTab === 'groups'
              ? '8 built-in cleanup categories'
              : `${senderStatsList.length} active senders`}
          </span>
        </div>
      </header>

      {/* =========================================================================
          VIEW A: GROUPS
         ========================================================================= */}
      {activeTab === 'groups' && (
        <>
          {/* Empty state when no group has emails */}
          {totalSafeToClear === 0 ? (
            <section
              className="p-8 sm:p-12 rounded-[28px] border border-[var(--color-border)] text-center relative overflow-hidden transition-colors"
              style={{ backgroundColor: 'var(--color-surface)' }}
            >
              <OrganicBlob
                variant="empty-state"
                className="w-32 h-28 mx-auto mb-4 opacity-70"
              />
              <h2 className="font-accent text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-[var(--color-text-body)]">
                Your inbox is tidy
              </h2>
              <p
                className="text-xs sm:text-sm max-w-md mx-auto leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                No emails are currently older than your {outdatedAfterDays}-day
                threshold, or all older candidates have been automatically
                protected.
              </p>
            </section>
          ) : (
            /* One card per group */
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
                          <span className="w-7 h-7 rounded-xl flex items-center justify-center bg-[var(--color-bg)] border border-[var(--color-border)] shrink-0 shadow-2xs">
                            {getGroupIcon(group.id)}
                          </span>
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
                            <Shield
                              size={12}
                              className="shrink-0 text-[var(--accent-sage)]"
                            />
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
                          onClick={() =>
                            setConfirmState({ group, action: 'trash' })
                          }
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
                          onClick={() =>
                            setConfirmState({ group, action: 'archive' })
                          }
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
        </>
      )}

      {/* =========================================================================
          VIEW B: SENDERS
         ========================================================================= */}
      {activeTab === 'senders' && (
        <section className="space-y-4" aria-label="Senders cleanup list">
          {/* Filter chips above list */}
          <div
            className="flex flex-wrap items-center gap-2 pt-1"
            role="radiogroup"
            aria-label="Filter senders"
          >
            {[
              { id: 'all', label: 'All senders', count: senderChipCounts.all },
              {
                id: 'never-opened',
                label: 'Never opened',
                count: senderChipCounts.neverOpened,
              },
              {
                id: 'has-unsub',
                label: 'Has unsubscribe link',
                count: senderChipCounts.hasUnsub,
              },
              {
                id: 'ten-plus',
                label: '10 or more emails',
                count: senderChipCounts.tenPlus,
              },
            ].map((chip) => {
              const isSelected = senderFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    setSenderFilter(chip.id as any);
                    setVisibleSenderCount(30);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[var(--color-text-body)] text-[var(--color-surface)] border-[var(--color-text-body)] shadow-xs'
                      : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-hover-tint)] hover:text-[var(--color-text-body)]'
                  }`}
                >
                  <span>{chip.label}</span>
                  <span className="opacity-75 text-[11px]">({chip.count})</span>
                </button>
              );
            })}
          </div>

          {/* Senders list: render at most visibleSenderCount rows */}
          {filteredSenders.length === 0 ? (
            <div
              className="p-8 sm:p-12 rounded-[28px] border border-[var(--color-border)] text-center transition-colors"
              style={{ backgroundColor: 'var(--color-surface)' }}
            >
              <p className="text-sm font-semibold text-[var(--color-text-body)]">
                No senders match this filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSenderFilter('all');
                  setVisibleSenderCount(30);
                }}
                className="mt-3 px-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-hover-tint)] text-xs font-semibold text-[var(--color-text-body)] transition-all"
              >
                Reset to all senders
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredSenders.slice(0, visibleSenderCount).map((sender) => {
                const initialChar = (sender.name || sender.email)
                  .charAt(0)
                  .toUpperCase();

                return (
                  <article
                    key={sender.email}
                    className="p-5 sm:p-6 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] transition-all hover:shadow-xs space-y-4"
                  >
                    {/* Top Row: Initial circle, sender name, email, badges */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {/* Initial circle */}
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border border-[var(--color-border)]"
                          style={{
                            backgroundColor: 'var(--color-bg)',
                            color: 'var(--color-text-body)',
                          }}
                        >
                          {initialChar}
                        </div>

                        {/* Name & email */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-heading text-sm font-bold text-[var(--color-text-body)] truncate max-w-[200px] sm:max-w-xs">
                              {sender.name}
                            </h3>

                            {/* Recommendation Tag: Unsubscribe or Block */}
                            {sender.hasUnsubscribeUrl && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F49A]/35 text-[#373E18] dark:text-[var(--accent-chartreuse)] border border-[var(--accent-chartreuse)]/40"
                                title="Recommended action: Unsubscribe"
                              >
                                <span className="opacity-70 font-medium">Recommend:</span> Unsubscribe
                              </span>
                            )}
                            {!sender.hasUnsubscribeUrl && sender.openedCount === 0 && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25"
                                title="Recommended action: Block"
                              >
                                <span className="opacity-70 font-medium">Recommend:</span> Block
                              </span>
                            )}

                            {/* Protected Badge */}
                            {sender.isProtected && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                                <Shield size={10} />
                                Protected
                              </span>
                            )}

                            {/* Unsubscribed Badge */}
                            {sender.isUnsubscribed && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                                <MailX size={10} />
                                Unsubscribed
                              </span>
                            )}

                            {/* Never opened Badge */}
                            {sender.openedCount === 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                                Never opened
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-[var(--color-text-secondary)] truncate">
                            {sender.email}
                          </p>

                          {/* Stats line: total emails, opened X of N, date of latest email */}
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-xs text-[var(--color-text-secondary)]">
                            <span className="font-semibold text-[var(--color-text-body)]">
                              {sender.totalEmails}{' '}
                              {sender.totalEmails === 1 ? 'email' : 'emails'}
                            </span>
                            <span>•</span>
                            <span>
                              opened {sender.openedCount} of {sender.totalEmails}
                            </span>
                            {sender.latestFormattedDate && (
                              <>
                                <span>•</span>
                                <span>Latest: {sender.latestFormattedDate}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Row Actions */}
                    <div className="pt-3 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Trash old emails */}
                        <button
                          type="button"
                          disabled={sender.actionableOldEmailIds.length === 0}
                          onClick={() =>
                            setSenderConfirm({
                              sender,
                              actionType: 'trash-old',
                            })
                          }
                          className="px-3.5 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-hover-tint)] text-xs font-semibold text-[var(--color-text-body)] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
                          title={
                            sender.actionableOldEmailIds.length === 0
                              ? 'No old unprotected emails from this sender'
                              : `Move ${sender.actionableOldEmailIds.length} old emails to Trash`
                          }
                        >
                          <Trash2 size={13} />
                          <span>
                            Trash old emails (
                            {sender.actionableOldEmailIds.length})
                          </span>
                        </button>

                        {/* Unsubscribe (only if has unsubscribe link) */}
                        {sender.hasUnsubscribeUrl && (
                          <div className="inline-flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                setSenderConfirm({
                                  sender,
                                  actionType: 'unsubscribe',
                                })
                              }
                              className="px-3.5 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-hover-tint)] text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)] transition-all active:scale-95 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
                            >
                              <MailX size={13} />
                              <span>Unsubscribe</span>
                            </button>
                            {/* ? Helper tooltip on desktop, sheet on mobile */}
                            <div className="relative group">
                              <button
                                type="button"
                                onClick={() => setHelpSheetAction('unsubscribe')}
                                className="p-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)] hover:bg-[var(--color-hover-tint)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
                                aria-label="Help: Unsubscribe"
                              >
                                <HelpCircle size={13} />
                              </button>
                              {/* Desktop Tooltip */}
                              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden sm:group-hover:block z-30 w-64 p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-body)] text-xs shadow-lg backdrop-blur-md">
                                <span className="font-bold text-[10px] uppercase tracking-wider block text-[var(--color-text-secondary)] mb-0.5">
                                  Unsubscribe
                                </span>
                                <p className="leading-snug">{SENDER_ACTION_HELP.unsubscribe}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Block sender action */}
                        <div className="inline-flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => setBlockTargetSender(sender)}
                            className="px-3.5 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/15 text-xs font-semibold text-rose-600 dark:text-rose-400 transition-all active:scale-95 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-rose-500/50"
                          >
                            <Ban size={13} />
                            <span>Block</span>
                          </button>
                          {/* ? Helper tooltip on desktop, sheet on mobile */}
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={() => setHelpSheetAction('block')}
                              className="p-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)] hover:bg-[var(--color-hover-tint)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
                              aria-label="Help: Block"
                            >
                              <HelpCircle size={13} />
                            </button>
                            {/* Desktop Tooltip */}
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden sm:group-hover:block z-30 w-64 p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-body)] text-xs shadow-lg backdrop-blur-md">
                              <span className="font-bold text-[10px] uppercase tracking-wider block text-[var(--color-text-secondary)] mb-0.5">
                                Block
                              </span>
                              <p className="leading-snug">{SENDER_ACTION_HELP.block}</p>
                            </div>
                          </div>
                        </div>

                        {/* Keep sender button */}
                        {!sender.isProtected ? (
                          <button
                            type="button"
                            onClick={() => addProtectedSender(sender.email)}
                            className="text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)] underline underline-offset-4 transition-colors p-1"
                          >
                            Keep
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 p-1">
                            <Check size={12} />
                            Kept safe
                          </span>
                        )}
                      </div>

                      {/* Combined primary button: Unsubscribe and clear */}
                      <div className="inline-flex items-center gap-0.5">
                        <button
                          type="button"
                          disabled={
                            sender.actionableOldEmailIds.length === 0 &&
                            !sender.hasUnsubscribeUrl
                          }
                          onClick={() =>
                            setSenderConfirm({
                              sender,
                              actionType: 'unsub-and-clear',
                            })
                          }
                          className="px-4 py-2 rounded-full font-semibold text-xs transition-all active:scale-95 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
                          style={{
                            backgroundColor: 'var(--color-primary-btn)',
                            color: 'var(--color-primary-btn-text)',
                          }}
                        >
                          <MailX size={13} />
                          <span>Unsubscribe and clear</span>
                        </button>
                        {/* ? Helper tooltip on desktop, sheet on mobile */}
                        <div className="relative group">
                          <button
                            type="button"
                            onClick={() => setHelpSheetAction('unsub-and-clear')}
                            className="p-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)] hover:bg-[var(--color-hover-tint)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
                            aria-label="Help: Unsubscribe and clear"
                          >
                            <HelpCircle size={13} />
                          </button>
                          {/* Desktop Tooltip */}
                          <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden sm:group-hover:block z-30 w-72 p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-body)] text-xs shadow-lg backdrop-blur-md">
                            <span className="font-bold text-[10px] uppercase tracking-wider block text-[var(--color-text-secondary)] mb-0.5">
                              Unsubscribe and clear
                            </span>
                            <p className="leading-snug">{SENDER_ACTION_HELP['unsub-and-clear']}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}

              {/* Show 30 more button */}
              {visibleSenderCount < filteredSenders.length && (
                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleSenderCount((c) => c + 30)}
                    className="px-5 py-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-hover-tint)] text-xs font-bold text-[var(--color-text-body)] shadow-xs transition-all active:scale-95 flex items-center gap-2"
                  >
                    <span>Show 30 more senders</span>
                    <span className="text-[11px] text-[var(--color-text-secondary)] font-normal">
                      (Showing{' '}
                      {Math.min(visibleSenderCount, filteredSenders.length)} of{' '}
                      {filteredSenders.length})
                    </span>
                    <ChevronDown size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          COMMON SECTION: CLEANUP HISTORY (Last 20 actions with Restore)
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
              Recent cleanup batches. Trashed and archived emails can be restored
              at any time.
            </p>
          </div>
          {cleanupHistory.length > 0 && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-secondary)]">
              {cleanupHistory.length}{' '}
              {cleanupHistory.length === 1 ? 'record' : 'records'}
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
                      {record.emailIds.length}{' '}
                      {record.emailIds.length === 1 ? 'email' : 'emails'} •{' '}
                      {formattedDate}
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
          REVIEW SHEET (Groups: Bottom sheet on mobile, side panel on desktop)
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
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="w-6 h-6 rounded-lg flex items-center justify-center bg-[var(--color-bg)] border border-[var(--color-border)] shrink-0">
                    {getGroupIcon(reviewGroup.id)}
                  </span>
                  <h3
                    id="review-sheet-title"
                    className="font-heading text-lg font-bold tracking-tight"
                  >
                    {reviewGroup.title}
                  </h3>
                </div>
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
                      <span className="font-medium truncate max-w-[140px]">
                        {sender}:
                      </span>
                      <span className="font-bold text-[var(--color-text-body)]">
                        {count}
                      </span>
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
                  onClick={() =>
                    setConfirmState({ group: reviewGroup, action: 'trash' })
                  }
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
                  onClick={() =>
                    setConfirmState({ group: reviewGroup, action: 'archive' })
                  }
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
          GROUP CONFIRMATION DIALOG (Before Trash / Archive)
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
                {confirmState.action === 'trash' ? (
                  <Trash2 size={18} />
                ) : (
                  <Archive size={18} />
                )}
              </div>
              <div>
                <h3
                  id="confirm-dialog-title"
                  className="font-heading text-base font-bold"
                >
                  {confirmState.action === 'trash'
                    ? 'Move to Trash'
                    : 'Archive Emails'}
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1.5 leading-relaxed">
                  {confirmState.action === 'trash'
                    ? `Move ${confirmState.group.count} ${
                        confirmState.group.count === 1 ? 'email' : 'emails'
                      } to Trash? Trashed emails can be restored for 30 days. You can undo this right away.`
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
                onClick={() =>
                  handleExecuteAction(confirmState.group, confirmState.action)
                }
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
          SENDER ACTION CONFIRMATION MODAL (Trash Old / Unsubscribe / Unsub & Clear)
         ========================================================================= */}
      {senderConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sender-confirm-title"
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
                  senderConfirm.actionType === 'unsubscribe'
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                    : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                }`}
              >
                {senderConfirm.actionType === 'unsubscribe' ? (
                  <MailX size={18} />
                ) : (
                  <Trash2 size={18} />
                )}
              </div>
              <div className="space-y-1">
                <h3
                  id="sender-confirm-title"
                  className="font-heading text-base font-bold"
                >
                  {senderConfirm.actionType === 'trash-old' &&
                    'Move Old Emails to Trash'}
                  {senderConfirm.actionType === 'unsubscribe' &&
                    `Unsubscribe from ${senderConfirm.sender.name}`}
                  {senderConfirm.actionType === 'unsub-and-clear' &&
                    `Unsubscribe and Clear Emails`}
                </h3>

                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  {senderConfirm.actionType === 'trash-old' && (
                    <>
                      Move {senderConfirm.sender.actionableOldEmailIds.length}{' '}
                      {senderConfirm.sender.actionableOldEmailIds.length === 1
                        ? 'email'
                        : 'emails'}{' '}
                      older than {outdatedAfterDays} days from{' '}
                      <span className="font-semibold text-[var(--color-text-body)]">
                        {senderConfirm.sender.name}
                      </span>{' '}
                      to Trash?{' '}
                      {senderConfirm.sender.safeKeptCount > 0 && (
                        <span>
                          {senderConfirm.sender.safeKeptCount} kept safe (starred,
                          attachments, replies, receipts).{' '}
                        </span>
                      )}
                      Trashed emails can be restored for 30 days. You can undo
                      this right away.
                    </>
                  )}

                  {senderConfirm.actionType === 'unsubscribe' && (
                    <>
                      Unsubscribe from{' '}
                      <span className="font-semibold text-[var(--color-text-body)]">
                        {senderConfirm.sender.name}
                      </span>
                      ? In demo mode this will mark this sender as unsubscribed
                      and display the demo link message.
                    </>
                  )}

                  {senderConfirm.actionType === 'unsub-and-clear' && (
                    <>
                      Unsubscribe from{' '}
                      <span className="font-semibold text-[var(--color-text-body)]">
                        {senderConfirm.sender.name}
                      </span>{' '}
                      and move{' '}
                      {senderConfirm.sender.actionableOldEmailIds.length}{' '}
                      {senderConfirm.sender.actionableOldEmailIds.length === 1
                        ? 'email'
                        : 'emails'}{' '}
                      older than {outdatedAfterDays} days to Trash?{' '}
                      {senderConfirm.sender.safeKeptCount > 0 && (
                        <span>
                          {senderConfirm.sender.safeKeptCount} kept safe (starred,
                          attachments, replies, receipts).{' '}
                        </span>
                      )}
                      In demo mode this will also mark the sender as
                      unsubscribed. Trashed emails can be restored for 30 days.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSenderConfirm(null)}
                className="px-4 py-2 rounded-xl border border-[var(--color-border)] text-xs font-semibold hover:bg-[var(--color-hover-tint)] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleExecuteSenderAction(
                    senderConfirm.sender,
                    senderConfirm.actionType
                  )
                }
                className="px-4 py-2 rounded-full font-semibold text-xs shadow-xs transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
                style={{
                  backgroundColor: 'var(--color-primary-btn)',
                  color: 'var(--color-primary-btn-text)',
                }}
              >
                {senderConfirm.actionType === 'trash-old' && 'Move to Trash'}
                {senderConfirm.actionType === 'unsubscribe' && 'Confirm Unsubscribe'}
                {senderConfirm.actionType === 'unsub-and-clear' &&
                  'Unsubscribe & Clear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CONFIRMATION MODAL FOR BLOCK SENDER (Matches EmailDetailView behavior)
         ========================================================================= */}
      <ConfirmationModal
        isOpen={Boolean(blockTargetSender)}
        title="Block this sender?"
        message={
          blockTargetSender
            ? `Are you sure you want to block ${blockTargetSender.name} (${blockTargetSender.email})? All past and future emails from this sender will be hidden. You can undo this in Settings at any time.`
            : ''
        }
        confirmLabel="Block Sender"
        isDestructive={true}
        onConfirm={handleConfirmBlock}
        onCancel={() => setBlockTargetSender(null)}
      />

      {/* =========================================================================
          HELP TEXT MODAL / SHEET ("?" Sheet for mobile and details)
         ========================================================================= */}
      {helpSheetAction && (
        <div
          className="fixed inset-0 z-50 flex justify-end items-end sm:items-center sm:justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-[2px] animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-sheet-title"
        >
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() => setHelpSheetAction(null)}
            aria-hidden="true"
          />
          <div
            className="relative z-10 w-full sm:max-w-md max-h-[85vh] rounded-t-[28px] sm:rounded-[24px] border border-[var(--color-border)] shadow-2xl p-6 flex flex-col space-y-4"
            style={{
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-body)',
            }}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <HelpCircle size={18} className="text-[var(--accent-peach)]" />
                <h3 id="help-sheet-title" className="font-heading text-base font-bold">
                  Sender Actions Guide
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setHelpSheetAction(null)}
                className="p-1 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-tint)]"
                aria-label="Close guide"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1">
              {/* Unsubscribe */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  helpSheetAction === 'unsubscribe'
                    ? 'border-[var(--accent-chartreuse)] bg-[var(--color-hover-tint)]'
                    : 'border-[var(--color-border)] bg-[var(--color-bg)]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <MailX size={15} className="text-[#9C4C14] dark:text-[var(--accent-peach)]" />
                  <span className="font-bold text-xs text-[var(--color-text-body)]">
                    Unsubscribe
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  {SENDER_ACTION_HELP.unsubscribe}
                </p>
              </div>

              {/* Block */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  helpSheetAction === 'block'
                    ? 'border-rose-500/50 bg-rose-500/10'
                    : 'border-[var(--color-border)] bg-[var(--color-bg)]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Ban size={15} className="text-rose-600 dark:text-rose-400" />
                  <span className="font-bold text-xs text-[var(--color-text-body)]">
                    Block
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  {SENDER_ACTION_HELP.block}
                </p>
              </div>

              {/* Unsubscribe and clear */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  helpSheetAction === 'unsub-and-clear'
                    ? 'border-[var(--accent-chartreuse)] bg-[var(--color-hover-tint)]'
                    : 'border-[var(--color-border)] bg-[var(--color-bg)]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <MailX size={15} className="text-[#40471A] dark:text-[var(--accent-chartreuse)]" />
                  <span className="font-bold text-xs text-[var(--color-text-body)]">
                    Unsubscribe and clear
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  {SENDER_ACTION_HELP['unsub-and-clear']}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setHelpSheetAction(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full font-semibold text-xs shadow-xs transition-all active:scale-95"
                style={{
                  backgroundColor: 'var(--color-primary-btn)',
                  color: 'var(--color-primary-btn-text)',
                }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          KEEP SENDERS DIALOG (Protect Senders from Group)
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
              Emails from protected senders will never be suggested for cleanup.
              Protect specific senders or all senders in this group.
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
          CLEANUP SNACKBAR (With 10-second Undo for trash, block, and unsubscribe)
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
            {(snackbar.actionRecordId ||
              snackbar.blockedSenderEmail ||
              snackbar.unsubscribedSenderEmail) && (
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
            )}

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
