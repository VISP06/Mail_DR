import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '../../constants/app';
import { OrganicBlob } from '../common/OrganicBlob';
import { getFriendlyAuthErrorMessage } from '../../services/firebase';

interface SignInScreenProps {
  onEnterDemo: () => void;
  onSignInWithGoogle: (keepSignedIn: boolean) => Promise<void>;
  authInitError?: string | null;
  onRetryAuthInit?: () => void;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({
  onEnterDemo,
  onSignInWithGoogle,
  authInitError,
  onRetryAuthInit,
}) => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      setErrorMsg(null);
      await onSignInWithGoogle(keepSignedIn);
    } catch (err: any) {
      setErrorMsg(getFriendlyAuthErrorMessage(err));
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col justify-between items-center px-4 py-6 sm:py-8 relative overflow-x-hidden select-text"
      style={{
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text-body)',
      }}
    >
      {/* Centered column: max 360px, vertically centered in window */}
      <main className="w-full max-w-[360px] mx-auto flex flex-col items-center text-center my-auto">
        {/* 1. Organic Blob: separate element ABOVE the logo mark, never overlapping any text/controls */}
        <div className="w-full flex items-center justify-center pointer-events-none select-none mb-6">
          <div className="h-[140px] sm:h-[160px] aspect-[220/160] animate-blob-drift flex items-center justify-center">
            <OrganicBlob variant="sign-in" className="w-full h-full" />
          </div>
        </div>

        {/* 2. Text Block: sits on plain background with full contrast */}
        <div className="flex flex-col items-center space-y-3">
          {/* App Logo Mark */}
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-[var(--color-border)] bg-[var(--accent-chartreuse)] text-[#292D1E] shadow-xs">
            <span className="font-extrabold text-lg tracking-tighter">MD</span>
          </div>

          {/* Heading & Tagline */}
          <div className="space-y-1">
            <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-text-body)]">
              {APP_NAME}
            </h1>
            <p className="font-accent text-[19px] sm:text-xl text-[var(--color-text-secondary)]">
              {APP_TAGLINE}
            </p>
          </div>
        </div>

        {/* 3. Actions Section: 28px comfortable spacing */}
        <div className="w-full space-y-4 mt-7">
          {/* Primary Pill Button: Continue with Google */}
          <button
            type="button"
            disabled={isSigningIn}
            onClick={handleSignIn}
            className="w-full min-h-[48px] px-6 py-3.5 rounded-full font-semibold text-sm tracking-wide flex items-center justify-center gap-3 transition-all hover:opacity-95 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)] cursor-pointer disabled:opacity-60 shadow-xs"
            style={{
              backgroundColor: 'var(--color-primary-btn)',
              color: 'var(--color-primary-btn-text)',
            }}
          >
            {isSigningIn ? (
              <>
                <Loader2 size={18} className="animate-spin shrink-0" />
                <span>Signing in...</span>
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
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* "Keep me signed in on this device" Checkbox */}
          <div className="pt-0.5">
            <label className="inline-flex items-start justify-center gap-2.5 cursor-pointer text-left select-none max-w-xs mx-auto">
              <input
                type="checkbox"
                checked={keepSignedIn}
                onChange={(e) => setKeepSignedIn(e.target.checked)}
                className="mt-0.5 rounded border-[var(--color-border)] text-[#292D1E] accent-[var(--accent-chartreuse)] cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-medium text-[var(--color-text-body)]">
                  Keep me signed in on this device
                </span>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Skips this screen next time.
                </p>
              </div>
            </label>
          </div>

          {/* Connection / Timeout Error Banner with Retry */}
          {authInitError && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl border text-xs leading-relaxed flex items-center justify-between gap-3 text-left transition-all"
              style={{
                backgroundColor: 'rgba(240, 166, 111, 0.15)',
                borderColor: 'var(--accent-peach)',
                color: 'var(--color-text-body)',
              }}
            >
              <span>{authInitError}</span>
              {onRetryAuthInit && (
                <button
                  type="button"
                  onClick={onRetryAuthInit}
                  className="px-3 py-1 rounded-full text-xs font-semibold border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-hover-tint)] shrink-0 cursor-pointer transition-all"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Friendly Sign-In Error Display */}
          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-2xl border text-xs leading-relaxed text-left transition-all"
              style={{
                backgroundColor: 'rgba(240, 166, 111, 0.15)',
                borderColor: 'var(--accent-peach)',
                color: 'var(--color-text-body)',
              }}
            >
              {errorMsg}
            </div>
          )}
        </div>

        {/* 4. Demo Block: 24px comfortable spacing */}
        <div className="mt-6 flex flex-col items-center">
          <button
            type="button"
            disabled={isSigningIn}
            onClick={onEnterDemo}
            className="font-medium text-sm text-[var(--color-text-body)] hover:underline focus-visible:underline cursor-pointer transition-colors disabled:opacity-50 py-1"
          >
            Try the demo
          </button>
          <p
            className="text-xs mt-0.5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Uses sample emails. Nothing is connected.
          </p>
        </div>
      </main>

      {/* 5. Footer: Pinned near the bottom of the screen */}
      <footer className="w-full text-center shrink-0 pt-6 pb-2">
        <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)] opacity-80 max-w-[340px] mx-auto px-2">
          MailDR reads your mail to help you sort it. Your emails are never stored.
        </p>
      </footer>
    </div>
  );
};
