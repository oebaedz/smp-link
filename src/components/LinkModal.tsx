import { CheckCircle2, Sparkles, X, XCircle } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api.ts';
import type { SchoolGroup, SchoolLink } from '../types.ts';

interface LinkModalProps {
  isOpen: boolean;
  editingLink: SchoolLink | null;
  groups: SchoolGroup[];
  defaultGroupId?: string;
  onClose: () => void;
  onSaved: (link: SchoolLink, isNew: boolean) => void;
}

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(val: string): string | null {
  if (!val.trim()) return null;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function slugifyText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 42);
}

export function LinkModal({
  isOpen,
  editingLink,
  groups,
  defaultGroupId,
  onClose,
  onSaved,
}: LinkModalProps) {
  const [title, setTitle] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [groupId, setGroupId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [slugCheck, setSlugCheck] = useState<{
    checking: boolean;
    available: boolean | null;
    normalized: string;
  }>({ checking: false, available: null, normalized: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editingLink) {
      setTitle(editingLink.title);
      setDestinationUrl(editingLink.destinationUrl);
      setSlug(editingLink.slug);
      setGroupId(editingLink.groupId);
      setIsActive(editingLink.isActive);
      setStartsAt(toDatetimeLocalValue(editingLink.startsAt));
      setExpiresAt(toDatetimeLocalValue(editingLink.expiresAt));
    } else {
      setTitle('');
      setDestinationUrl('https://');
      setSlug('');
      setGroupId(defaultGroupId || groups[0]?.id || '');
      setIsActive(true);
      setStartsAt('');
      setExpiresAt('');
    }
  }, [isOpen, editingLink, groups, defaultGroupId]);

  useEffect(() => {
    if (!isOpen || !slug.trim()) {
      setSlugCheck({ checking: false, available: null, normalized: '' });
      return;
    }

    const timer = setTimeout(async () => {
      setSlugCheck((prev) => ({ ...prev, checking: true }));
      try {
        const res = await api.checkSlug(slug, editingLink?.id);
        setSlugCheck({
          checking: false,
          available: res.available,
          normalized: res.normalized,
        });
      } catch {
        setSlugCheck({ checking: false, available: null, normalized: slug });
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [slug, isOpen, editingLink?.id]);

  if (!isOpen) return null;

  const applyExpiryPreset = (days: number | null) => {
    if (days === null) {
      setStartsAt('');
      setExpiresAt('');
      return;
    }
    const now = new Date();
    const target = new Date(now.getTime() + days * 86_400_000);
    setStartsAt(toDatetimeLocalValue(now.toISOString()));
    setExpiresAt(toDatetimeLocalValue(target.toISOString()));
  };

  const handleAutoSlug = () => {
    if (title.trim()) {
      setSlug(slugifyText(title));
    } else {
      const rnd = Math.random().toString(36).slice(2, 7);
      setSlug(`link-${rnd}`);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!groupId) {
      setError('Pilih grup event atau program sekolah terlebih dahulu.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        groupId,
        title: title.trim(),
        slug: slug.trim(),
        destinationUrl: destinationUrl.trim(),
        isActive,
        startsAt: fromDatetimeLocalValue(startsAt),
        expiresAt: fromDatetimeLocalValue(expiresAt),
      };

      if (editingLink) {
        const res = await api.updateLink(editingLink.id, payload);
        onSaved(res.link, false);
      } else {
        const res = await api.createLink(payload);
        onSaved(res.link, true);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan tautan.');
    } finally {
      setSubmitting(false);
    }
  };

  const originPreview = typeof window !== 'undefined' ? window.location.host : 'sekolah.id';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-modal-title"
    >
      <div className="w-full max-w-xl bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 id="link-modal-title" className="font-display text-base font-semibold text-slate-100">
              {editingLink ? 'Edit Tautan Sekolah' : 'Buat Tautan Singkat Baru'}
            </h2>
            <p className="text-xs text-slate-400">
              Kustomisasi slug URL, kelompok program, dan jadwal masa aktif tautan.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form link"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div
              role="alert"
              className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900/60 rounded-lg px-3.5 py-2.5"
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="link-title" className="block text-xs font-medium text-slate-300 mb-1.5">
                Judul Tautan
              </label>
              <input
                id="link-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Formulir Daftar Ulang PPDB"
                className="w-full bg-[#090D16] border border-slate-700 focus:border-blue-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="link-dest" className="block text-xs font-medium text-slate-300 mb-1.5">
                URL Tujuan Asli
              </label>
              <input
                id="link-dest"
                type="url"
                required
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                placeholder="https://docs.google.com/forms/..."
                className="w-full bg-[#090D16] border border-slate-700 focus:border-blue-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm font-mono-tabular text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="link-slug" className="block text-xs font-medium text-slate-300">
                  Kustomisasi Slug URL
                </label>
                <button
                  type="button"
                  onClick={handleAutoSlug}
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Buat Otomatis</span>
                </button>
              </div>
              <div className="flex items-center bg-[#090D16] border border-slate-700 focus-within:border-blue-500 rounded-xl overflow-hidden">
                <span className="px-3 py-2.5 text-xs font-mono-tabular text-slate-500 bg-slate-900/70 border-r border-slate-800 whitespace-nowrap">
                  {originPreview}/go/
                </span>
                <input
                  id="link-slug"
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder="daftar-ulang-ppdb"
                  className="w-full bg-transparent px-3 py-2.5 text-sm font-mono-tabular text-slate-100 placeholder:text-slate-600 focus:outline-none"
                />
              </div>
              {slug.trim() && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                  {slugCheck.checking ? (
                    <span className="text-slate-400">Memeriksa ketersediaan slug...</span>
                  ) : slugCheck.available === true ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Slug &quot;/go/{slugCheck.normalized}&quot; tersedia</span>
                    </span>
                  ) : slugCheck.available === false ? (
                    <span className="inline-flex items-center gap-1 text-rose-400">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Slug &quot;/go/{slugCheck.normalized}&quot; sudah dipakai</span>
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="link-group" className="block text-xs font-medium text-slate-300 mb-1.5">
                Grup Event / Program
              </label>
              <select
                id="link-group"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full bg-[#090D16] border border-slate-700 focus:border-blue-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm text-slate-100"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center justify-between gap-3 bg-[#090D16] border border-slate-700 rounded-xl px-3.5 py-2.5 cursor-pointer">
                <span className="text-sm text-slate-200">Status Tautan Aktif</span>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
              </label>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-300">
                Jadwal Aktif & Kedaluwarsa (Opsional)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => applyExpiryPreset(null)}
                  className="px-2 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Tanpa Batas
                </button>
                <button
                  type="button"
                  onClick={() => applyExpiryPreset(7)}
                  className="px-2 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  7 Hari
                </button>
                <button
                  type="button"
                  onClick={() => applyExpiryPreset(30)}
                  className="px-2 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  30 Hari
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="link-starts" className="block text-xs text-slate-400 mb-1">
                  Mulai Aktif Pada
                </label>
                <input
                  id="link-starts"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full bg-[#090D16] border border-slate-700 focus:border-blue-500 focus:outline-none rounded-xl px-3 py-2 text-xs font-mono-tabular text-slate-200"
                />
              </div>
              <div>
                <label htmlFor="link-expires" className="block text-xs text-slate-400 mb-1">
                  Kedaluwarsa Pada
                </label>
                <input
                  id="link-expires"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full bg-[#090D16] border border-slate-700 focus:border-blue-500 focus:outline-none rounded-xl px-3 py-2 text-xs font-mono-tabular text-slate-200"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || slugCheck.available === false}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-sm font-medium text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              {submitting ? 'Menyimpan...' : editingLink ? 'Simpan Perubahan' : 'Buat Tautan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
