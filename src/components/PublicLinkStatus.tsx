import { AlertTriangle, Clock, PauseCircle, SearchX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, formatDateTimeId } from '../lib/api.ts';
import { syncDocumentHead } from '../lib/head.ts';
import type { SchoolProfile } from '../types.ts';
import { SchoolEmblem } from './SchoolEmblem.tsx';

interface PublicLinkStatusProps {
  slug: string;
}

export function PublicLinkStatus({ slug }: PublicLinkStatusProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    profile: SchoolProfile;
    found: boolean;
    status: string;
    link: {
      title: string;
      slug: string;
      startsAt: string | null;
      expiresAt: string | null;
    } | null;
    group: { name: string; slug: string } | null;
  } | null>(null);

  useEffect(() => {
    api
      .getPublicLinkStatus(slug)
      .then((res) => {
        setData(res);
        syncDocumentHead({
          title: `Status Tautan · ${res.profile.tabTitle?.trim() || res.profile.schoolName}`,
          iconUrl: res.profile.logoUrl,
          schoolName: res.profile.schoolName,
        });
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090D16] flex items-center justify-center p-6">
        <div className="w-full max-w-md h-56 bg-[#111827] border border-slate-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const status = data?.status || 'not_found';

  let heading = 'Tautan Tidak Ditemukan';
  let description = `Alamat /go/${slug} tidak terdaftar di sistem sekolah.`;
  let Icon = SearchX;
  let iconColor = 'text-slate-400';

  if (status === 'scheduled') {
    heading = 'Tautan Belum Dibuka';
    description = `Tautan "${data?.link?.title}" dijadwalkan aktif mulai ${formatDateTimeId(
      data?.link?.startsAt
    )}.`;
    Icon = Clock;
    iconColor = 'text-amber-400';
  } else if (status === 'expired') {
    heading = 'Masa Berlaku Tautan Berakhir';
    description = `Tautan "${data?.link?.title}" telah kedaluwarsa pada ${formatDateTimeId(
      data?.link?.expiresAt
    )}.`;
    Icon = AlertTriangle;
    iconColor = 'text-rose-400';
  } else if (status === 'inactive') {
    heading = 'Tautan Dinonaktifkan Sementara';
    description = `Tautan "${data?.link?.title}" sedang dijeda oleh administrator sekolah.`;
    Icon = PauseCircle;
    iconColor = 'text-slate-400';
  }

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-2xl p-8 space-y-6 text-center">
        {data?.profile && (
          <div className="flex items-center justify-center gap-3 pb-5 border-b border-slate-800">
            <SchoolEmblem
              schoolName={data.profile.schoolName}
              logoUrl={data.profile.logoUrl}
              size="sm"
            />
            <span className="font-display text-sm font-semibold text-slate-200">
              {data.profile.schoolName}
            </span>
          </div>
        )}

        <div className="space-y-2.5">
          <div className="inline-flex p-3 rounded-xl bg-[#090D16] border border-slate-800">
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
          <h1 className="font-display text-lg font-semibold text-slate-100">{heading}</h1>
          <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {data?.group && (
            <a
              href={`/${data.group.slug}`}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors"
            >
              Buka Portal {data.group.name}
            </a>
          )}
          {data?.profile?.websiteUrl && (
            <a
              href={data.profile.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
            >
              Website Sekolah
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
