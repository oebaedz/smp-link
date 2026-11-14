import { Delete, LockKeyhole } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  const inputRef = useRef<HTMLInputElement | null>(null);

  const verifyCode = useCallback(
    async (code: string) => {
      if (code.length !== 4 || submitting) return;
      setSubmitting(true);
      setError(null);
      try {
        const res = await api.verifyPin(code);
        setStoredToken(res.token);
        onUnlocked();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'PIN tidak valid.');
        setPin('');
      } finally {
        setSubmitting(false);
      }
    },
    [onUnlocked, submitting]
  );

  const updatePin = useCallback(
    (nextPin: string) => {
      if (submitting) return;
      const digitsOnly = nextPin.replace(/\D/g, '').slice(0, 4);
      setError(null);
      setPin(digitsOnly);
      if (digitsOnly.length === 4) {
        void verifyCode(digitsOnly);
      }
    },
    [submitting, verifyCode]
  );

  const handleDigit = (digit: string) => {
    if (pin.length >= 4 || submitting) return;
    updatePin(pin + digit);
  };

  const handleBackspace = () => {
    if (submitting) return;
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement === inputRef.current) return;
      if (/^\d$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
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
            Ketik atau tekan 4 digit PIN pengelola sekolah. Sistem otomatis memeriksa dan membuka
            dashboard setelah digit ke-4 terisi.
          </p>

          <div className="space-y-4">
            {/* 4-Digit Visual PIN Slots + Native Keyboard Input */}
            <div
              onClick={() => inputRef.current?.focus()}
              className="relative cursor-text"
            >
              <input
                ref={inputRef}
                id="pin-input"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={pin}
                disabled={submitting}
                onChange={(e) => updatePin(e.target.value)}
                aria-label="PIN 4 digit"
                className="sr-only"
              />
              <div className="grid grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((idx) => {
                  const filled = idx < pin.length;
                  const active = idx === pin.length && !submitting;
                  return (
                    <div
                      key={idx}
                      className={`h-14 rounded-xl bg-[#090D16] border flex items-center justify-center transition-colors ${
                        error
                          ? 'border-rose-500/80'
                          : active
                          ? 'border-blue-500'
                          : filled
                          ? 'border-slate-600'
                          : 'border-slate-800'
                      }`}
                    >
                      {filled ? (
                        <span className="w-3 h-3 rounded-full bg-blue-400" />
                      ) : (
                        <span className="w-2 h-0.5 bg-slate-700 rounded-full" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {submitting && (
              <p className="text-xs text-blue-400 text-center">Memverifikasi PIN...</p>
            )}

            {error && (
              <div
                role="alert"
                className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900/60 rounded-lg px-3 py-2 text-center"
              >
                {error}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 pt-1">
              {keypadDigits.map((digit) => (
                <button
                  key={digit}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDigit(digit)}
                  className="h-11 rounded-lg bg-[#090D16] border border-slate-800 hover:border-slate-700 hover:bg-slate-800/70 active:scale-[0.98] disabled:opacity-50 font-mono-tabular text-base font-medium text-slate-200 transition-colors cursor-pointer"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setError(null);
                  setPin('');
                }}
                className="h-11 rounded-lg bg-[#090D16] border border-slate-800 hover:border-slate-700 hover:bg-slate-800/70 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleDigit('0')}
                className="h-11 rounded-lg bg-[#090D16] border border-slate-800 hover:border-slate-700 hover:bg-slate-800/70 active:scale-[0.98] disabled:opacity-50 font-mono-tabular text-base font-medium text-slate-200 transition-colors cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleBackspace}
                aria-label="Hapus digit"
                className="h-11 rounded-lg bg-[#090D16] border border-slate-800 hover:border-slate-700 hover:bg-slate-800/70 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>
          </div>

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
