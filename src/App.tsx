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

  // 2. Authenticated layout
  return (
    <div
      className={`min-h-[100dvh] flex ${
        isDesktop ? 'flex-row' : 'flex-col pb-20'
      } transition-colors`}
      style={{
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text-body)',
      }}
    >
      {/* Navigation rail (Desktop left rail / Mobile bottom bar) */}
      <NavRail />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {selectedEmail ? (
          <EmailDetailView />
        ) : activeView === 'settings' ? (
          <SettingsView />
        ) : activeView === 'profile' ? (
          <ProfileView />
        ) : (
          <DashboardView />
        )}
      </main>

      {/* Floating Ask Your Inbox (RAG) assistant */}
      <AskInboxPanel />

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
