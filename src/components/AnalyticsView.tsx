import { Activity, ArrowUpRight, QrCode, Radio } from 'lucide-react';
import { formatNumber, formatRelativeTimeId } from '../lib/api.ts';
import type { AnalyticsRange, AnalyticsSummary, SchoolGroup, SchoolLink } from '../types.ts';
import { StatusLabel } from './StatusLabel.tsx';
import { TrafficChart } from './TrafficChart.tsx';

interface AnalyticsViewProps {
  analytics: AnalyticsSummary;
  groups: SchoolGroup[];
  links: SchoolLink[];
  range: AnalyticsRange;
  selectedGroupId: string;
  liveConnected: boolean;
  onRangeChange: (range: AnalyticsRange) => void;
  onGroupFilterChange: (groupId: string) => void;
  onOpenQr: (link: SchoolLink) => void;
  onSimulateClick: (linkId: string) => void;
  onNavigateLinks: () => void;
}

export function AnalyticsView({
  analytics,
  groups,
  links,
  range,
  selectedGroupId,
  liveConnected,
  onRangeChange,
  onGroupFilterChange,
  onOpenQr,
  onSimulateClick,
  onNavigateLinks,
}: AnalyticsViewProps) {
  const linkMap = new Map(links.map((l) => [l.id, l]));

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Filter & Live Stream Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="inline-flex items-center p-1 bg-[#111827] border border-slate-800 rounded-xl">
            {(
              [
                { id: '24h', label: '24 Jam' },
                { id: '7d', label: '7 Hari' },
                { id: '30d', label: '30 Hari' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onRangeChange(opt.id)}
                className={`px-3 sm:px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  range === opt.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter grup program sekolah"
            value={selectedGroupId}
            onChange={(e) => onGroupFilterChange(e.target.value)}
            className="flex-1 sm:flex-initial min-w-[180px] bg-[#111827] border border-slate-800 focus:border-blue-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-slate-200"
          >
            <option value="">Semua Event & Program</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Real SSE connection status */}
        <div className="inline-flex items-center gap-2 text-xs text-slate-400">
          <span
            className={`w-2 h-2 rounded-full ${
              liveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'
            }`}
            aria-hidden="true"
          />
          <Radio className="w-3.5 h-3.5 text-slate-400" />
          <span>{liveConnected ? 'Aliran Klik Real-Time Aktif' : 'Menghubungkan Aliran...'}</span>
        </div>
      </div>

      {/* 4-Column KPI Strip (2x2 compact grid on mobile) */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 sm:p-5">
          <p className="text-[11px] sm:text-xs text-slate-400 mb-1.5 sm:mb-2 truncate">
            Total Klik Akumulatif
          </p>
          <p className="font-mono-tabular text-2xl sm:text-3xl font-semibold text-slate-100">
            {formatNumber(analytics.totalClicks)}
          </p>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1 sm:mt-1.5 font-mono-tabular truncate">
            {formatNumber(analytics.clicksInRange)} pada rentang dipilih
          </p>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 sm:p-5">
          <p className="text-[11px] sm:text-xs text-slate-400 mb-1.5 sm:mb-2 truncate">
            Klik Hari Ini
          </p>
          <p className="font-mono-tabular text-2xl sm:text-3xl font-semibold text-slate-100">
            {formatNumber(analytics.clicksToday)}
          </p>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1 sm:mt-1.5 font-mono-tabular truncate">
            {formatNumber(analytics.clicksLastHour)} dalam 1 jam terakhir
          </p>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 sm:p-5">
          <p className="text-[11px] sm:text-xs text-slate-400 mb-1.5 sm:mb-2 truncate">
            Tautan Aktif
          </p>
          <p className="font-mono-tabular text-2xl sm:text-3xl font-semibold text-slate-100">
            {formatNumber(analytics.activeLinksCount)}
          </p>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1 sm:mt-1.5 truncate">
            {analytics.scheduledLinksCount} terjadwal · {analytics.expiredLinksCount} berakhir
          </p>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 sm:p-5">
          <p className="text-[11px] sm:text-xs text-slate-400 mb-1.5 sm:mb-2 truncate">
            Portal Direktori Publik
          </p>
          <p className="font-mono-tabular text-2xl sm:text-3xl font-semibold text-slate-100">
            {formatNumber(analytics.publicGroupsCount)}
          </p>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1 sm:mt-1.5 truncate">
            Dari {formatNumber(analytics.totalLinksCount)} tautan terdaftar
          </p>
        </div>
      </div>

      {/* Main Chart + Live Click Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <div className="xl:col-span-2 bg-[#111827] border border-slate-800 rounded-xl p-4 sm:p-6">
          <div className="flex items-start sm:items-center justify-between gap-3 mb-4 sm:mb-5">
            <div className="min-w-0">
              <h2 className="font-display text-sm sm:text-base font-semibold text-slate-100">
                Tren Trafik Klik
              </h2>
              <p className="text-xs text-slate-400">
                {range === '24h'
                  ? 'Distribusi kunjungan per jam selama 24 jam terakhir'
                  : range === '7d'
                  ? 'Distribusi kunjungan harian selama 7 hari terakhir'
                  : 'Distribusi kunjungan harian selama 30 hari terakhir'}
              </p>
            </div>
            <span className="font-mono-tabular text-xs text-slate-400 shrink-0">
              {formatNumber(analytics.clicksInRange)} klik
            </span>
          </div>
          <TrafficChart data={analytics.timeseries} height={240} />
        </div>

        {/* Real-Time Click Feed */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <h2 className="font-display text-sm sm:text-base font-semibold text-slate-100">
                Klik Masuk Langsung
              </h2>
            </div>
            <span className="text-xs text-slate-500">Terbaru</span>
          </div>

          {analytics.recentClicks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 sm:py-10">
              <p className="text-sm text-slate-400 mb-1">Belum ada klik terekam</p>
              <p className="text-xs text-slate-500">
                Kunjungi salah satu tautan /go/slug untuk melihat arus data langsung.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80 overflow-y-auto max-h-[268px] pr-1">
              {analytics.recentClicks.slice(0, 10).map((ev) => (
                <div key={ev.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-tabular text-xs font-medium text-blue-400 truncate">
                      /go/{ev.linkSlug}
                    </span>
                    <span className="font-mono-tabular text-[11px] text-slate-500 shrink-0">
                      {formatRelativeTimeId(ev.clickedAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5 text-xs text-slate-400">
                    <span className="truncate">{ev.groupName}</span>
                    <span className="shrink-0 text-[11px] text-slate-500">
                      {ev.deviceType} · {ev.source}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Performing Links + Breakdowns */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <div className="xl:col-span-2 bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-4 border-b border-slate-800">
            <div>
              <h2 className="font-display text-sm sm:text-base font-semibold text-slate-100">
                Performa Tautan Teratas
              </h2>
              <p className="text-xs text-slate-400">
                Peringkat berdasarkan jumlah klik pada rentang waktu aktif.
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateLinks}
              className="text-xs font-medium text-blue-400 hover:text-blue-300 cursor-pointer whitespace-nowrap"
            >
              Kelola Semua Link
            </button>
          </div>

          {analytics.topLinks.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              Belum ada tautan pada filter grup ini.
            </div>
          ) : (
            <>
              {/* Mobile Cards (< md) */}
              <div className="md:hidden divide-y divide-slate-800/80">
                {analytics.topLinks.map((item) => {
                  const fullLink = linkMap.get(item.linkId);
                  return (
                    <div key={item.linkId} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-100 truncate">
                            {item.title}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            <span className="font-mono-tabular text-blue-400">/go/{item.slug}</span>
                            <span className="mx-1.5 text-slate-600">·</span>
                            <span>{item.groupName}</span>
                          </p>
                        </div>
                        <span className="font-mono-tabular text-sm font-semibold text-slate-100 shrink-0">
                          {formatNumber(item.clicks)} klik
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <StatusLabel status={item.status} />
                        {fullLink && (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onOpenQr(fullLink)}
                              title="Tampilkan QR Code"
                              className="p-1.5 rounded-lg bg-[#090D16] border border-slate-800 text-slate-300 hover:text-slate-100 transition-colors cursor-pointer"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={fullLink.status !== 'active'}
                              onClick={() => onSimulateClick(fullLink.id)}
                              title="Catat uji kunjungan real-time"
                              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Uji Klik
                            </button>
                            <a
                              href={`/go/${fullLink.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Buka URL singkat"
                              className="p-1.5 rounded-lg bg-[#090D16] border border-slate-800 text-slate-300 hover:text-blue-400 transition-colors"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-medium text-slate-400">
                      <th className="py-3 px-6">Tautan & Program</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Klik Rentang</th>
                      <th className="py-3 px-6 text-right">Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-sm">
                    {analytics.topLinks.map((item) => {
                      const fullLink = linkMap.get(item.linkId);
                      return (
                        <tr key={item.linkId} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-6 min-w-[220px]">
                            <p className="font-medium text-slate-100 truncate max-w-xs">
                              {item.title}
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                              <span className="font-mono-tabular text-blue-400">/go/{item.slug}</span>
                              <span className="mx-1.5 text-slate-600">·</span>
                              <span>{item.groupName}</span>
                            </p>
                          </td>
                          <td className="py-3 px-4">
                            <StatusLabel status={item.status} />
                          </td>
                          <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-slate-100">
                            {formatNumber(item.clicks)}
                          </td>
                          <td className="py-3 px-6 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {fullLink && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onOpenQr(fullLink)}
                                    title="Tampilkan QR Code"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
                                  >
                                    <QrCode className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={fullLink.status !== 'active'}
                                    onClick={() => onSimulateClick(fullLink.id)}
                                    title="Catat uji kunjungan real-time"
                                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
                                  >
                                    Uji Klik
                                  </button>
                                  <a
                                    href={`/go/${fullLink.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Buka URL singkat"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                                  >
                                    <ArrowUpRight className="w-4 h-4" />
                                  </a>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Device & Source Breakdown */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 sm:p-6 space-y-5 sm:space-y-6">
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-100 mb-3">
              Sumber Kunjungan
            </h3>
            <div className="space-y-3">
              {analytics.sourceBreakdown.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300">{item.label}</span>
                    <span className="font-mono-tabular text-slate-400">
                      {formatNumber(item.count)} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-5 border-t border-slate-800">
            <h3 className="font-display text-sm font-semibold text-slate-100 mb-3">
              Perangkat Pengakses
            </h3>
            <div className="space-y-3">
              {analytics.deviceBreakdown.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300">{item.label}</span>
                    <span className="font-mono-tabular text-slate-400">
                      {formatNumber(item.count)} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
