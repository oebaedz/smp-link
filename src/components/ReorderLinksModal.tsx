import { ArrowDown, ArrowUp, GripVertical, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api.ts';
import type { SchoolGroup, SchoolLink } from '../types.ts';
import { StatusLabel } from './StatusLabel.tsx';

interface ReorderLinksModalProps {
  group: SchoolGroup | null;
  links: SchoolLink[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

export function ReorderLinksModal({ group, links, onClose, onSaved }: ReorderLinksModalProps) {
  const [ordered, setOrdered] = useState<SchoolLink[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!group) return;
    setError(null);
    const groupLinks = links
      .filter((l) => l.groupId === group.id)
      .sort((a, b) => {
        const diff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
        if (diff !== 0) return diff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    setOrdered(groupLinks);
  }, [group, links]);

  if (!group) return null;

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= ordered.length || fromIndex === toIndex) return;
    setOrdered((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      await api.reorderGroupLinks(
        group.id,
        ordered.map((l) => l.id)
      );
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan urutan link.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reorder-modal-title"
    >
      <div className="w-full max-w-lg bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden my-auto">
        <div
          className="h-1 w-full"
          style={{ backgroundColor: group.accentColor || '#3B82F6' }}
          aria-hidden="true"
        />

        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800">
          <div className="min-w-0">
            <h2 id="reorder-modal-title" className="font-display text-base font-semibold text-slate-100 truncate">
              Urutkan Tautan Event
            </h2>
            <p className="text-xs text-slate-400 truncate">
              {group.name} · Urutan ini diterapkan langsung di portal /event/{group.slug}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal urutan link"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {error && (
            <div
              role="alert"
              className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900/60 rounded-lg px-3.5 py-2.5"
            >
              {error}
            </div>
          )}

          {ordered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Belum ada tautan di dalam grup event ini.
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-400">
                Seret baris tautan atau gunakan tombol panah naik/turun untuk mengatur urutan tampil.
              </p>
              <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-0.5">
                {ordered.map((link, index) => (
                  <div
                    key={link.id}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragIndex !== null && dragIndex !== index) {
                        moveItem(dragIndex, index);
                        setDragIndex(index);
                      }
                    }}
                    onDragEnd={() => setDragIndex(null)}
                    className={`flex items-center justify-between gap-2.5 bg-[#090D16] border rounded-xl px-3 py-2.5 transition-colors ${
                      dragIndex === index
                        ? 'border-blue-500 bg-slate-900/90'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="text-slate-500 cursor-grab active:cursor-grabbing shrink-0 hidden sm:inline-flex"
                        aria-hidden="true"
                      >
                        <GripVertical className="w-4 h-4" />
                      </span>
                      <span className="font-mono-tabular text-xs font-semibold text-slate-400 w-5 text-center shrink-0">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-slate-100 truncate">
                          {link.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono-tabular text-[11px] text-blue-400 truncate">
                            /go/{link.slug}
                          </span>
                          <StatusLabel status={link.status} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveItem(index, index - 1)}
                        aria-label={`Pindahkan ${link.title} ke atas`}
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 disabled:opacity-30 text-slate-200 transition-colors cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === ordered.length - 1}
                        onClick={() => moveItem(index, index + 1)}
                        aria-label={`Pindahkan ${link.title} ke bawah`}
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 disabled:opacity-30 text-slate-200 transition-colors cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={saving || ordered.length === 0}
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-xs sm:text-sm font-medium text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              {saving ? 'Menyimpan...' : 'Simpan Urutan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
