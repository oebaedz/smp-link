import { Check, Copy, Database, KeyRound, RefreshCw } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api.ts';
import type { SettingsInfo } from '../types.ts';

interface SettingsViewProps {
  onNotify: (message: string) => void;
}

export function SettingsView({ onNotify }: SettingsViewProps) {
  const [info, setInfo] = useState<SettingsInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const [newPin, setNewPin] = useState('');
  const [savingPin, setSavingPin] = useState(false);
  const [pinMsg, setPinMsg] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSettingsInfo()
      .then((res) => setInfo(res))
      .finally(() => setLoading(false));
  }, []);

  const handleTestSupabase = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testSupabase();
      setTestResult({ ok: res.ok, message: res.message });
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Gagal menguji koneksi.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleCopySql = async () => {
    if (!info?.sqlSchema) return;
    try {
      await navigator.clipboard.writeText(info.sqlSchema);
      setCopiedSql(true);
      onNotify('Skrip SQL smplink_* disalin ke papan klip');
      setTimeout(() => setCopiedSql(false), 2000);
    } catch {
      onNotify('Gagal menyalin skrip SQL');
    }
  };

  const handleUpdatePin = async (e: FormEvent) => {
    e.preventDefault();
    setPinMsg(null);
    setSavingPin(true);
    try {
      const res = await api.updatePin(newPin);
      setPinMsg(res.message);
      setNewPin('');
      onNotify('PIN dashboard diperbarui');
    } catch (err) {
      setPinMsg(err instanceof Error ? err.message : 'Gagal memperbarui PIN.');
    } finally {
      setSavingPin(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-[#111827] border border-slate-800 rounded-xl animate-pulse" />
        <div className="h-64 bg-[#111827] border border-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Database Status Card */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-blue-400 shrink-0" />
              <div>
                <h2 className="font-display text-base font-semibold text-slate-100">
                  Koneksi Basis Data Supabase
                </h2>
                <p className="text-xs text-slate-400">
                  Mode aktif saat ini:{' '}
                  <span
                    className={`font-medium ${
                      info?.mode === 'supabase' ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {info?.mode === 'supabase'
                      ? 'Supabase PostgreSQL Live'
                      : 'Penyimpanan Dummy Lokal'}
                  </span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestSupabase}
              disabled={testing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Menguji...' : 'Uji Koneksi'}</span>
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Cukup isi <strong className="text-slate-200">2 variabel</strong> berikut di{' '}
            <span className="font-mono-tabular text-slate-200">.env</span> atau Environment Variables
            Vercel (ambil dari <strong className="text-slate-200">Supabase → Project Settings → API</strong>):
          </p>

          <div className="bg-[#090D16] border border-slate-800 rounded-xl p-3.5 font-mono-tabular text-xs text-slate-300 space-y-1">
            <p>SUPABASE_URL=https://xxxx.supabase.co</p>
            <p>SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...</p>
          </div>

          {testResult && (
            <div
              className={`text-xs rounded-lg px-3.5 py-2.5 border ${
                testResult.ok
                  ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-900/60 text-amber-300'
              }`}
            >
              {testResult.message}
            </div>
          )}
        </div>

        {/* PIN Management Card */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-5 h-5 text-blue-400 shrink-0" />
            <div>
              <h2 className="font-display text-base font-semibold text-slate-100">
                Keamanan PIN Dashboard (4 Digit)
              </h2>
              <p className="text-xs text-slate-400">
                Status:{' '}
                {info?.hasCustomPin
                  ? 'Menggunakan PIN kustom tersimpan'
                  : 'Menggunakan PIN awal bawaan (2026)'}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            PIN disimpan langsung di tabel{' '}
            <span className="font-mono-tabular text-slate-200">smplink_school_profile</span>{' '}
            (kolom <span className="font-mono-tabular text-slate-200">dashboard_pin</span>), sehingga
            perubahan langsung permanen di database tanpa perlu ubah{' '}
            <span className="font-mono-tabular text-slate-200">.env</span>.
          </p>

          <form onSubmit={handleUpdatePin} className="flex items-end gap-3 pt-1">
            <div className="flex-1">
              <label htmlFor="new-pin" className="block text-xs text-slate-400 mb-1.5">
                PIN Baru (Tepat 4 digit angka)
              </label>
              <input
                id="new-pin"
                type="password"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                required
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Contoh: 4519"
                className="w-full bg-[#090D16] border border-slate-700 focus:border-blue-500 focus:outline-none rounded-xl px-3.5 py-2 text-sm font-mono-tabular text-slate-100"
              />
            </div>
            <button
              type="submit"
              disabled={savingPin || newPin.length !== 4}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-sm font-medium text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              {savingPin ? 'Menyimpan...' : 'Simpan PIN'}
            </button>
          </form>

          {pinMsg && <p className="text-xs text-slate-300">{pinMsg}</p>}
        </div>
      </div>

      {/* SQL Schema Card */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-800">
          <div>
            <h3 className="font-display text-base font-semibold text-slate-100">
              Kueri SQL Pembuatan Tabel & Data Awal Supabase
            </h3>
            <p className="text-xs text-slate-400">
              Salin dan jalankan di Supabase SQL Editor untuk membuat tabel{' '}
              <span className="font-mono-tabular text-slate-300">smplink_school_profile</span>,{' '}
              <span className="font-mono-tabular text-slate-300">smplink_groups</span>,{' '}
              <span className="font-mono-tabular text-slate-300">smplink_links</span>, dan{' '}
              <span className="font-mono-tabular text-slate-300">smplink_click_events</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopySql}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedSql ? 'SQL Disalin' : 'Salin Skrip SQL'}</span>
          </button>
        </div>

        <pre className="p-6 bg-[#090D16] text-xs font-mono-tabular text-slate-300 overflow-x-auto max-h-96 leading-relaxed">
          {info?.sqlSchema}
        </pre>
      </div>
    </div>
  );
}
