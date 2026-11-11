import React from 'react';
import { ScanLine, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import type { Project } from '../pages/ProjectEditor/types';

/** Shape trả về từ GET /projects/stats (backend/src/modules/project/scan-stats.service.ts). */
export interface DashboardStatsData {
  periodDays: number;
  scans: {
    total: number;
    previousTotal: number;
    daily: { date: string; count: number }[];
  };
}

interface Props {
  projects: Project[];
  stats: DashboardStatsData | null;
  /** true khi đang tải lần đầu — hiện "—" thay vì số 0 gây hiểu nhầm. */
  loading: boolean;
}

const nf = new Intl.NumberFormat();

function ScanTrend({ daily }: { daily: { count: number }[] }) {
  const w = 300;
  const h = 64;
  const max = Math.max(1, ...daily.map((d) => d.count));
  const step = daily.length > 1 ? w / (daily.length - 1) : w;
  const pts = daily.map((d, i) => `${(i * step).toFixed(1)},${(h - 4 - (d.count / max) * (h - 8)).toFixed(1)}`);
  const line = `M${pts.join(' L')}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-16" aria-hidden="true">
      <path d={`${line} L${w},${h} L0,${h} Z`} className="fill-accent/10" />
      <path d={line} className="stroke-accent" strokeWidth={2} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function DeltaBadge({ total, previous }: { total: number; previous: number }) {
  if (total === 0 && previous === 0) return null;
  if (previous === 0) {
    return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-accent/15 text-accent-ink">New</span>;
  }
  const pct = Math.round(((total - previous) / previous) * 100);
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium rounded-full ${
        up ? 'bg-accent/15 text-accent-ink' : 'bg-red-400/15 text-red-300'
      }`}
      title="Compared with the previous period"
    >
      <Icon size={12} />
      {up ? '+' : ''}
      {pct}%
    </span>
  );
}

export const DashboardStats: React.FC<Props> = ({ projects, stats, loading }) => {
  const published = projects.filter((p) => p.status === 'published').length;
  const scans = stats?.scans;
  const days = stats?.periodDays ?? 30;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] gap-4 mb-12">
      {/* Primary: total scans */}
      <div className="p-6 bg-surface border border-white/6 rounded-2xl flex flex-col">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-gray-400">
            <ScanLine size={16} className="text-accent-ink" />
            Total scans · last {days} days
          </p>
          {scans && <DeltaBadge total={scans.total} previous={scans.previousTotal} />}
        </div>

        <div className="mt-3 text-5xl font-semibold tracking-tight text-white tabular-nums">
          {loading || !scans ? '—' : nf.format(scans.total)}
        </div>

        <div className="mt-auto pt-4">
          {scans && scans.total > 0 ? (
            <ScanTrend daily={scans.daily} />
          ) : (
            <p className="text-sm text-gray-500 h-16 flex items-end">
              {loading ? 'Loading scans…' : 'No scans yet. Publish a project and scan its trigger image with the mobile app.'}
            </p>
          )}
        </div>
      </div>

      {/* Secondary list */}
      <div className="px-6 py-2 bg-surface border border-white/6 rounded-2xl flex flex-col justify-center divide-y divide-white/6">
        <div className="flex items-center justify-between gap-3 py-4">
          <div>
            <p className="text-sm text-gray-400">Active projects</p>
            <p className="text-xs text-gray-500 mt-0.5">Published, of {projects.length} total</p>
          </div>
          <span className="text-2xl font-semibold text-white tabular-nums">{published}</span>
        </div>
        {['Top campaign', 'Click rate'].map((label) => (
          <div key={label} className="flex items-center justify-between gap-3 py-4">
            <p className="text-sm text-gray-500">{label}</p>
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <Clock size={12} />
              Coming soon
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
