import { GraduationCap } from 'lucide-react';
import { useState } from 'react';

interface SchoolEmblemProps {
  schoolName: string;
  logoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SchoolEmblem({ schoolName, logoUrl, size = 'md' }: SchoolEmblemProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const dims =
    size === 'sm'
      ? 'w-8 h-8 rounded-lg text-xs'
      : size === 'lg'
      ? 'w-14 h-14 rounded-xl text-lg'
      : 'w-10 h-10 rounded-xl text-sm';

  if (logoUrl && !imgFailed) {
    return (
      <div
        className={`${dims} shrink-0 overflow-hidden bg-slate-900 border border-slate-700/80 flex items-center justify-center`}
      >
        <img
          src={logoUrl}
          alt={`Logo ${schoolName}`}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${dims} shrink-0 bg-slate-900 border border-slate-700/80 flex items-center justify-center text-blue-400`}
      aria-hidden="true"
    >
      <GraduationCap className={size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5'} />
    </div>
  );
}
