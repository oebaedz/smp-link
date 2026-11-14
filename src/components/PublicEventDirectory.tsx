import { ArrowUpRight, Clock, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, formatDateTimeId } from '../lib/api.ts';
import type { SchoolGroup, SchoolLink, SchoolProfile } from '../types.ts';
import { SchoolEmblem } from './SchoolEmblem.tsx';

interface PublicEventDirectoryProps {
  groupSlug: string;
}

export function PublicEventDirectory({ groupSlug }: PublicEventDirectoryProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    profile: SchoolProfile;
    group: SchoolGroup;
    links: SchoolLink[];
    upcomingLinks: SchoolLink[];
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getPublicEvent(groupSlug)
      .then((res) => setData(res))
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Portal event tidak ditemukan.');
      })
      .finally(() => setLoading(false));
  }, [groupSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090D16] flex items-center justify-center p-6">
        <div className="w-full max-w-xl space-y-4">
          <div className="h-24 bg-[#111827] border border-slate-800 rounded-2xl animate-pulse" />
          <div className="h-16 bg-[#111827] border border-slate-800 rounded-xl animate-pulse" />
          <div className="h-16 bg-[#111827] border border-slate-800 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#090D16] text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <h1 className="font-display text-lg font-semibold text-slate-100">
            Portal Event Tidak Tersedia
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error || 'Halaman direktori event sekolah yang Anda cari tidak ditemukan atau telah dinonaktifkan.'}
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100"
          >
            Kembali ke Beranda
          </a>
        </div>
      </div>
    );
  }

  const { profile, group, links, upcomingLinks } = data;

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 py-10 px-4 sm:px-6">
      <div className="w-full max-w-xl mx-auto space-y-6">
        {/* School Identity Header */}
        <header className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3.5">
            <SchoolEmblem schoolName={profile.schoolName} logoUrl={profile.logoUrl} size="lg" />
            <div className="min-w-0">
              <p className="font-display text-base font-semibold text-slate-100 truncate">
                {profile.schoolName}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {profile.npsn ? `NPSN ${profile.npsn} · ` : ''}
                {group.category}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 space-y-1.5">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-100 text-balance">
              {group.name}
            </h1>
            {group.description && (
              <p className="text-sm text-slate-400 leading-relaxed">{group.description}</p>
            )}
          </div>
        </header>

        {/* Active Links Directory */}
        <main className="space-y-3">
          {links.length === 0 ? (
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-8 text-center">
              <p className="text-sm text-slate-300 font-medium">
                Belum ada tautan aktif saat ini
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Silakan periksa kembali beberapa saat lagi atau hubungi panitia sekolah.
              </p>
            </div>
          ) : (
            links.map((link) => (
              <a
                key={link.id}
                href={`/go/${link.slug}?src=directory`}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-[#111827] border border-slate-800 hover:border-blue-500/70 hover:bg-[#161F30] rounded-xl px-5 py-4 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-medium text-slate-100 group-hover:text-blue-300 transition-colors">
                      {link.title}
                    </h2>
                    <p className="text-xs font-mono-tabular text-slate-500 mt-0.5 truncate">
                      /go/{link.slug}
                      {link.expiresAt ? ` · Berlaku hingga ${formatDateTimeId(link.expiresAt)}` : ''}
                    </p>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </a>
            ))
          )}

          {/* Upcoming Scheduled Links */}
          {upcomingLinks.length > 0 && (
            <div className="pt-4 space-y-2.5">
              <p className="text-xs font-medium text-slate-400 px-1">
                Akan Dibuka Sesuai Jadwal
              </p>
              {upcomingLinks.map((link) => (
                <div
                  key={link.id}
                  className="bg-[#111827]/60 border border-slate-800/80 rounded-xl px-5 py-3.5 flex items-center justify-between gap-4 opacity-80"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-300 truncate">{link.title}</p>
                    <p className="text-xs font-mono-tabular text-amber-400 mt-0.5">
                      Dibuka pada {formatDateTimeId(link.startsAt)}
                    </p>
                  </div>
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </main>

        {/* School Footer */}
        <footer className="pt-4 border-t border-slate-800/70 text-center space-y-1.5 text-xs text-slate-500">
          {profile.address && <p>{profile.address}</p>}
          {profile.contactInfo && <p>{profile.contactInfo}</p>}
          {profile.websiteUrl && (
            <p>
              <a
                href={profile.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-slate-400 hover:text-blue-400"
              >
                <span>{profile.websiteUrl}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}
