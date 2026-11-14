import { AlertTriangle, CheckCircle2, Clock, PauseCircle } from 'lucide-react';
import type { LinkScheduleStatus } from '../types.ts';

interface StatusLabelProps {
  status: LinkScheduleStatus;
}

export function StatusLabel({ status }: StatusLabelProps) {
  switch (status) {
    case 'active':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Aktif</span>
        </span>
      );
    case 'scheduled':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>Terjadwal</span>
        </span>
      );
    case 'expired':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Kedaluwarsa</span>
        </span>
      );
    case 'inactive':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 whitespace-nowrap">
          <PauseCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Nonaktif</span>
        </span>
      );
  }
}
