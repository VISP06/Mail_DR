import React, { useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import { getFriendlyAuthErrorMessage } from '../../services/firebase';

interface ConnectGmailCardProps {
  isExpired?: boolean;
  onConnect: () => Promise<void>;
  className?: string;
}

export const ConnectGmailCard: React.FC<ConnectGmailCardProps> = ({
  isExpired = false,
  onConnect,
  className = '',
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setErrorMsg(null);
      await onConnect();
    } catch (err: any) {
      setErrorMsg(getFriendlyAuthErrorMessage(err));
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div
      role="region"
      aria-label="Gmail Connection"
      className={`w-full max-w-lg mx-auto p-7 sm:p-9 rounded-[28px] border border-[var(--color-border)] transition-all text-center flex flex-col items-center select-text shadow-xs ${className}`}
      style={{
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text-body)',
      }}
    >
      {/* Icon mark */}
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-[var(--color-border)] bg-[var(--accent-chartreuse)]/25 text-[#292D1E] mb-5">
        <Mail size={24} className="text-[#292D1E]" />
      </div>

      {/* Heading */}
      <h2 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
        {isExpired ? 'Your Gmail connection expired' : 'Connect Gmail'}
      </h2>

      {/* Description */}
      <p
        className="text-sm leading-relaxed max-w-md mx-auto mb-6"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {isExpired
          ? 'Your Gmail connection expired. Reconnect to resume reading and sorting your mail.'
          : 'MailDR needs permission to read your mail'}
      </p>

      {/* Action Button */}
      <button
        type="button"
        disabled={isConnecting}
        onClick={handleConnect}
        className="min-h-[48px] px-7 py-3 rounded-full font-semibold text-sm tracking-wide flex items-center justify-center gap-3 transition-all hover:opacity-95 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)] cursor-pointer disabled:opacity-60 shadow-xs"
        style={{
          backgroundColor: 'var(--color-primary-btn)',
          color: 'var(--color-primary-btn-text)',
        }}
      >
        {isConnecting ? (
          <>
            <Loader2 size={18} className="animate-spin shrink-0" />
            <span>Connecting Gmail...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isExpired ? 'Reconnect Gmail' : 'Connect Gmail'}</span>
          </>
        )}
      </button>

      {/* Error message */}
      {errorMsg && (
        <div
          role="alert"
          className="mt-4 p-3 rounded-2xl border text-xs leading-relaxed max-w-md text-left transition-all"
          style={{
            backgroundColor: 'rgba(240, 166, 111, 0.15)',
            borderColor: 'var(--accent-peach)',
            color: 'var(--color-text-body)',
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Reassurance note */}
      <span className="text-[11px] mt-5 opacity-75" style={{ color: 'var(--color-text-secondary)' }}>
        Read-only access. Your messages are never altered or stored.
      </span>
    </div>
  );
};
