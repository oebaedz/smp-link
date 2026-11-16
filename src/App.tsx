import {
  BarChart2,
  Building2,
  Database,
  FolderKanban,
  Link2,
  Lock,
  Menu,
  Plus,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AnalyticsView } from './components/AnalyticsView.tsx';
import { GroupModal } from './components/GroupModal.tsx';
import { GroupsView } from './components/GroupsView.tsx';
import { LinkModal } from './components/LinkModal.tsx';
import { LinksTableView } from './components/LinksTableView.tsx';
import { PinGate } from './components/PinGate.tsx';
import { PublicEventDirectory } from './components/PublicEventDirectory.tsx';
import { PublicLinkStatus } from './components/PublicLinkStatus.tsx';
import { QrCodeModal, type QrTarget } from './components/QrCodeModal.tsx';
import { ReorderLinksModal } from './components/ReorderLinksModal.tsx';
import { SchoolEmblem } from './components/SchoolEmblem.tsx';
import { SchoolProfileView } from './components/SchoolProfileView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { api, getStoredToken, setStoredToken } from './lib/api.ts';
import { syncDocumentHead } from './lib/head.ts';
import type {
  AnalyticsRange,
  AnalyticsSummary,
  ClickEvent,
  SchoolGroup,
  SchoolLink,
  SchoolProfile,
} from './types.ts';

type DashboardTab = 'analytics' | 'links' | 'groups' | 'profile' | 'settings';

const RESERVED_ROOT_SEGMENTS = new Set([
  'api',
  'go',
  'status',
  'e',
  'event',
  'assets',
  'src',
  'node_modules',
  'public',
  'dist',
]);

export default function App() {
  // Check if current URL is a public route (/:slug, /e/:slug, /event/:slug, or /status/:slug)
  const rawPathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const pathname = rawPathname.replace(/\/+$/, '') || '/';

  if (pathname.startsWith('/status/')) {
    const slug = decodeURIComponent(pathname.slice('/status/'.length));
    return <PublicLinkStatus slug={slug} />;
  }
  if (pathname.startsWith('/event/')) {
    const groupSlug = decodeURIComponent(pathname.slice('/event/'.length));
    if (groupSlug) {
      return <PublicEventDirectory groupSlug={groupSlug} />;
    }
  }
  if (pathname.startsWith('/e/')) {
    const groupSlug = decodeURIComponent(pathname.slice('/e/'.length));
    if (groupSlug) {
      return <PublicEventDirectory groupSlug={groupSlug} />;
    }
  }
  if (pathname !== '/') {
    const segment = pathname.slice(1);
    if (
      segment &&
      !segment.includes('/') &&
      !segment.includes('.') &&
      !RESERVED_ROOT_SEGMENTS.has(segment.toLowerCase())
    ) {
      return <PublicEventDirectory groupSlug={decodeURIComponent(segment)} />;
    }
  }

  return <DashboardShell />;
}

function DashboardShell() {
  const [authChecking, setAuthChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [isDefaultPin, setIsDefaultPin] = useState(true);
  const [profile, setProfile] = useState<SchoolProfile | null>(null);

  const [activeTab, setActiveTab] = useState<DashboardTab>('analytics');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [mode, setMode] = useState<'local' | 'supabase'>('local');
  const [groups, setGroups] = useState<SchoolGroup[]>([]);
  const [links, setLinks] = useState<SchoolLink[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [range, setRange] = useState<AnalyticsRange>('7d');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [liveConnected, setLiveConnected] = useState(false);

  // Modals
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<SchoolLink | null>(null);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SchoolGroup | null>(null);
  const [qrTarget, setQrTarget] = useState<QrTarget | null>(null);
  const [reorderingGroup, setReorderingGroup] = useState<SchoolGroup | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Keep browser tab title & favicon synced with SchoolProfile
  useEffect(() => {
    if (!profile) return;
    const tabTitle = profile.tabTitle?.trim() || `${profile.schoolName} — Portal Link Sekolah`;
    syncDocumentHead({
      title: tabTitle,
      iconUrl: profile.logoUrl,
      schoolName: profile.schoolName,
    });
  }, [profile]);

  // Verify initial session
  useEffect(() => {
    api
      .getAuthStatus()
      .then((res) => {
        setAuthenticated(res.authenticated);
        setIsDefaultPin(res.isDefaultPin);
        setProfile(res.profile);
      })
      .catch(() => {
        setAuthenticated(false);
      })
      .finally(() => setAuthChecking(false));
  }, []);

  const loadDashboardData = useCallback(
    async (targetRange: AnalyticsRange = range, targetGroupId: string = selectedGroupId) => {
      try {
        const res = await api.getBootstrap(targetRange, targetGroupId || undefined);
        setMode(res.mode);
        setProfile(res.profile);
        setGroups(res.groups);
        setLinks(res.links);
        setAnalytics(res.analytics);
      } catch (err) {
        const status = (err as Error & { status?: number }).status;
        if (status === 401) {
          setAuthenticated(false);
          setStoredToken(null);
        }
      }
    },
    [range, selectedGroupId]
  );

  useEffect(() => {
    if (authenticated) {
      void loadDashboardData(range, selectedGroupId);
    }
  }, [authenticated, range, selectedGroupId, loadDashboardData]);

  // Real-time SSE Subscription for Instant Click Analytics
  useEffect(() => {
    if (!authenticated) return;
    const token = getStoredToken() || '';
    const es = new EventSource(`/api/analytics/live?token=${encodeURIComponent(token)}`);

    es.onopen = () => setLiveConnected(true);
    es.onerror = () => setLiveConnected(false);

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as
          | { type: 'connected' }
          | { type: 'click:recorded'; click: ClickEvent; linkClickCount: number }
          | { type: 'data:updated'; scope: string };

        if (payload.type === 'connected') {
          setLiveConnected(true);
        } else if (payload.type === 'click:recorded') {
          // Update link count optimistically & reload full analytics summary cleanly
          setLinks((prev) =>
            prev.map((l) =>
              l.id === payload.click.linkId ? { ...l, clickCount: payload.linkClickCount } : l
            )
          );
          void api
            .getAnalytics({
              range,
              groupId: selectedGroupId || undefined,
            })
            .then((res) => setAnalytics(res.analytics))
            .catch(() => {});
        } else if (payload.type === 'data:updated') {
          void loadDashboardData(range, selectedGroupId);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    return () => {
      es.close();
      setLiveConnected(false);
    };
  }, [authenticated, range, selectedGroupId, loadDashboardData]);

  const handleLogout = async () => {
    await api.logout().catch(() => {});
    setStoredToken(null);
    setAuthenticated(false);
  };

  const handleToggleLinkActive = async (link: SchoolLink) => {
    try {
      await api.updateLink(link.id, { isActive: !link.isActive });
      showToast(link.isActive ? `Tautan /go/${link.slug} dijeda` : `Tautan /go/${link.slug} diaktifkan`);
      await loadDashboardData(range, selectedGroupId);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengubah status tautan');
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    await api.deleteLink(linkId);
    showToast('Tautan berhasil dihapus');
    await loadDashboardData(range, selectedGroupId);
  };

  const handleDeleteGroup = async (groupId: string) => {
    await api.deleteGroup(groupId);
    if (selectedGroupId === groupId) setSelectedGroupId('');
    showToast('Grup program berhasil dihapus');
    await loadDashboardData(range, selectedGroupId === groupId ? '' : selectedGroupId);
  };

  const handleSimulateClick = async (linkId: string) => {
    try {
      await api.triggerTestVisit(linkId);
      showToast('Uji kunjungan tercatat ke analitik real-time');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mencatat uji klik');
    }
  };

  if (authChecking || !profile) {
    return (
      <div className="min-h-screen bg-[#090D16] flex items-center justify-center p-6">
        <div className="w-72 h-16 bg-[#111827] border border-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <PinGate
        profile={profile}
        isDefaultPin={isDefaultPin}
        onUnlocked={() => setAuthenticated(true)}
      />
    );
  }

  const navItems: Array<{
    id: DashboardTab;
    label: string;
    mobileLabel: string;
    icon: typeof BarChart2;
  }> = [
    { id: 'analytics', label: 'Ringkasan Analitik', mobileLabel: 'Analitik', icon: BarChart2 },
    { id: 'links', label: 'Semua Link', mobileLabel: 'Link', icon: Link2 },
    { id: 'groups', label: 'Grup Event & Program', mobileLabel: 'Event', icon: FolderKanban },
    { id: 'profile', label: 'Profil Sekolah', mobileLabel: 'Profil', icon: Building2 },
    { id: 'settings', label: 'Koneksi DB & PIN', mobileLabel: 'Sistem', icon: Database },
  ];

  const activeTabTitle = navItems.find((n) => n.id === activeTab)?.label || 'Dashboard';

  const openLinkQr = (link: SchoolLink) => {
    const group = groups.find((g) => g.id === link.groupId);
    setQrTarget({ type: 'link', link, group });
  };

  const openEventQr = (group: SchoolGroup) => {
    setQrTarget({ type: 'group', group });
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar Navigation (256px) */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 shrink-0 bg-[#111827] border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* School Brand Header */}
          <div className="flex items-center justify-between gap-2 px-2 pt-1">
            <div className="flex items-center gap-3 min-w-0">
              <SchoolEmblem
                schoolName={profile.schoolName}
                logoUrl={profile.logoUrl}
                size="sm"
              />
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold text-slate-100 truncate">
                  {profile.schoolName}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {mode === 'supabase' ? 'Supabase Live' : 'Mode Lokal Dummy'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Nav Links */}
          <nav className="space-y-1" aria-label="Menu utama dashboard">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick School Event Filter */}
          <div className="pt-4 border-t border-slate-800/80 space-y-1.5">
            <p className="px-3 text-[11px] font-medium text-slate-500">Pintasan Program</p>
            {groups.slice(0, 6).map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => {
                  setSelectedGroupId(group.id);
                  setActiveTab('links');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  selectedGroupId === group.id && activeTab === 'links'
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span className="truncate">{group.name}</span>
                <span className="font-mono-tabular text-[11px] text-slate-500 shrink-0">
                  {links.filter((l) => l.groupId === group.id).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Lock Button */}
        <div className="p-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#090D16] border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-slate-100 transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Kunci Dashboard</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Clean Top Bar */}
        <header className="sticky top-0 z-30 bg-[#090D16]/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu navigasi"
              className="lg:hidden p-2 rounded-lg bg-[#111827] border border-slate-800 text-slate-300"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-sm sm:text-lg font-semibold text-slate-100 truncate">
                {activeTabTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingLink(null);
                setLinkModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Link</span>
            </button>
          </div>
        </header>

        {/* Active View Viewport */}
        <main className="flex-1 p-4 sm:p-6 pb-20 lg:pb-6 max-w-[1440px] w-full mx-auto">
          {activeTab === 'analytics' && analytics && (
            <AnalyticsView
              analytics={analytics}
              groups={groups}
              links={links}
              range={range}
              selectedGroupId={selectedGroupId}
              liveConnected={liveConnected}
              onRangeChange={setRange}
              onGroupFilterChange={setSelectedGroupId}
              onOpenQr={openLinkQr}
              onSimulateClick={handleSimulateClick}
              onNavigateLinks={() => setActiveTab('links')}
            />
          )}

          {activeTab === 'links' && (
            <LinksTableView
              links={links}
              groups={groups}
              selectedGroupId={selectedGroupId}
              onGroupFilterChange={setSelectedGroupId}
              onCreateLink={() => {
                setEditingLink(null);
                setLinkModalOpen(true);
              }}
              onEditLink={(link) => {
                setEditingLink(link);
                setLinkModalOpen(true);
              }}
              onDeleteLink={handleDeleteLink}
              onToggleActive={handleToggleLinkActive}
              onOpenQr={openLinkQr}
              onReorderGroupLinks={(group) => setReorderingGroup(group)}
              onNotify={showToast}
            />
          )}

          {activeTab === 'groups' && (
            <GroupsView
              groups={groups}
              links={links}
              onCreateGroup={() => {
                setEditingGroup(null);
                setGroupModalOpen(true);
              }}
              onEditGroup={(group) => {
                setEditingGroup(group);
                setGroupModalOpen(true);
              }}
              onDeleteGroup={handleDeleteGroup}
              onSelectGroupLinks={(groupId) => {
                setSelectedGroupId(groupId);
                setActiveTab('links');
              }}
              onOpenEventQr={openEventQr}
              onReorderLinks={(group) => setReorderingGroup(group)}
              onNotify={showToast}
            />
          )}

          {activeTab === 'profile' && (
            <SchoolProfileView
              profile={profile}
              onUpdated={(updated) => setProfile(updated)}
              onNotify={showToast}
            />
          )}

          {activeTab === 'settings' && <SettingsView onNotify={showToast} />}
        </main>

        {/* Mobile Bottom Tab Navigation (< lg) */}
        <nav
          aria-label="Navigasi tab mobile"
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#111827]/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-5 h-14"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                  isActive ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate max-w-full px-1">{item.mobileLabel}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Modals */}
      <LinkModal
        isOpen={linkModalOpen}
        editingLink={editingLink}
        groups={groups}
        defaultGroupId={selectedGroupId || undefined}
        onClose={() => setLinkModalOpen(false)}
        onSaved={async (link, isNew) => {
          showToast(
            isNew ? `Tautan /go/${link.slug} berhasil dibuat` : `Tautan /go/${link.slug} diperbarui`
          );
          await loadDashboardData(range, selectedGroupId);
        }}
      />

      <GroupModal
        isOpen={groupModalOpen}
        editingGroup={editingGroup}
        onClose={() => setGroupModalOpen(false)}
        onSaved={async (group, isNew) => {
          showToast(
            isNew ? `Grup "${group.name}" berhasil dibuat` : `Grup "${group.name}" diperbarui`
          );
          await loadDashboardData(range, selectedGroupId);
        }}
      />

      <QrCodeModal
        target={qrTarget}
        profile={profile}
        onClose={() => setQrTarget(null)}
        onNotify={showToast}
      />

      <ReorderLinksModal
        group={reorderingGroup}
        links={links}
        onClose={() => setReorderingGroup(null)}
        onSaved={async () => {
          showToast('Urutan tautan event berhasil disimpan');
          await loadDashboardData(range, selectedGroupId);
        }}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-18 lg:bottom-5 right-4 sm:right-5 z-50 bg-[#1E293B] border border-slate-700 text-slate-100 text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
