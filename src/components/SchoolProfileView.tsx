import { Check, ExternalLink, Save } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api.ts';
import type { SchoolProfile } from '../types.ts';
import { SchoolEmblem } from './SchoolEmblem.tsx';

interface SchoolProfileViewProps {
  profile: SchoolProfile;
  onUpdated: (profile: SchoolProfile) => void;
  onNotify: (message: string) => void;
}

export function SchoolProfileView({ profile, onUpdated, onNotify }: SchoolProfileViewProps) {
  const [schoolName, setSchoolName] = useState(profile.schoolName);
  const [npsn, setNpsn] = useState(profile.npsn);
  const [tagline, setTagline] = useState(profile.tagline);
  const [websiteUrl, setWebsiteUrl] = useState(profile.websiteUrl);
  const [contactInfo, setContactInfo] = useState(profile.contactInfo);
  const [address, setAddress] = useState(profile.address);
  const [logoUrl, setLogoUrl] = useState(profile.logoUrl);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSchoolName(profile.schoolName);
    setNpsn(profile.npsn);
    setTagline(profile.tagline);
    setWebsiteUrl(profile.websiteUrl);
    setContactInfo(profile.contactInfo);
    setAddress(profile.address);
    setLogoUrl(profile.logoUrl);
  }, [profile]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await api.updateProfile({
        schoolName,
        npsn,
        tagline,
        websiteUrl,
        contactInfo,
        address,
        logoUrl,
      });
      onUpdated(res.profile);
      setSavedBanner(true);
      onNotify('Profil sekolah berhasil disimpan');
      setTimeout(() => setSavedBanner(false), 2400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan profil sekolah.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
      {/* Form Column */}
      <div className="xl:col-span-3 bg-[#111827] border border-slate-800 rounded-xl p-6">
        <div className="pb-4 mb-5 border-b border-slate-800">
          <h2 className="font-display text-base font-semibold text-slate-100">
            Pengaturan Profil Sekolah
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Data disimpan ke tabel <span className="font-mono-tabular text-slate-300">smplink_school_profile</span>{' '}
            dan langsung tampil pada layar PIN, kartu unduhan QR Code, serta seluruh portal publik event.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              role="alert"
              className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900/60 rounded-lg px-3.5 py-2.5"
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="prof-name" className="block text-xs font-medium text-slate-300 mb-1.5">
                Nama Resmi Sekolah
              </label>
              <input
                id="prof-name"
                type="text"
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Contoh: SMP Negeri 1 Nusantara"
                className="w-full bg-[#090D16] border border-slate-700 focus:border-blue-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="prof-npsn" className="block text-xs font-medium text-slate-300 mb-1.5">
                NPSN
              </label>
              <input
                id="prof-npsn"
                type="text"
                value={npsn}
                onChange={(e) => setNpsn(e.target.value)}
                placeholder="20219845"
                className="w-full bg-[#090D16] border border-slate-700 focus:border-blue-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm font-mono-tabular text-slate-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="prof-tagline" className="block text-xs font-medium text-slate-300 mb-1.5">
              Tagline / Keterangan Portal
            </label>
            <input
              id="prof-tagline"
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Pusat Tautan Resmi Layanan Digital, PPDB, dan Kegiatan Siswa"
              className="w-full bg-[#090D16] border border-slate-700 focus:border-blue-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prof-web" className="block text-xs font-medium text-slate-300 mb-1.5">
                Website Resmi Sekolah
              </label>
              <input
                id="prof-web"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://smpn1nusantara.sch.id"
                className="w-full bg-[#090D16] border border-slate-700 focus:border-blue-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm font-mono-tabular text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="prof-contact" className="block text-xs font-medium text-slate-300 mb-1.5">
                Email / Telepon Humas
              </label>
              <input
                id="prof-contact"
                type="text"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="humas@sekolah.sch.id · (021) 555-0192"
                className="w-full bg-[#090D16] border border-slate-700 focus:border-blue-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm text-slate-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="prof-addr" className="block text-xs font-medium text-slate-300 mb-1.5">
              Alamat Sekolah
            </label>
            <input
              id="prof-addr"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Jl. Pendidikan Raya No. 14"
              className="w-full bg-[#090D16] border border-slate-700 focus:border-blue-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="prof-logo" className="block text-xs font-medium text-slate-300 mb-1.5">
              URL Logo Sekolah (Opsional)
            </label>
            <input
              id="prof-logo"
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://.../logo-sekolah.png (kosongkan untuk menggunakan ikon default)"
              className="w-full bg-[#090D16] border border-slate-700 focus:border-blue-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm font-mono-tabular text-slate-100"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-4">
            <div className="text-xs">
              {savedBanner && (
                <span className="inline-flex items-center gap-1.5 text-emerald-400">
                  <Check className="w-4 h-4" />
                  <span>Perubahan tersimpan</span>
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-sm font-medium text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Profil Sekolah'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Live Preview Column */}
      <div className="xl:col-span-2 bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-5">
        <div>
          <h3 className="font-display text-sm font-semibold text-slate-100">
            Pratinjau Tampilan Portal Publik
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Tampilan header yang dilihat siswa dan wali murid saat membuka tautan event sekolah.
          </p>
        </div>

        <div className="bg-[#090D16] border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3.5">
            <SchoolEmblem schoolName={schoolName || 'Sekolah'} logoUrl={logoUrl} size="lg" />
            <div className="min-w-0">
              <p className="font-display text-base font-semibold text-slate-100 truncate">
                {schoolName || 'Nama Sekolah'}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {npsn ? `NPSN ${npsn}` : 'Portal Resmi Sekolah'}
              </p>
            </div>
          </div>

          {tagline && (
            <p className="text-xs text-slate-300 leading-relaxed">{tagline}</p>
          )}

          <div className="pt-3 border-t border-slate-800/80 space-y-1 text-[11px] text-slate-400">
            {address && <p>{address}</p>}
            {contactInfo && <p>{contactInfo}</p>}
            {websiteUrl && (
              <p className="inline-flex items-center gap-1 text-blue-400 font-mono-tabular">
                <span>{websiteUrl}</span>
                <ExternalLink className="w-3 h-3" />
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
