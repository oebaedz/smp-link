import {
  ArrowUpRight,
  BarChart3,
  Check,
  Copy,
  Pencil,
  Plus,
  QrCode,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  api,
  buildShortUrl,
  formatDateTimeId,
  formatNumber,
  formatRelativeTimeId,
} from '../lib/api.ts';
import type {
  AnalyticsSummary,
  LinkScheduleStatus,
  SchoolGroup,
  SchoolLink,
} from '../types.ts';
import { StatusLabel } from './StatusLabel.tsx';
import { TrafficChart } from './TrafficChart.tsx';

interface LinksTableViewProps {
  links: SchoolLink[];
  groups: SchoolGroup[];
  selectedGroupId: string;
  onGroupFilterChange: (groupId: string) => void;
  onCreateLink: () => void;
  onEditLink: (link: SchoolLink) => void;
  onDeleteLink: (linkId: string) => Promise<void>;
  onToggleActive: (link: SchoolLink) => Promise<void>;
  onOpenQr: (link: SchoolLink) => void;
  onNotify: (message: string) => void;
}

export function LinksTableView({
  links,
  groups,
  selectedGroupId,
  onGroupFilterChange,
  onCreateLink,
  onEditLink,
  onDeleteLink,
  onToggleActive,
  onOpenQr,
  onNotify,
}: LinksTableViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LinkScheduleStatus>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SchoolLink | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Per-link analytics inspector drawer state
  const [inspectedLink, setInspectedLink] = useState<SchoolLink | null>(null);
  const [linkAnalytics, setLinkAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loadingInspector, setLoadingInspector] = useState(false);

  const groupMap = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  const filteredLinks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return links.filter((link) => {
      if (selectedGroupId && link.groupId !== selectedGroupId) return false;
      if (statusFilter !== 'all' && link.status !== statusFilter) return false;
      if (!q) return true;
      return (
        link.title.toLowerCase().includes(q) ||
        link.slug.toLowerCase().includes(q) ||
        link.destinationUrl.toLowerCase().includes(q)
      );
    });
  }, [links, selectedGroupId, statusFilter, searchQuery]);

  const handleCopy = async (link: SchoolLink) => {
    try {
      await navigator.clipboard.writeText(buildShortUrl(link.slug));
      setCopiedId(link.id);
      onNotify(`Tautan /go/${link.slug} disalin`);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      onNotify('Gagal menyalin tautan');
    }
  };

  const handleOpenInspector = async (link: SchoolLink) => {
    setInspectedLink(link);
    setLoadingInspector(true);
    try {
      const res = await api.getAnalytics({ range: '7d', linkId: link.id });
      setLinkAnalytics(res.analytics);
    } catch {
      setLinkAnalytics(null);
    } finally {
      setLoadingInspector(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await onDeleteLink(confirmDelete.id);
      if (inspectedLink?.id === confirmDelete.id) {
        setInspectedLink(null);
      }
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Toolbar Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
          <div className="relative flex-1 max-w-sm min-w-[200px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul, slug, atau URL tujuan..."
              className="w-full bg-[#111827] border border-slate-800 focus:border-blue-500 focus:outline-none rounded-xl pl-10 pr-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <select
            aria-label="Filter grup"
            value={selectedGroupId}
            onChange={(e) => onGroupFilterChange(e.target.value)}
            className="bg-[#111827] border border-slate-800 focus:border-blue-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-slate-200"
          >
            <option value="">Semua Grup Program</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <div className="inline-flex items-center p-1 bg-[#111827] border border-slate-800 rounded-xl">
            {(
              [
                { id: 'all', label: 'Semua' },
                { id: 'active', label: 'Aktif' },
                { id: 'scheduled', label: 'Terjadwal' },
                { id: 'expired', label: 'Kedaluwarsa' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onCreateLink}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Link</span>
        </button>
      </div>

      {/* Links Data Grid */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
        {filteredLinks.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-200 mb-1">
              Tidak ada tautan yang sesuai filter
            </p>
            <p className="text-xs text-slate-400 mb-5">
              Ubah kata kunci pencarian atau buat tautan singkat baru untuk program sekolah.
            </p>
            <button
              type="button"
              onClick={onCreateLink}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Tautan Pertama</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-medium text-slate-400">
                  <th className="py-3.5 px-5">Judul & URL Tujuan</th>
                  <th className="py-3.5 px-4">Short URL</th>
                  <th className="py-3.5 px-4">Event / Program</th>
                  <th className="py-3.5 px-4">Status & Jadwal</th>
                  <th className="py-3.5 px-4 text-right">Klik</th>
                  <th className="py-3.5 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {filteredLinks.map((link) => {
                  const group = groupMap.get(link.groupId);
                  return (
                    <tr key={link.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-5 min-w-[230px]">
                        <p className="font-medium text-slate-100 truncate max-w-xs">
                          {link.title}
                        </p>
                        <p className="text-xs font-mono-tabular text-slate-500 truncate max-w-xs">
                          {link.destinationUrl}
                        </p>
                      </td>

                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="font-mono-tabular text-xs text-blue-400">
                            /go/{link.slug}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(link)}
                            title="Salin URL singkat"
                            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
                          >
                            {copiedId === link.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-300">
                        <p className="truncate max-w-[180px]">{group?.name ?? 'Umum'}</p>
                        <p className="text-[11px] text-slate-500">{group?.category ?? '—'}</p>
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <StatusLabel status={link.status} />
                          <p className="text-[11px] font-mono-tabular text-slate-500 whitespace-nowrap">
                            {link.expiresAt
                              ? `Hingga ${formatDateTimeId(link.expiresAt)}`
                              : link.startsAt
                              ? `Mulai ${formatDateTimeId(link.startsAt)}`
                              : 'Aktif permanen'}
                          </p>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-slate-100">
                        {formatNumber(link.clickCount)}
                      </td>

                      <td className="py-3 px-5 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <a
                            href={`/go/${link.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Buka & Uji Redirect"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => onOpenQr(link)}
                            title="Unduh QR Code"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenInspector(link)}
                            title="Analitik Detail Link"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleActive(link)}
                            title={link.isActive ? 'Nonaktifkan sementara' : 'Aktifkan kembali'}
                            className="px-2 py-1 rounded-lg text-[11px] font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            {link.isActive ? 'Jeda' : 'Aktifkan'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditLink(link)}
                            title="Edit Tautan"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(link)}
                            title="Hapus Tautan"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Per-Link Analytics Drawer Modal */}
      {inspectedLink && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Detail analitik tautan"
        >
          <div className="w-full max-w-lg bg-[#111827] border-l border-slate-800 h-full overflow-y-auto p-6 space-y-6">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="min-w-0">
                <p className="text-xs font-mono-tabular text-blue-400">/go/{inspectedLink.slug}</p>
                <h3 className="font-display text-lg font-semibold text-slate-100 mt-0.5">
                  {inspectedLink.title}
                </h3>
                <p className="text-xs text-slate-400 truncate mt-1">
                  Tujuan: {inspectedLink.destinationUrl}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedLink(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingInspector || !linkAnalytics ? (
              <div className="space-y-4">
                <div className="h-20 bg-slate-800/50 rounded-xl animate-pulse" />
                <div className="h-48 bg-slate-800/50 rounded-xl animate-pulse" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#090D16] border border-slate-800 rounded-xl p-3.5">
                    <p className="text-[11px] text-slate-400">Total Klik</p>
                    <p className="font-mono-tabular text-xl font-semibold text-slate-100 mt-1">
                      {formatNumber(linkAnalytics.totalClicks)}
                    </p>
                  </div>
                  <div className="bg-[#090D16] border border-slate-800 rounded-xl p-3.5">
                    <p className="text-[11px] text-slate-400">7 Hari Terakhir</p>
                    <p className="font-mono-tabular text-xl font-semibold text-slate-100 mt-1">
                      {formatNumber(linkAnalytics.clicksInRange)}
                    </p>
                  </div>
                  <div className="bg-[#090D16] border border-slate-800 rounded-xl p-3.5">
                    <p className="text-[11px] text-slate-400">Hari Ini</p>
                    <p className="font-mono-tabular text-xl font-semibold text-slate-100 mt-1">
                      {formatNumber(linkAnalytics.clicksToday)}
                    </p>
                  </div>
                </div>

                <div className="bg-[#090D16] border border-slate-800 rounded-xl p-4">
                  <h4 className="text-xs font-medium text-slate-300 mb-3">
                    Grafik Klik 7 Hari Terakhir
                  </h4>
                  <TrafficChart data={linkAnalytics.timeseries} height={190} />
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-slate-300">Riwayat Klik Terbaru</h4>
                  {linkAnalytics.recentClicks.length === 0 ? (
                    <p className="text-xs text-slate-500">Belum ada klik terekam.</p>
                  ) : (
                    <div className="divide-y divide-slate-800/80 bg-[#090D16] border border-slate-800 rounded-xl px-4">
                      {linkAnalytics.recentClicks.slice(0, 8).map((ev) => (
                        <div key={ev.id} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <p className="text-slate-200">{ev.source}</p>
                            <p className="text-[11px] text-slate-500">
                              {ev.deviceType} · {ev.userAgentSummary}
                            </p>
                          </div>
                          <span className="font-mono-tabular text-[11px] text-slate-400">
                            {formatRelativeTimeId(ev.clickedAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-display text-base font-semibold text-slate-100">
              Hapus Tautan Sekolah?
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tautan <span className="font-mono-tabular text-slate-200">/go/{confirmDelete.slug}</span>{' '}
              beserta seluruh riwayat analitik kliknya akan dihapus permanen.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-xs font-medium text-white cursor-pointer"
              >
                {deleting ? 'Menghapus...' : 'Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
