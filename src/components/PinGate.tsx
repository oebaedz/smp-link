import { ArrowRight, Delete, LockKeyhole } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api, setStoredToken } from '../lib/api.ts';
import type { SchoolProfile } from '../types.ts';
import { SchoolEmblem } from './SchoolEmblem.tsx';

interface PinGateProps {
  profile: SchoolProfile;
  isDefaultPin: boolean;
  onUnlocked: () => void;
}

export function PinGate({ profile, isDefaultPin, onUnlocked }: PinGateProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length >= 8) return;
    setError(null);
    setPin((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!pin.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.verifyPin(pin);
      setStoredToken(res.token);
      onUnlocked();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PIN tidak valid.');
      setPin('');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (/^\d$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        void handleSubmit();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const keypadDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-2xl p-8">
        <div className="flex items-center gap-3.5 pb-6 border-b border-slate-800">
          <SchoolEmblem schoolName={profile.schoolName} logoUrl={profile.logoUrl} size="md" />
          <div className="min-w-0">
            <h1 className="font-display text-lg font-semibold text-slate-100 truncate">
              {profile.schoolName}
            </h1>
            <p className="text-xs text-slate-400 truncate">
              {profile.npsn ? `NPSN ${profile.npsn} · ` : ''}Portal Manajemen Link Sekolah
            </p>
          </div>
        </div>

        <div className="pt-6">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-200 mb-1">
            <LockKeyhole className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Akses Dashboard Staf & Analitik</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-5">
            Masukkan PIN pengelola sekolah untuk mengelola tautan singkat, grup event, profil
            sekolah, dan memantau trafik klik real-time.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="pin-input" className="sr-only">
                PIN Dashboard Sekolah
              </label>
              <input
                id="pin-input"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={8}
                value={pin}
                onChange={(e) => {
                  setError(null);
                  setPin(e.target.value.replace(/\D/g, ''));
                }}
                placeholder="••••"
                className="w-full bg-[#090D16] border border-slate-700 focus:border-blue-500 focus:outline-none rounded-xl px-4 py-3 text-center font-mono-tabular text-2xl tracking-[0.45em] text-slate-100 placeholder:text-slate-600"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900/60 rounded-lg px-3 py-2 text-center"
              >
                {error}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {keypadDigits.map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigit(digit)}
                  className="h-11 rounded-lg bg-[#090D16] border border-slate-800 hover:border-slate-700 hover:bg-slate-800/70 active:scale-[0.98] font-mono-tabular text-base font-medium text-slate-200 transition-colors cursor-pointer"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleBackspace}
                aria-label="Hapus digit"
                className="h-11 rounded-lg bg-[#090D16] border border-slate-800 hover:border-slate-700 hover:bg-slate-800/70 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <Delete className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDigit('0')}
                className="h-11 rounded-lg bg-[#090D16] border border-slate-800 hover:border-slate-700 hover:bg-slate-800/70 active:scale-[0.98] font-mono-tabular text-base font-medium text-slate-200 transition-colors cursor-pointer"
              >
                0
              </button>
              <button
                type="submit"
                disabled={!pin || submitting}
                className="h-11 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 flex items-center justify-center gap-1.5 text-sm font-medium text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>{submitting ? '...' : 'Masuk'}</span>
                {!submitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
            <span>Tautan & portal event publik tetap terbuka</span>
            {isDefaultPin && (
              <span className="font-mono-tabular text-slate-400">PIN awal: 2026</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
