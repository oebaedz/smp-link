import { X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api.ts';
import type { GroupCategory, SchoolGroup } from '../types.ts';

interface GroupModalProps {
  isOpen: boolean;
  editingGroup: SchoolGroup | null;
  onClose: () => void;
  onSaved: (group: SchoolGroup, isNew: boolean) => void;
}

const CATEGORIES: GroupCategory[] = [
  'PPDB',
  'Akademik',
  'Kesiswaan',
  'Event Tahunan',
  'Administrasi',
];

const ACCENT_OPTIONS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899'];

export function GroupModal({ isOpen, editingGroup, onClose, onSaved }: GroupModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState<GroupCategory>('Event Tahunan');
  const [description, setDescription] = useState('');
  const [accentColor, setAccentColor] = useState('#3B82F6');
  const [isPublicDirectory, setIsPublicDirectory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editingGroup) {
      setName(editingGroup.name);
      setSlug(editingGroup.slug);
      setCategory(editingGroup.category);
      setDescription(editingGroup.description);
      setAccentColor(editingGroup.accentColor);
      setIsPublicDirectory(editingGroup.isPublicDirectory);
    } else {
      setName('');
      setSlug('');
      setCategory('Event Tahunan');
      setDescription('');
      setAccentColor('#3B82F6');
      setIsPublicDirectory(true);
    }
  }, [isOpen, editingGroup]);

  if (!isOpen) return null;

  const handleNameChange = (value: string) => {
    setName(value);
    if (!editingGroup) {
      const auto = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 36);
      setSlug(auto);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        category,
        description: description.trim(),
        accentColor,
        isPublicDirectory,
      };
      if (editingGroup) {
        const res = await api.updateGroup(editingGroup.id, payload);
        onSaved(res.group, false);
      } else {
        const res = await api.createGroup(payload);
        onSaved(res.group, true);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan grup.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="group-modal-title"
    >
      <div className="w-full max-w-lg bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 id="group-modal-title" className="font-display text-base font-semibold text-slate-100">
              {editingGroup ? 'Edit Grup Event & Program' : 'Buat Grup Event / Program Baru'}
            </h2>
            <p className="text-xs text-slate-400">
              Kelompokkan tautan sekolah dan publikasikan sebagai portal direktori event.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form grup"
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

          <div>
            <label htmlFor="group-name" className="block text-xs font-medium text-slate-300 mb-1.5">
              Nama Event / Program Sekolah
            </label>
            <input
              id="group-name"
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Contoh: Class Meeting Semester Genap"
              className="w-full bg-[#090D16] border border-slate-700 focus:border-blue-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="group-slug" className="block text-xs font-medium text-slate-300 mb-1.5">
                Slug Portal Direktori
              </label>
              <div className="flex items-center bg-[#090D16] border border-slate-700 focus-within:border-blue-500 rounded-xl overflow-hidden">
                <span className="px-2.5 py-2.5 text-xs font-mono-tabular text-slate-500 bg-slate-900/70 border-r border-slate-800">
                  /event/
                </span>
                <input
                  id="group-slug"
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder="class-meeting"
                  className="w-full bg-transparent px-3 py-2.5 text-xs font-mono-tabular text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="group-cat" className="block text-xs font-medium text-slate-300 mb-1.5">
                Kategori Program
              </label>
              <select
                id="group-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as GroupCategory)}
                className="w-full bg-[#090D16] border border-slate-700 focus:border-blue-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm text-slate-100"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="group-desc" className="block text-xs font-medium text-slate-300 mb-1.5">
              Deskripsi Singkat (Tampil di Portal Publik)
            </label>
            <textarea
              id="group-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Penjelasan singkat bagi siswa dan orang tua yang mengakses portal event ini."
              className="w-full bg-[#090D16] border border-slate-700 focus:border-blue-500 focus:outline-none rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 resize-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div>
              <span className="block text-xs font-medium text-slate-300 mb-1">
                Warna Tema Event
              </span>
              <p className="text-[11px] text-slate-500 mb-2">
                Dipakai sebagai aksen header portal /event, kartu grup, dan poster QR.
              </p>
              <div className="flex items-center gap-2">
                {ACCENT_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAccentColor(color)}
                    aria-label={`Pilih warna ${color}`}
                    className={`w-6 h-6 rounded-md transition-transform cursor-pointer ${
                      accentColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111827] scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2.5 bg-[#090D16] border border-slate-700 rounded-xl px-3.5 py-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublicDirectory}
                onChange={(e) => setIsPublicDirectory(e.target.checked)}
                className="w-4 h-4 accent-blue-600 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-200">
                Aktifkan Halaman Direktori Publik
              </span>
            </label>
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
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-sm font-medium text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              {submitting ? 'Menyimpan...' : editingGroup ? 'Simpan Perubahan' : 'Buat Grup'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
