import React from 'react';
import { Mail, Settings, BrushCleaning } from 'lucide-react';
import { useInbox } from '../../context/InboxContext';
import { APP_NAME, DEMO_USER } from '../../constants/app';
import { ActiveView } from '../../types';
import { useNavBreakpoint } from '../../hooks/useMediaQuery';

interface NavItemConfig {
  id: ActiveView;
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  isAvatar?: boolean;
}

// Structured as a data array with fourth item Cleanup between Inbox and Settings
const NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', label: 'Inbox', icon: Mail },
  { id: 'cleanup', label: 'Cleanup', icon: BrushCleaning },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'profile', label: 'Profile', isAvatar: true },
];

export const NavRail: React.FC = () => {
  const { isDesktop } = useNavBreakpoint();
  const {
    activeView,
    setActiveView,
    setSelectedEmail,
    emails,
    firebaseUser,
    setHubShownThisSession,
  } = useInbox();

  const unreadCount = emails.filter((e) => e.isUnread).length;

  const avatarInitial = (
    firebaseUser?.displayName?.trim()?.charAt(0) ||
    firebaseUser?.email?.trim()?.charAt(0) ||
    DEMO_USER.initial
  ).toUpperCase();

  const handleNavClick = (viewId: ActiveView) => {
    setActiveView(viewId);
    setSelectedEmail(null);
    setHubShownThisSession(true);
  };

  // Width 600px and above: Render ONLY the Desktop Navigation Rail
  if (isDesktop) {
    return (
      <aside
        id="app-nav-rail"
        data-nav="rail"
        className="w-20 h-full py-6 border-r border-[var(--color-border)] flex flex-col items-center justify-between shrink-0 transition-colors select-none z-20 overflow-y-auto"
        style={{
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-body)',
        }}
        aria-label="Sidebar navigation"
      >
        <div className="flex flex-col items-center gap-8 w-full">
          {/* App Logo / Mark */}
          <button
            type="button"
            onClick={() => handleNavClick('dashboard')}
            title={APP_NAME}
            className="w-12 h-12 rounded-2xl flex items-center justify-center border border-[var(--color-border)] bg-[var(--accent-chartreuse)]/20 text-[#292D1E] hover:opacity-90 transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)]"
          >
            <span className="font-extrabold text-base tracking-tighter">MD</span>
          </button>

          {/* Nav Items Array: Inbox, Settings, Profile */}
          <nav className="flex flex-col items-center gap-4 w-full" aria-label="Main Navigation">
            {NAV_ITEMS.map((item) => {
              const isActive = activeView === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all focus-visible:ring-2 focus-visible:ring-[var(--accent-chartreuse)] ${
                    isActive
                      ? 'border border-[var(--accent-chartreuse)] bg-[var(--color-hover-tint)] text-[var(--color-text-body)] font-semibold shadow-xs'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-tint)]'
                  }`}
                >
                  {item.isAvatar ? (
                    firebaseUser?.photoURL ? (
                      <img
                        src={firebaseUser.photoURL}
                        alt={firebaseUser.displayName || 'Profile'}
                        className="w-7 h-7 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                      />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-transform"
                        style={{
                          backgroundColor: 'var(--accent-chartreuse)',
                          color: '#292D1E',
                          border: '1px solid rgba(116, 121, 90, 0.3)',
                        }}
                      >
                        {avatarInitial}
                      </div>
                    )
                  ) : Icon ? (
                    <Icon size={22} />
                  ) : null}

                  {/* Unread indicator on Inbox */}
                  {item.id === 'dashboard' && unreadCount > 0 && (
                    <span
                      className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: 'var(--accent-peach)' }}
                      title={`${unreadCount} unread`}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom space placeholder */}
        <div className="w-12 h-6" />
      </aside>
    );
  }

  // Width below 600px (and default fallback): Render ONLY the Mobile/Tablet Bottom Bar
  return (
    <nav
      id="app-nav-bottom"
      data-nav="bottom-bar"
      className="w-full border-t border-[var(--color-border)] flex items-center justify-around px-4 z-20 shrink-0 transition-colors backdrop-blur-sm select-none"
      style={{
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text-body)',
        height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      aria-label="Bottom Navigation"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activeView === item.id;
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleNavClick(item.id)}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            className={`min-w-[44px] min-h-[44px] px-2 sm:px-3.5 py-1.5 rounded-xl flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-medium transition-all ${
              isActive
                ? 'bg-[var(--color-hover-tint)] font-bold text-[var(--color-text-body)]'
                : 'text-[var(--color-text-secondary)]'
            }`}
          >
            {item.isAvatar ? (
              firebaseUser?.photoURL ? (
                <img
                  src={firebaseUser.photoURL}
                  alt={firebaseUser.displayName || 'Profile'}
                  className="w-6 h-6 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                />
              ) : (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                  style={{
                    backgroundColor: 'var(--accent-chartreuse)',
                    color: '#292D1E',
                    border: '1px solid rgba(116, 121, 90, 0.3)',
                  }}
                >
                  {avatarInitial}
                </div>
              )
            ) : Icon ? (
              <div className="relative">
                <Icon size={20} />
                {item.id === 'dashboard' && unreadCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                    style={{ backgroundColor: 'var(--accent-peach)' }}
                  />
                )}
              </div>
            ) : null}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
