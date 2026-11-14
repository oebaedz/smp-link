import { Check, ExternalLink, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api.ts';
import type { SchoolProfile, SocialLinkItem, SocialPlatform } from '../types.ts';
import { SchoolEmblem } from './SchoolEmblem.tsx';
import { SOCIAL_PLATFORM_LABELS, SocialIcon } from './SocialIcon.tsx';

interface SchoolProfileViewProps {
  profile: SchoolProfile;
  onUpdated: (profile: SchoolProfile) => void;
  onNotify: (message: string) => void;
}

const PLATFORMS: SocialPlatform[] = [
  'instagram',
  'youtube',
  'tiktok',
  'facebook',
  'whatsapp',
  'x',
  'telegram',
  'website',
];

export function SchoolProfileView({ profile, onUpdated, onNotify }: SchoolProfileViewProps) {
  const [schoolName, setSchoolName] = useState(profile.schoolName);
  const [tabTitle, setTabTitle] = useState(profile.tabTitle || '');
  const [npsn, setNpsn] = useState(profile.npsn);
  const [tagline, setTagline] = useState(profile.tagline);
  const [websiteUrl, setWebsiteUrl] = useState(profile.websiteUrl);
  const [contactInfo, setContactInfo] = useState(profile.contactInfo);
  const [address, setAddress] = useState(profile.address);
  const [logoUrl, setLogoUrl] = useState(profile.logoUrl);
  const [socialLinks, setSocialLinks] = useState<SocialLinkItem[]>(profile.socialLinks || []);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSchoolName(profile.schoolName);
    setTabTitle(profile.tabTitle || '');
    setNpsn(profile.npsn);
    setTagline(profile.tagline);
    setWebsiteUrl(profile.websiteUrl);
    setContactInfo(profile.contactInfo);
    setAddress(profile.address);
    setLogoUrl(profile.logoUrl);
    setSocialLinks(profile.socialLinks || []);
  }, [profile]);

  const handleAddSocial = () => {
    setSocialLinks((prev) => [
      ...prev,
      {
        id: `soc-${Date.now()}`,
        platform: 'instagram',
        label: 'Instagram',
        url: 'https://',
      },
    ]);
  };

  const handleUpdateSocial = (
    id: string,
    patch: Partial<Pick<SocialLinkItem, 'platform' | 'label' | 'url'>>
  ) => {
    setSocialLinks((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextPlatform = patch.platform ?? item.platform;
        const autoLabel =
          patch.platform && item.label === SOCIAL_PLATFORM_LABELS[item.platform]
            ? SOCIAL_PLATFORM_LABELS[patch.platform]
            : patch.label ?? item.label;
        return {
          ...item,
          ...patch,
          platform: nextPlatform,
          label: autoLabel,
        };
      })
    );
  };

  const handleRemoveSocial = (id: string) => {
    setSocialLinks((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await api.updateProfile({
        schoolName,
        tabTitle,
        npsn,
        tagline,
        websiteUrl,
        contactInfo,
        address,
        logoUrl,
        socialLinks,
      });
      onUpdated(res.profile);
      setSavedBanner(true);
      onNotify('Profil sekolah, tab browser, dan sosmed disimpan');
      setTimeout(() => setSavedBanner(false), 2400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan profil sekolah.');
    } finally {
      setSaving(false);
    }
  };

  const effectiveTabTitle = tabTitle.trim() || `${schoolName || 'SMPLink'} — Portal Link Sekolah`;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
      {/* Form Column */}
      <div className="xl:col-span-3 bg-[#111827] border border-slate-800 rounded-xl p-6">
        <div className="pb-4 mb-5 border-b border-slate-800">
          <h2 className="font-display text-base font-semibold text-slate-100">
            Pengaturan Profil Sekolah
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Identitas sekolah, judul & logo tab browser, serta tautan media sosial yang tampil di
            halaman portal publik event.
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prof-tab" className="block text-xs font-medium text-slate-300 mb-1.5">
                Nama Tab Browser
              </label>
              <input
                id="prof-tab"
                type="text"
                value={tabTitle}
                onChange={(e) => setTabTitle(e.target.value)}
                placeholder="Contoh: Portal Link — SMPN 1"
                className="w-full bg-[#090D16] border border-slate-700 focus:border-blue-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="prof-logo" className="block text-xs font-medium text-slate-300 mb-1.5">
                URL Logo Sekolah (juga jadi Favicon Tab)
              </label>
              <input
                id="prof-logo"
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://.../logo-sekolah.png"
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

          {/* Social Media Links Builder */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold text-slate-200">
                  Tautan Media Sosial Sekolah
                </h3>
                <p className="text-[11px] text-slate-400">
                  Ditampilkan beserta logo platform pada setiap halaman direktori publik event.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddSocial}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Sosmed</span>
              </button>
            </div>

            {socialLinks.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">
                Belum ada akun media sosial ditambahkan.
              </p>
            ) : (
              <div className="space-y-2.5">
                {socialLinks.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-[#090D16] border border-slate-800 rounded-xl p-2.5"
                  >
                    <div className="sm:col-span-3 flex items-center gap-2">
                      <span className="text-slate-300 shrink-0 pl-1">
                        <SocialIcon platform={item.platform} className="w-4 h-4" />
                      </span>
                      <select
                        aria-label="Platform media sosial"
                        value={item.platform}
                        onChange={(e) =>
                          handleUpdateSocial(item.id, {
                            platform: e.target.value as SocialPlatform,
                          })
                        }
                        className="w-full bg-transparent text-xs text-slate-200 focus:outline-none"
                      >
                        {PLATFORMS.map((p) => (
                          <option key={p} value={p} className="bg-[#111827]">
                            {SOCIAL_PLATFORM_LABELS[p]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => handleUpdateSocial(item.id, { label: e.target.value })}
                      placeholder="Label (mis: Instagram)"
                      className="sm:col-span-3 bg-[#111827] border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                    />

                    <input
                      type="url"
                      value={item.url}
                      onChange={(e) => handleUpdateSocial(item.id, { url: e.target.value })}
                      placeholder="https://instagram.com/sekolah"
                      className="sm:col-span-5 bg-[#111827] border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-mono-tabular text-slate-100"
                    />

                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveSocial(item.id)}
                        aria-label="Hapus tautan sosmed"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            Pratinjau Tab & Portal Publik
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Simulasi tampilan tab browser dan header portal event yang dilihat siswa & wali murid.
          </p>
        </div>

        {/* Simulated Browser Tab */}
        <div className="bg-[#090D16] border border-slate-800 rounded-xl p-3">
          <p className="text-[10px] text-slate-500 mb-2">Pratinjau Tab Browser</p>
          <div className="inline-flex items-center gap-2 bg-[#111827] border border-slate-700 rounded-lg px-3 py-1.5 max-w-full">
            <SchoolEmblem schoolName={schoolName || 'S'} logoUrl={logoUrl} size="sm" />
            <span className="text-xs text-slate-200 truncate">{effectiveTabTitle}</span>
          </div>
        </div>

        {/* Simulated Public Portal Header */}
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

          {tagline && <p className="text-xs text-slate-300 leading-relaxed">{tagline}</p>}

          {socialLinks.length > 0 && (
            <div className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-2">
              {socialLinks.map((soc) => (
                <span
                  key={soc.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#111827] border border-slate-800 text-xs text-slate-300"
                >
                  <SocialIcon platform={soc.platform} className="w-3.5 h-3.5 text-blue-400" />
                  <span>{soc.label || SOCIAL_PLATFORM_LABELS[soc.platform]}</span>
                </span>
              ))}
            </div>
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
