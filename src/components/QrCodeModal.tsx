import { Check, Copy, Download, FileCode2, X } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { buildEventDirectoryUrl, buildShortUrl } from '../lib/api.ts';
import type { SchoolGroup, SchoolLink, SchoolProfile } from '../types.ts';

export type QrTarget =
  | { type: 'link'; link: SchoolLink; group?: SchoolGroup }
  | { type: 'group'; group: SchoolGroup };

interface QrCodeModalProps {
  target: QrTarget | null;
  profile: SchoolProfile;
  onClose: () => void;
  onNotify: (message: string) => void;
}

export function QrCodeModal({ target, profile, onClose, onNotify }: QrCodeModalProps) {
  const [svgMarkup, setSvgMarkup] = useState<string>('');
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const isGroup = target?.type === 'group';
  const qrUrl = !target
    ? ''
    : target.type === 'group'
    ? buildEventDirectoryUrl(target.group.slug)
    : `${buildShortUrl(target.link.slug)}?src=qr`;

  const displayUrl = !target
    ? ''
    : target.type === 'group'
    ? buildEventDirectoryUrl(target.group.slug)
    : buildShortUrl(target.link.slug);

  const titleText = !target
    ? ''
    : target.type === 'group'
    ? target.group.name
    : target.link.title;

  const subText = !target
    ? ''
    : target.type === 'group'
    ? `Portal Direktori Event · ${target.group.category}`
    : target.group
    ? `${target.group.category} · ${target.group.name}`
    : '';

  const filePrefix = !target
    ? 'qr'
    : target.type === 'group'
    ? `qr-event-${target.group.slug}`
    : `qr-${target.link.slug}`;

  const accentColor =
    (target?.type === 'group' ? target.group.accentColor : target?.group?.accentColor) || '#3B82F6';

  useEffect(() => {
    if (!target || !qrUrl) return;
    let active = true;

    Promise.all([
      QRCode.toString(qrUrl, {
        type: 'svg',
        margin: 2,
        width: 280,
        color: { dark: '#090D16', light: '#FFFFFF' },
      }),
      QRCode.toDataURL(qrUrl, {
        margin: 2,
        width: 680,
        color: { dark: '#090D16', light: '#FFFFFF' },
      }),
    ])
      .then(([svg, pngUrl]) => {
        if (!active) return;
        setSvgMarkup(svg);
        setDataUrl(pngUrl);
      })
      .catch(() => {
        // Handled cleanly
      });

    return () => {
      active = false;
    };
  }, [target, qrUrl]);

  if (!target) return null;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(displayUrl);
      setCopied(true);
      onNotify(isGroup ? 'URL portal event disalin ke papan klip' : 'URL singkat disalin ke papan klip');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      onNotify('Gagal menyalin URL');
    }
  };

  const handleDownloadPngCard = () => {
    if (!dataUrl) return;
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 1180;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#090D16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

    ctx.fillStyle = accentColor;
    ctx.fillRect(26, 26, canvas.width - 52, 8);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 26px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(profile.schoolName.toUpperCase(), canvas.width / 2, 92);

    if (subText) {
      ctx.fillStyle = accentColor;
      ctx.font = '500 22px "DM Sans", sans-serif';
      ctx.fillText(subText, canvas.width / 2, 134);
    }

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '700 34px "Plus Jakarta Sans", sans-serif';
    const clampedTitle = titleText.length > 38 ? `${titleText.slice(0, 35)}...` : titleText;
    ctx.fillText(clampedTitle, canvas.width / 2, 200);

    const qrBoxSize = 660;
    const qrBoxX = (canvas.width - qrBoxSize) / 2;
    const qrBoxY = 250;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 24);
    ctx.fill();

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, qrBoxX + 30, qrBoxY + 30, qrBoxSize - 60, qrBoxSize - 60);

      ctx.fillStyle = '#E2E8F0';
      ctx.font = '600 26px "JetBrains Mono", monospace';
      ctx.fillText(displayUrl.replace(/^https?:\/\//, ''), canvas.width / 2, 985);

      ctx.fillStyle = '#64748B';
      ctx.font = '400 20px "DM Sans", sans-serif';
      ctx.fillText(
        isGroup
          ? 'Pindai QR Code untuk membuka direktori tautan event'
          : 'Pindai QR Code dengan kamera ponsel untuk membuka tautan',
        canvas.width / 2,
        1045
      );

      if (profile.websiteUrl) {
        ctx.fillStyle = '#475569';
        ctx.font = '400 18px "DM Sans", sans-serif';
        ctx.fillText(profile.websiteUrl, canvas.width / 2, 1105);
      }

      const downloadAnchor = document.createElement('a');
      downloadAnchor.download = `${filePrefix}.png`;
      downloadAnchor.href = canvas.toDataURL('image/png');
      downloadAnchor.click();
      onNotify(`Kartu QR PNG "${filePrefix}.png" diunduh`);
    };
    img.src = dataUrl;
  };

  const handleDownloadSvg = () => {
    if (!svgMarkup) return;
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filePrefix}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify(`Vektor QR SVG "${filePrefix}.svg" diunduh`);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
    >
      <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="h-1 w-full" style={{ backgroundColor: accentColor }} aria-hidden="true" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="min-w-0">
            <h2 id="qr-modal-title" className="font-display text-base font-semibold text-slate-100 truncate">
              {isGroup ? 'QR Code Portal Event' : 'QR Code Tautan Sekolah'}
            </h2>
            <p className="text-xs text-slate-400 truncate">
              {profile.schoolName} {subText ? `· ${subText}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal QR Code"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="text-center">
            <p className="text-sm font-medium text-slate-100 mb-3">{titleText}</p>
            <div className="inline-flex p-4 bg-white rounded-xl">
              {dataUrl ? (
                <img
                  src={dataUrl}
                  alt={`QR Code untuk ${titleText}`}
                  className="w-52 h-52 block"
                />
              ) : (
                <div className="w-52 h-52 bg-slate-200 animate-pulse rounded" />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 bg-[#090D16] border border-slate-800 rounded-xl px-3.5 py-2.5">
            <span className="font-mono-tabular text-xs text-blue-400 truncate">{displayUrl}</span>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors shrink-0 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Disalin' : 'Salin'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleDownloadPngCard}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Unduh PNG</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadSvg}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-medium text-slate-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              <FileCode2 className="w-4 h-4 shrink-0" />
              <span>Unduh SVG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
