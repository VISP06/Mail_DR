import React from 'react';
import { Sparkles, Mail, ShieldCheck, ArrowRight } from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '../../constants/app';
import { OrganicBlob } from '../common/OrganicBlob';

interface SignInScreenProps {
  onEnterDemo: () => void;
  onSignInWithGoogle?: () => Promise<void>;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({ onEnterDemo, onSignInWithGoogle }) => {
  const [isSigningIn, setIsSigningIn] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  return (
    <div
      className="h-[100dvh] w-full flex items-center justify-center p-6 relative overflow-hidden"
      style={{
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text-body)',
      }}
    >
      {/* Background Soft Organic Blob Shape (1 of 3 places) */}
      <div className="absolute w-[440px] h-[360px] opacity-75 sm:opacity-90">
        <OrganicBlob variant="sign-in" className="w-full h-full" />
      </div>

      <div
        className="relative z-10 w-full max-w-md p-8 sm:p-10 rounded-[28px] border border-[var(--color-border)] backdrop-blur-md transition-all text-center"
        style={{
          backgroundColor: 'var(--color-surface)',
          boxShadow: '0 8px 32px rgba(41, 45, 30, 0.05)',
        }}
      >
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5 border border-[var(--color-border)] bg-[var(--accent-chartreuse)]/25 text-[var(--color-text-body)]">
          <Mail size={26} strokeWidth={2.2} />
        </div>

        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-[var(--color-text-body)]">
          {APP_NAME}
        </h1>
        <p
          className="mt-2 text-sm leading-relaxed"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {APP_TAGLINE}
        </p>

        {/* Feature Highlights */}
        <div className="my-6 space-y-2.5 text-left border-y border-[var(--color-border)] py-4 text-xs">
          <div className="flex items-center gap-2.5" style={{ color: 'var(--color-text-secondary)' }}>
            <Sparkles size={16} className="text-[var(--accent-peach)] shrink-0" />
            <span>AI category triage & proactive read-first suggestions</span>
          </div>
          <div className="flex items-center gap-2.5" style={{ color: 'var(--color-text-secondary)' }}>
            <ShieldCheck size={16} className="text-[var(--accent-lavender)] shrink-0" />
            <span>User priority rules that AI suggestions never override</span>
          </div>
          <div className="flex items-center gap-2.5" style={{ color: 'var(--color-text-secondary)' }}>
            <span className="w-4 h-4 rounded-full bg-[var(--accent-chartreuse)]/50 flex items-center justify-center font-bold text-[10px] shrink-0 text-[#292D1E]">
              R
            </span>
            <span>Ask your inbox questions with cited semantic search</span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Enter Demo Inbox Primary Pill Button */}
          <button
            type="button"
            onClick={onEnterDemo}
            className="w-full min-h-[48px] px-6 py-3.5 rounded-full font-semibold text-sm tracking-wide flex items-center justify-center gap-2 transition-all hover:opacity-95 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
            style={{
              backgroundColor: 'var(--color-primary-btn)',
              color: 'var(--color-primary-btn-text)',
            }}
          >
            <span>Enter Demo Inbox</span>
            <ArrowRight size={18} />
          </button>

          {/* Google Sign-in Button */}
          <div className="pt-2">
            <button
              type="button"
              disabled={isSigningIn}
              onClick={async () => {
                if (!onSignInWithGoogle) return;
                try {
                  setIsSigningIn(true);
                  setErrorMsg(null);
                  await onSignInWithGoogle();
                } catch (err: any) {
                  console.warn('Google sign-in error:', err);
                  setErrorMsg('Sign-in cancelled or failed. You can also enter demo mode.');
                } finally {
                  setIsSigningIn(false);
                }
              }}
              className="w-full min-h-[48px] px-6 py-3 rounded-full text-xs font-semibold border border-[var(--color-border)] hover:bg-[var(--color-hover-tint)] transition-all flex items-center justify-center gap-2.5 active:scale-[0.99] cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-body)',
              }}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
              <span>{isSigningIn ? 'Connecting with Google...' : 'Continue with Google'}</span>
            </button>
            {errorMsg ? (
              <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
                {errorMsg}
              </p>
            ) : (
              <p
                className="mt-2 text-[11px] font-medium tracking-tight"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Sign in to save and sync categories &amp; rules in Firebase
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
