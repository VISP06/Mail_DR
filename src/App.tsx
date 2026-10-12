import React from 'react';
import { InboxProvider, useInbox } from './context/InboxContext';
import { SignInScreen } from './components/auth/SignInScreen';
import { NavRail } from './components/navigation/NavRail';
import { DashboardView } from './components/dashboard/DashboardView';
import { EmailDetailView } from './components/email/EmailDetailView';
import { SettingsView } from './components/settings/SettingsView';
import { ProfileView } from './components/profile/ProfileView';
import { AskInboxPanel } from './components/rag/AskInboxPanel';
import { ReadSnackbar } from './components/common/ReadSnackbar';
import { LayoutDebugOverlay } from './components/common/LayoutDebugOverlay';
import { useNavBreakpoint } from './hooks/useMediaQuery';

const AppContent: React.FC = () => {
  const {
    isAuthenticated,
    setIsAuthenticated,
    activeView,
    selectedEmail,
    layoutDebugOverlay,
  } = useInbox();
  const { isDesktop } = useNavBreakpoint();

  // 1. Sign-in screen if not yet authenticated
  if (!isAuthenticated) {
    return (
      <>
        <SignInScreen onEnterDemo={() => setIsAuthenticated(true)} />
        {layoutDebugOverlay && <LayoutDebugOverlay />}
      </>
    );
  }

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
        gridTemplateColumns: isDesktop ? '80px minmax(0, 1fr)' : '100%',
        gridTemplateRows: isDesktop ? '100%' : 'minmax(0, 1fr) auto',
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text-body)',
      }}
    >
      {/* Rail layout: Rail sits in Column 1 */}
      {isDesktop && <NavRail />}

      {/* Main column wrapper (Row 1 on mobile, Col 2 on desktop) - positioned relative for floating button */}
      <div
        id="app-main-column"
        data-main="content"
        className="relative min-w-0 min-h-0 h-full w-full overflow-hidden flex flex-col"
        style={{
          gridColumn: isDesktop ? '2 / 3' : '1 / 2',
          gridRow: isDesktop ? '1 / 2' : '1 / 2',
        }}
      >
        {/* Only main content area scrolls: overflow-y auto, overflow-x hidden, min-w-0, min-h-0 */}
        <main
          id="app-main-scroll"
          className="flex-1 min-w-0 min-h-0 h-full overflow-y-auto overflow-x-hidden"
        >
          {/* Centered max-width container with comfortable padding and bottom clearance */}
          <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28">
            {selectedEmail ? (
              <EmailDetailView />
            ) : activeView === 'settings' ? (
              <SettingsView />
            ) : activeView === 'profile' ? (
              <ProfileView />
            ) : (
              <DashboardView />
            )}
          </div>
        </main>

        {/* Floating "Ask your inbox" button - positioned absolute inside main area wrapper (16px bottom-right) */}
        <AskInboxPanel />
      </div>

      {/* Bottom bar layout: Bottom bar sits in Row 2 */}
      {!isDesktop && <NavRail />}

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
