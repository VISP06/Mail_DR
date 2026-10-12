import React, { useState } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Ban,
  Clock,
  CheckCircle2,
  ExternalLink,
  Tag,
  AlertTriangle,
} from 'lucide-react';
import { useInbox } from '../../context/InboxContext';
import { summarizeEmailApi } from '../../services/geminiService';
import { EmailSummary } from '../../types';
import { SenderAvatar } from '../common/CategoryBadge';
import { ConfirmationModal } from '../common/ConfirmationModal';

export const EmailDetailView: React.FC = () => {
  const {
    selectedEmail,
    setSelectedEmail,
    categories,
    getCategoryById,
    moveEmailToCategory,
    blockSender,
    recordUnsubscribeAction,
  } = useInbox();

  const [summary, setSummary] = useState<EmailSummary | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Modals state
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showUnsubModal, setShowUnsubModal] = useState(false);
  const [unsubscribed, setUnsubscribed] = useState(false);

  if (!selectedEmail) return null;

  const currentCategory = getCategoryById(selectedEmail.categoryId);

  const handleSummarize = async () => {
    setIsSummarizing(true);
    setSummaryError(null);
    try {
      const res = await summarizeEmailApi(selectedEmail);
      setSummary(res);
    } catch (err: any) {
      setSummaryError('Could not summarize this email right now. Please try again.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleBlockConfirm = async () => {
    setShowBlockModal(false);
    await blockSender(selectedEmail.senderEmail);
    setSelectedEmail(null);
  };

  const handleUnsubConfirm = () => {
    setShowUnsubModal(false);
    setUnsubscribed(true);
    recordUnsubscribeAction();
    if (selectedEmail.unsubscribeUrl) {
      window.open(selectedEmail.unsubscribeUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-2 pb-36 sm:pb-32">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4">
        <button
          type="button"
          onClick={() => setSelectedEmail(null)}
          className="min-h-[44px] px-3.5 sm:px-4 py-2 rounded-full border border-[var(--color-border)] flex items-center gap-2 text-xs font-semibold hover:bg-[var(--color-hover-tint)] transition-all focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)] shrink-0"
          style={{ color: 'var(--color-text-body)' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Inbox</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Unsubscribe Button (ONLY if unsubscribeUrl exists) */}
          {selectedEmail.unsubscribeUrl && (
            <button
              type="button"
              disabled={unsubscribed}
              onClick={() => setShowUnsubModal(true)}
              className="min-h-[44px] px-3 sm:px-3.5 py-1.5 rounded-full border border-[var(--color-border)] text-xs font-semibold hover:bg-[var(--color-hover-tint)] transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)] disabled:opacity-50 shrink-0"
              style={{ color: unsubscribed ? '#5C6044' : '#9C4C14' }}
            >
              <ExternalLink size={14} />
              <span>{unsubscribed ? 'Unsubscribed' : 'Unsubscribe'}</span>
            </button>
          )}

          {/* Block Sender Button */}
          <button
            type="button"
            onClick={() => setShowBlockModal(true)}
            className="min-h-[44px] px-3 sm:px-3.5 py-1.5 rounded-full border border-[var(--color-border)] text-xs font-semibold hover:bg-[var(--color-hover-tint)] transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)] shrink-0"
            style={{ color: '#C9557F' }}
          >
            <Ban size={14} />
            <span>Block Sender</span>
          </button>
        </div>
      </div>

      {/* Cream Reading Surface - Fixed cream (#FAF7EE) with dark olive (#292D1E) text in both themes */}
      <article
        className="rounded-[24px] sm:rounded-[28px] border border-[rgba(116,121,90,0.25)] p-4 sm:p-7 md:p-9 shadow-sm transition-colors overflow-hidden"
        style={{
          backgroundColor: '#FAF7EE', // Cream reading surface
          color: '#292D1E', // Dark olive text
        }}
        aria-label="Email details"
      >
        {/* Email Header */}
        <header className="border-b border-[rgba(116,121,90,0.2)] pb-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-[#292D1E] flex-1 break-words min-w-0">
              {selectedEmail.subject}
            </h1>

            {/* Category Dropdown Selector (Move category & remember for sender) */}
            <div className="flex items-center gap-2 shrink-0 max-w-full">
              <Tag size={15} className="text-[#5C6044] shrink-0" />
              <label htmlFor="category-select" className="sr-only">Category</label>
              <select
                id="category-select"
                value={selectedEmail.categoryId || ''}
                onChange={(e) =>
                  moveEmailToCategory(selectedEmail.id, e.target.value, true)
                }
                className="text-xs font-semibold py-1.5 px-3 rounded-full border border-[rgba(116,121,90,0.3)] bg-[#F5F3DF] text-[#292D1E] focus-visible:ring-2 focus-visible:ring-[#292D1E] cursor-pointer max-w-[200px] truncate"
                title="Change category (remembers preference for this sender)"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sender Details & Summarize Button Row:
              On screens < 640px: sender details wrap properly, and Summarize button is full-width pill on its own row below.
              On >= 640px: Summarize button is on the right of sender row. */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
              <SenderAvatar
                name={selectedEmail.senderName}
                color={currentCategory?.color || '#C8B8D8'}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-x-2 gap-y-0.5 min-w-0">
                  <span className="text-sm font-bold text-[#292D1E] truncate block max-w-full">
                    {selectedEmail.senderName}
                  </span>
                  <span className="text-xs text-[#5C6044] truncate block max-w-full">
                    &lt;{selectedEmail.senderEmail}&gt;
                  </span>
                </div>
                <time
                  dateTime={selectedEmail.date}
                  className="text-xs text-[#5C6044] block mt-0.5"
                >
                  {new Date(selectedEmail.date).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </time>
              </div>
            </div>

            {/* Summarize Action Button */}
            <button
              type="button"
              onClick={handleSummarize}
              disabled={isSummarizing}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-full font-semibold text-xs tracking-wide flex items-center justify-center gap-2 transition-all shadow-xs hover:opacity-95 active:scale-98 disabled:opacity-60 shrink-0"
              style={{
                backgroundColor: '#292D1E',
                color: '#E8F49A',
              }}
            >
              <Sparkles size={14} className={isSummarizing ? 'animate-spin shrink-0' : 'shrink-0'} />
              <span>{isSummarizing ? 'Summarizing...' : 'Summarize'}</span>
            </button>
          </div>
        </header>

        {/* AI Summary Card (If generated) */}
        {summary && (
          <section
            className="mb-6 p-4 sm:p-5 rounded-2xl border border-[rgba(116,121,90,0.3)] bg-[#F2F0D5]/80 text-[#292D1E] animate-fadeIn"
            aria-label="Email AI Summary"
          >
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-[#292D1E]">
              <Sparkles size={15} className="text-[#9C4C14]" />
              <span>AI Summary</span>
            </div>
            <p className="text-sm leading-relaxed text-[#292D1E] mb-3">
              {summary.summary}
            </p>

            {(summary.actionNeeded || summary.deadline) && (
              <div className="flex flex-wrap gap-3 pt-2 border-t border-[rgba(116,121,90,0.2)] text-xs">
                {summary.actionNeeded && (
                  <div className="flex items-center gap-1.5 font-medium text-[#292D1E]">
                    <CheckCircle2 size={14} className="text-[#6B7A22]" />
                    <span><strong>Action:</strong> {summary.actionNeeded}</span>
                  </div>
                )}
                {summary.deadline && (
                  <div className="flex items-center gap-1.5 font-medium text-[#9C4C14]">
                    <Clock size={14} />
                    <span><strong>Deadline:</strong> {summary.deadline}</span>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {summaryError && (
          <div className="mb-6 p-3 rounded-xl bg-red-50 text-red-800 text-xs flex items-center gap-2">
            <AlertTriangle size={15} />
            <span>{summaryError}</span>
          </div>
        )}

        {/* Email Body */}
        <div className="prose prose-sm max-w-none text-[#292D1E] leading-relaxed whitespace-pre-line text-sm font-normal break-words overflow-hidden">
          {selectedEmail.bodyText}
        </div>
      </article>

      {/* Confirmation Modal for Block Sender */}
      <ConfirmationModal
        isOpen={showBlockModal}
        title="Block this sender?"
        message={`Are you sure you want to block ${selectedEmail.senderName} (${selectedEmail.senderEmail})? All past and future emails from this sender will be hidden. You can undo this in Settings at any time.`}
        confirmLabel="Block Sender"
        isDestructive={true}
        onConfirm={handleBlockConfirm}
        onCancel={() => setShowBlockModal(false)}
      />

      {/* Confirmation Modal for Unsubscribe */}
      <ConfirmationModal
        isOpen={showUnsubModal}
        title="Unsubscribe from sender?"
        message={`Do you want to unsubscribe from emails sent by ${selectedEmail.senderName}? We will redirect you to their official opt-out portal.`}
        confirmLabel="Continue to Unsubscribe"
        isDestructive={false}
        onConfirm={handleUnsubConfirm}
        onCancel={() => setShowUnsubModal(false)}
      />
    </div>
  );
};
