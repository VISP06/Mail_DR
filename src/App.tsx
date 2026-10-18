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
import { useNavBreakpoint } from './hooks/useMediaQuery';

const AppContent: React.FC = () => {
  const {
    isAuthenticated,
    setIsAuthenticated,
    signInWithGoogle,
    activeView,
    selectedEmail,
    layoutDebugOverlay,
    hubShownThisSession,
  } = useInbox();
  const { isDesktop } = useNavBreakpoint();

  // 1. Sign-in screen if not yet authenticated
  if (!isAuthenticated) {
    return (
      <>
        <SignInScreen
          onEnterDemo={() => setIsAuthenticated(true)}
          onSignInWithGoogle={signInWithGoogle}
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
