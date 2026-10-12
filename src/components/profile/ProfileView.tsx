import React, { useState } from 'react';
import {
  ArrowLeft,
  Mail,
  Shield,
  Layers,
  Ban,
  ExternalLink,
  Trash2,
  LogOut,
  Info,
} from 'lucide-react';
import { useInbox } from '../../context/InboxContext';
import { DEMO_USER, UNCATEGORIZED_CATEGORY_ID } from '../../constants/app';
import { ConfirmationModal } from '../common/ConfirmationModal';

export const ProfileView: React.FC = () => {
  const {
    setActiveView,
    setIsAuthenticated,
    emails,
    blockedSenders,
    unsubscribeCount,
    deleteSavedUserData,
  } = useInbox();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Computed inbox stats from local data
  const emailsSortedCount = emails.filter(
    (e) => e.categoryId && e.categoryId !== UNCATEGORIZED_CATEGORY_ID
  ).length;

  const handleDeleteSavedDataConfirm = async () => {
    setIsDeleting(true);
    await deleteSavedUserData();
    setIsDeleting(false);
    setShowDeleteModal(false);
  };

  const handleSignOut = () => {
    setIsAuthenticated(false);
  };

  return (
    <div className="max-w-4xl mx-auto py-2 space-y-8 pb-32">
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

        <h1 className="text-xl font-bold tracking-tight">Profile</h1>
      </div>

      {/* 1. Header: Avatar, Name, Email */}
      <section
        className="p-6 sm:p-7 rounded-[28px] border border-[var(--color-border)] transition-colors flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold border border-[var(--color-border)] shrink-0 shadow-xs"
          style={{
            backgroundColor: 'var(--accent-chartreuse)',
            color: '#292D1E',
          }}
        >
          {DEMO_USER.initial}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-extrabold tracking-tight text-[var(--color-text-body)]">
            {DEMO_USER.name}
          </h2>
          <p
            className="text-xs font-medium mt-0.5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {DEMO_USER.email}
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-[var(--color-border)] bg-[var(--color-hover-tint)]">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-chartreuse)]" />
            <span style={{ color: 'var(--color-text-secondary)' }}>
              Demo Account
            </span>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={handleSignOut}
          className="min-h-[44px] px-4 py-2 rounded-full border border-[var(--color-border)] hover:bg-[var(--color-hover-tint)] text-xs font-semibold flex items-center gap-2 transition-all focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)] self-center sm:self-start"
          title="Sign out and return to sign-in screen"
        >
          <LogOut size={14} />
          <span>Sign out</span>
        </button>
      </section>

      {/* 2. Connected Account Card */}
      <section
        className="p-6 rounded-[28px] border border-[var(--color-border)] transition-colors"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <div className="flex items-center gap-2.5 mb-2">
          <Mail size={18} className="text-[var(--accent-lavender)]" />
          <h2 className="text-base font-bold tracking-tight">Connected Account</h2>
        </div>

        <div className="mt-3 p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-[var(--color-text-body)]">
              Demo mode: using sample emails
            </div>
            <p
              className="text-xs mt-0.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Gmail not connected yet
            </p>
          </div>

          <span
            className="px-3 py-1 rounded-full text-[11px] font-semibold border border-[var(--color-border)] bg-[var(--color-surface)] self-start sm:self-auto"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Sample Provider
          </span>
        </div>
      </section>

      {/* 3. Access Card */}
      <section
        className="p-6 rounded-[28px] border border-[var(--color-border)] transition-colors"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <Shield size={18} className="text-[var(--accent-peach)]" />
            <h2 className="text-base font-bold tracking-tight">Access & Permissions</h2>
          </div>

          <span
            className="text-[11px] px-2.5 py-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-hover-tint)] font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Not active in demo mode
          </span>
        </div>

        <p
          className="text-xs mb-4 leading-relaxed"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          When you connect your Google Workspace account in a future release, Calm Inbox will request only the minimum necessary permissions:
        </p>

        <ul className="space-y-2.5 text-xs">
          <li className="flex items-start gap-2.5 p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]">
            <Info size={15} className="text-[var(--accent-chartreuse)] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[var(--color-text-body)]">Read emails:</strong>
              <span className="ml-1" style={{ color: 'var(--color-text-secondary)' }}>
                Allows the AI assistant to summarize, categorize, and answer inbox questions.
              </span>
            </div>
          </li>
          <li className="flex items-start gap-2.5 p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]">
            <Info size={15} className="text-[var(--accent-lavender)] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[var(--color-text-body)]">Create block filters:</strong>
              <span className="ml-1" style={{ color: 'var(--color-text-secondary)' }}>
                Allows the assistant to create server-level routing filters when you block senders.
              </span>
            </div>
          </li>
        </ul>
      </section>

      {/* 4. Your Inbox at a Glance: Three counts computed from local data */}
      <section
        className="p-6 rounded-[28px] border border-[var(--color-border)] transition-colors"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <div className="flex items-center gap-2.5 mb-2">
          <Layers size={18} className="text-[var(--accent-chartreuse)]" />
          <h2 className="text-base font-bold tracking-tight">Your inbox at a glance</h2>
        </div>
        <p
          className="text-xs mb-5 leading-relaxed"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Activity metrics computed directly from your local session and stored rules.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Emails sorted */}
          <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] flex flex-col justify-between min-h-[90px]">
            <div className="text-2xl font-extrabold tracking-tight text-[var(--color-text-body)]">
              {emailsSortedCount}
            </div>
            <div
              className="text-xs font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Emails sorted
            </div>
          </div>

          {/* Senders blocked */}
          <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] flex flex-col justify-between min-h-[90px]">
            <div className="text-2xl font-extrabold tracking-tight text-[var(--color-text-body)]">
              {blockedSenders.length}
            </div>
            <div
              className="text-xs font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Senders blocked
            </div>
          </div>

          {/* Unsubscribe actions taken */}
          <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] flex flex-col justify-between min-h-[90px]">
            <div className="text-2xl font-extrabold tracking-tight text-[var(--color-text-body)]">
              {unsubscribeCount}
            </div>
            <div
              className="text-xs font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Unsubscribe actions taken
            </div>
          </div>
        </div>
      </section>

      {/* 5. Delete Saved Data Button */}
      <section
        className="p-6 rounded-[28px] border border-rose-500/20 transition-colors"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold tracking-tight text-rose-600 dark:text-rose-400">
              Delete Saved Data
            </h2>
            <p
              className="text-xs mt-1 leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Clears all locally stored categories, priority rules, blocked senders, and sorting results from this browser.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="min-h-[44px] px-5 py-2 rounded-full border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto"
          >
            <Trash2 size={14} />
            <span>Delete saved data</span>
          </button>
        </div>
      </section>

      {/* Confirmation Modal for Delete Saved Data */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Delete all saved data?"
        message="This will clear your local categories, custom priority rules, blocked senders list, unsubscribe history, and email assignments. The demo inbox will return to its clean initial state."
        confirmLabel={isDeleting ? 'Deleting...' : 'Yes, Delete Everything'}
        isDestructive={true}
        onConfirm={handleDeleteSavedDataConfirm}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
};
