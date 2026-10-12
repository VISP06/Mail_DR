import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  X,
  Send,
  ExternalLink,
  Loader2,
  Mail,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useInbox } from '../../context/InboxContext';
import { RagService } from '../../services/ragService';
import { RagChatMessage, RagCitation } from '../../types';
import { useNavBreakpoint } from '../../hooks/useMediaQuery';

const ragService = RagService.getInstance();

const SUGGESTED_QUERIES = [
  'What bills are due soon and how much?',
  'Any flight or travel updates?',
  'What feedback or tasks require my review?',
  'Did mom or family send any updates?',
];

export const AskInboxPanel: React.FC = () => {
  const { isRagOpen, setIsRagOpen, emails, openEmailById } = useInbox();
  const { isDesktop } = useNavBreakpoint();
  const [messages, setMessages] = useState<RagChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      content:
        'Hello. You can ask anything about your emails. I will search your inbox using vector embeddings and cite the exact messages used.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRagOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isRagOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || isLoading) return;

    setInputQuery('');
    setErrorMsg(null);

    const userMsg: RagChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await ragService.ask(q, emails);

      const assistantMsg: RagChatMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        content: response.answer,
        citations: response.citations,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('RAG query error:', err);
      setErrorMsg('Could not query inbox right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCitationClick = (citation: RagCitation) => {
    openEmailById(citation.id);
  };

  return (
    <>
      {/* Floating Action Button (FAB) - Positioned dynamically via useNavBreakpoint */}
      <button
        type="button"
        id="ask-inbox-floating-button"
        data-floating-button="ask-inbox"
        onClick={() => setIsRagOpen(!isRagOpen)}
        title="Ask your inbox (RAG assistant)"
        className={`fixed right-6 z-40 min-h-[52px] px-5 py-3 rounded-full shadow-lg flex items-center gap-2.5 transition-all font-semibold text-sm active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)] ${
          isDesktop ? 'bottom-8' : 'bottom-20'
        } ${isRagOpen ? 'scale-90 opacity-90' : 'hover:scale-105'}`}
        style={{
          backgroundColor: 'var(--color-primary-btn)',
          color: 'var(--color-primary-btn-text)',
        }}
        aria-label="Ask your inbox"
      >
        <Sparkles size={18} />
        <span className="hidden sm:inline">Ask inbox</span>
      </button>

      {/* Floating Chat Drawer / Panel */}
      {isRagOpen && (
        <aside
          className={`fixed right-4 sm:right-6 z-50 w-[calc(100vw-32px)] sm:w-[420px] max-h-[80dvh] h-[580px] rounded-[28px] border border-[var(--color-border)] shadow-2xl flex flex-col overflow-hidden transition-all backdrop-blur-md ${
            isDesktop ? 'bottom-24' : 'bottom-24'
          }`}
          style={{
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-body)',
          }}
          aria-label="Ask your inbox chat"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[var(--accent-chartreuse)]/30 flex items-center justify-center text-[#292D1E]">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">Ask your inbox</h3>
                <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  Answers grounded strictly in your emails
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsRagOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--color-hover-tint)] text-[var(--color-text-secondary)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
              title="Close panel"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'rounded-br-sm'
                      : 'rounded-bl-sm border border-[var(--color-border)]'
                  }`}
                  style={{
                    backgroundColor:
                      msg.sender === 'user'
                        ? 'var(--color-primary-btn)'
                        : 'var(--color-surface-elevated)',
                    color:
                      msg.sender === 'user'
                        ? 'var(--color-primary-btn-text)'
                        : 'var(--color-text-body)',
                  }}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Citations Linking to Emails */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-[var(--color-border)] space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
                        Citations:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.citations.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleCitationClick(c)}
                            title={`Open email: ${c.subject}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-[var(--accent-chartreuse)] bg-[var(--accent-chartreuse)]/15 text-[#292D1E] hover:bg-[var(--accent-chartreuse)]/30 transition-all focus-visible:ring-1 focus-visible:ring-[var(--accent-chartreuse)] text-left truncate max-w-[280px]"
                          >
                            <Mail size={11} className="shrink-0" />
                            <span className="truncate">[{c.index}] {c.subject}</span>
                            <ExternalLink size={10} className="shrink-0 opacity-70" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <span
                  className="text-[10px] mt-1 px-1 font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-2">
                <div
                  className="p-3.5 rounded-2xl rounded-bl-sm border border-[var(--color-border)] text-xs flex items-center gap-2"
                  style={{ backgroundColor: 'var(--color-surface-elevated)' }}
                >
                  <Loader2 size={14} className="animate-spin text-[var(--accent-chartreuse)]" />
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    Searching inbox vectors & reasoning...
                  </span>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Starter Chips */}
          {messages.length <= 2 && (
            <div className="px-4 py-2 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
              <span
                className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Suggested questions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_QUERIES.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(q)}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-[var(--color-border)] hover:bg-[var(--color-hover-tint)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)] transition-all truncate text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Query Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-[var(--color-border)] flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask anything about your emails..."
              className="flex-1 px-4 py-2.5 text-xs rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-secondary)]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isLoading}
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-primary-btn)',
                color: 'var(--color-primary-btn-text)',
              }}
              title="Send question"
            >
              <Send size={15} />
            </button>
          </form>
        </aside>
      )}
    </>
  );
};
