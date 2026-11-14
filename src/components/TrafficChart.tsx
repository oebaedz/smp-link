import { useMemo, useState } from 'react';
import { formatNumber } from '../lib/api.ts';
import type { TimeseriesBucket } from '../types.ts';

interface TrafficChartProps {
  data: TimeseriesBucket[];
  height?: number;
}

export function TrafficChart({ data, height = 240 }: TrafficChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const width = 760;
  const padLeft = 40;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 32;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const { maxVal, yTicks, points, areaPath, linePath } = useMemo(() => {
    const rawMax = Math.max(4, ...data.map((d) => d.clicks));
    const step = rawMax <= 10 ? 2 : rawMax <= 25 ? 5 : rawMax <= 60 ? 15 : Math.ceil(rawMax / 4 / 10) * 10;
    const ceiling = Math.max(step * 4, Math.ceil(rawMax / step) * step);
    const ticks = [0, ceiling * 0.25, ceiling * 0.5, ceiling * 0.75, ceiling].map((v) =>
      Math.round(v)
    );

    const pts = data.map((bucket, idx) => {
      const x =
        data.length <= 1
          ? padLeft + chartW / 2
          : padLeft + (idx / (data.length - 1)) * chartW;
      const y = padTop + chartH - (bucket.clicks / ceiling) * chartH;
      return { x, y, ...bucket };
    });

    let line = '';
    let area = '';
    if (pts.length > 0) {
      line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
      area = `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${(padTop + chartH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(padTop + chartH).toFixed(1)} Z`;
    }

    return {
      maxVal: ceiling,
      yTicks: ticks,
      points: pts,
      areaPath: area,
      linePath: line,
    };
  }, [data, chartW, chartH]);

  const labelStep = data.length > 14 ? Math.ceil(data.length / 7) : data.length > 8 ? 2 : 1;
  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="relative w-full select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="Grafik trafik klik tautan sekolah"
      >
        <defs>
          <linearGradient id="smplink-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Horizontal Gridlines & Y-axis Labels */}
        {yTicks.map((tick) => {
          const y = padTop + chartH - (tick / maxVal) * chartH;
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="#1E293B"
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-500 text-[11px] font-mono-tabular"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Area & Line */}
        {areaPath && <path d={areaPath} fill="url(#smplink-area-grad)" />}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* X-axis Labels */}
        {points.map((pt, idx) => {
          if (idx % labelStep !== 0 && idx !== points.length - 1) return null;
          return (
            <text
              key={pt.timestamp + idx}
              x={pt.x}
              y={height - 8}
              textAnchor="middle"
              className="fill-slate-500 text-[11px] font-mono-tabular"
            >
              {pt.label}
            </text>
          );
        })}

        {/* Hover Guide & Active Dot */}
        {hovered && (
          <g>
            <line
              x1={hovered.x}
              y1={padTop}
              x2={hovered.x}
              y2={padTop + chartH}
              stroke="#475569"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle
              cx={hovered.x}
              cy={hovered.y}
              r="5"
              fill="#3B82F6"
              stroke="#090D16"
              strokeWidth="2"
            />
          </g>
        )}

        {/* Interactive Hit Columns */}
        {points.map((pt, idx) => {
          const colW = points.length > 1 ? chartW / points.length : chartW;
          return (
            <rect
              key={`hit-${idx}`}
              x={pt.x - colW / 2}
              y={padTop}
              width={colW}
              height={chartH}
              fill="transparent"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-crosshair"
            />
          );
        })}
      </svg>

      {/* Crisp Tooltip Overlay */}
      {hovered && (
        <div
          className="pointer-events-none absolute top-2 right-3 bg-[#090D16]/95 border border-slate-700 rounded-lg px-3 py-1.5 text-xs flex items-center gap-3"
        >
          <span className="text-slate-400 font-mono-tabular">{hovered.label}</span>
          <span className="text-slate-100 font-semibold font-mono-tabular">
            {formatNumber(hovered.clicks)} klik
          </span>
        </div>
      )}
    </div>
  );
}
