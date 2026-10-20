import React from 'react';
import { InboxProvider, useInbox } from './context/InboxContext';
import { SignInScreen } from './components/auth/SignInScreen';
import { NavRail } from './components/navigation/NavRail';
import { DashboardView } from './components/dashboard/DashboardView';
import { EmailDetailView } from './components/email/EmailDetailView';
import { SettingsView } from './components/settings/SettingsView';
import { ProfileView } from './components/profile/ProfileView';
import { CleanupView } from './components/cleanup/CleanupView';
import { CategoryHubView } from './components/hub/CategoryHubView';
import { AskInboxPanel } from './components/rag/AskInboxPanel';
import { ReadSnackbar } from './components/common/ReadSnackbar';
import { LayoutDebugOverlay } from './components/common/LayoutDebugOverlay';
import { OrganicBlob } from './components/common/OrganicBlob';
import { APP_NAME } from './constants/app';
import { useNavBreakpoint } from './hooks/useMediaQuery';
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    isAuthenticated,
    isAuthInitializing,
    authInitError,
    retryAuthInit,
    enterDemo,
    signInWithGoogle,
    activeView,
    selectedEmail,
    layoutDebugOverlay,
    hubShownThisSession,
  } = useInbox();
  const { isDesktop } = useNavBreakpoint();

  // 1. Calm loading screen while Firebase checks session (logo and small spinner, never blank)
  if (isAuthInitializing) {
    return (
      <div
        className="h-[100dvh] w-full flex flex-col items-center justify-center p-6 relative overflow-hidden select-none"
        style={{
          backgroundColor: 'var(--color-bg)',
          color: 'var(--color-text-body)',
        }}
      >
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="h-[120px] aspect-[220/160] animate-blob-drift flex items-center justify-center pointer-events-none select-none mb-1">
            <OrganicBlob variant="sign-in" className="w-full h-full" />
          </div>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center border border-[var(--color-border)] bg-[var(--accent-chartreuse)] text-[#292D1E] shadow-xs">
            <span className="font-extrabold text-base tracking-tighter">MD</span>
          </div>
          <p
            className="font-heading text-lg font-bold tracking-tight"
            style={{ color: 'var(--color-text-body)' }}
          >
            {APP_NAME}
          </p>
          <div className="flex items-center gap-2 mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            <Loader2 size={16} className="animate-spin text-[var(--accent-chartreuse)]" />
            <span className="text-xs">Checking sign-in...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Sign-in screen if not yet authenticated
  if (!isAuthenticated) {
    return (
      <>
        <SignInScreen
          onEnterDemo={enterDemo}
          onSignInWithGoogle={signInWithGoogle}
          authInitError={authInitError}
          onRetryAuthInit={retryAuthInit}
        />
        {layoutDebugOverlay && <LayoutDebugOverlay />}
      </>
    );
  }

  const isHubActive = !selectedEmail && !hubShownThisSession;

  // 2. Authenticated layout: exactly 100dvh, 100% width, overflow hidden, CSS grid shell
  return (
    <div
      id="app-shell"
      className="h-[100dvh] w-full overflow-hidden select-text transition-colors"
      style={{
        display: 'grid',
        width: '100%',
        height: '100dvh',
        overflow: 'hidden',
        gridTemplateColumns: isHubActive ? '100%' : isDesktop ? '80px minmax(0, 1fr)' : '100%',
        gridTemplateRows: isHubActive ? '100%' : isDesktop ? '100%' : 'minmax(0, 1fr) auto',
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text-body)',
      }}
    >
      {/* Rail layout: Rail sits in Column 1 (Hidden on Hub screen) */}
      {!isHubActive && isDesktop && (
        <div className="animate-nav-fade-in h-full">
          <NavRail />
        </div>
      )}

      {/* Main column wrapper (Row 1 on mobile, Col 2 on desktop; Full 100% on Hub) */}
      <div
        id="app-main-column"
        data-main="content"
        className="relative min-w-0 min-h-0 h-full w-full overflow-hidden flex flex-col"
        style={{
          gridColumn: isHubActive ? '1 / 2' : isDesktop ? '2 / 3' : '1 / 2',
          gridRow: '1 / 2',
        }}
      >
        {/* Only main content area scrolls: overflow-y auto, overflow-x hidden, min-w-0, min-h-0 */}
        <main
          id="app-main-scroll"
          className="flex-1 min-w-0 min-h-0 h-full overflow-y-auto overflow-x-hidden"
        >
          {isHubActive ? (
            <CategoryHubView />
          ) : (
            <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 animate-inbox-fade-in">
              {selectedEmail ? (
                <EmailDetailView />
              ) : activeView === 'settings' ? (
                <SettingsView />
              ) : activeView === 'profile' ? (
                <ProfileView />
              ) : activeView === 'cleanup' ? (
                <CleanupView />
              ) : (
                <DashboardView />
              )}
            </div>
          )}
        </main>

        {/* Floating "Ask your inbox" button (Hidden on Hub screen) */}
        {!isHubActive && <AskInboxPanel />}
      </div>

      {/* Bottom bar layout: Bottom bar sits in Row 2 (Hidden on Hub screen) */}
      {!isHubActive && !isDesktop && (
        <div className="animate-nav-fade-in w-full">
          <NavRail />
        </div>
      )}

      {/* Floating Read/Undo Snackbar */}
      <ReadSnackbar />

      {/* Layout debug overlay */}
      {layoutDebugOverlay && <LayoutDebugOverlay />}
    </div>
  );
};

export default function App() {
  return (
    <InboxProvider>
      <AppContent />
    </InboxProvider>
  );
}
