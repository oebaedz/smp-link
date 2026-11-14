import { ArrowUpRight, Check, Copy, FolderPlus, Pencil, QrCode, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { buildEventDirectoryUrl, formatNumber } from '../lib/api.ts';
import type { SchoolGroup, SchoolLink } from '../types.ts';

interface GroupsViewProps {
  groups: SchoolGroup[];
  links: SchoolLink[];
  onCreateGroup: () => void;
  onEditGroup: (group: SchoolGroup) => void;
  onDeleteGroup: (groupId: string) => Promise<void>;
  onSelectGroupLinks: (groupId: string) => void;
  onOpenEventQr: (group: SchoolGroup) => void;
  onNotify: (message: string) => void;
}

export function GroupsView({
  groups,
  links,
  onCreateGroup,
  onEditGroup,
  onDeleteGroup,
  onSelectGroupLinks,
  onOpenEventQr,
  onNotify,
}: GroupsViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SchoolGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCopyPortal = async (group: SchoolGroup) => {
    try {
      await navigator.clipboard.writeText(buildEventDirectoryUrl(group.slug));
      setCopiedId(group.id);
      onNotify(`URL portal /event/${group.slug} disalin`);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      onNotify('Gagal menyalin URL portal');
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await onDeleteGroup(confirmDelete.id);
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-100">
            Grup Event & Program Sekolah
          </h2>
          <p className="text-xs text-slate-400">
            Setiap grup publik otomatis menyediakan halaman direktori khusus bagi siswa dan wali murid.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateGroup}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors cursor-pointer whitespace-nowrap"
        >
          <FolderPlus className="w-4 h-4" />
          <span>Tambah Grup Event</span>
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-12 text-center">
          <p className="text-sm font-medium text-slate-200 mb-1">Belum ada grup program sekolah</p>
          <p className="text-xs text-slate-400 mb-5">
            Buat grup seperti PPDB, MPLS, Ujian CBT, atau Ekstrakurikuler untuk merapikan tautan.
          </p>
          <button
            type="button"
            onClick={onCreateGroup}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Buat Grup Pertama</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group) => {
            const groupLinks = links.filter((l) => l.groupId === group.id);
            const totalClicks = groupLinks.reduce((acc, l) => acc + l.clickCount, 0);
            const activeCount = groupLinks.filter((l) => l.status === 'active').length;

            return (
              <div
                key={group.id}
                className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">
                        <span>{group.category}</span>
                        <span className="mx-1.5 text-slate-600">·</span>
                        <span
                          className={
                            group.isPublicDirectory ? 'text-emerald-400' : 'text-slate-500'
                          }
                        >
                          {group.isPublicDirectory ? 'Portal Publik Aktif' : 'Hanya Internal'}
                        </span>
                      </p>
                      <h3 className="font-display text-base font-semibold text-slate-100 mt-0.5 truncate">
                        {group.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditGroup(group)}
                        title="Edit Grup"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(group)}
                        title="Hapus Grup"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {group.description && (
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                      {group.description}
                    </p>
                  )}

                  <div className="flex items-center gap-6 pt-1 text-xs">
                    <div>
                      <span className="text-slate-500 block">Jumlah Link</span>
                      <span className="font-mono-tabular font-semibold text-slate-200">
                        {formatNumber(groupLinks.length)} ({formatNumber(activeCount)} aktif)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Total Klik</span>
                      <span className="font-mono-tabular font-semibold text-slate-200">
                        {formatNumber(totalClicks)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectGroupLinks(group.id)}
                    className="text-xs font-medium text-blue-400 hover:text-blue-300 cursor-pointer whitespace-nowrap"
                  >
                    Lihat Daftar Link →
                  </button>

                  {group.isPublicDirectory && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopyPortal(group)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#090D16] border border-slate-800 hover:border-slate-700 text-xs font-mono-tabular text-slate-300 cursor-pointer"
                      >
                        {copiedId === group.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>/event/{group.slug}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenEventQr(group)}
                        title="QR Code Portal Event"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#090D16] border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <QrCode className="w-3.5 h-3.5 text-blue-400" />
                        <span>QR Event</span>
                      </button>
                      <a
                        href={`/event/${group.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100 transition-colors whitespace-nowrap"
                      >
                        <span>Buka Portal</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Group Modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-display text-base font-semibold text-slate-100">
              Hapus Grup {confirmDelete.name}?
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Seluruh tautan dan riwayat klik yang tergabung dalam grup ini akan ikut terhapus
              permanen.
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
                {deleting ? 'Menghapus...' : 'Hapus Grup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
