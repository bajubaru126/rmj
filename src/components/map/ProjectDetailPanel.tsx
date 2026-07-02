import { X, MapPin, ArrowRight } from 'lucide-react';
import { ProjectLocation } from '../../types/map';

interface ProjectDetailPanelProps {
  project: ProjectLocation | null;
  onClose: () => void;
}

const STAGE_COLORS: Record<string, string> = {
  planning: '#64748B',
  survey: '#0EA5E9',
  installation: '#F97316',
  completed: '#10B981',
};

const STAGE_LABELS: Record<string, string> = {
  planning: 'Planning',
  survey: 'Survey',
  installation: 'Instalasi',
  completed: 'Selesai',
};

type DocStatus = 'ok' | 'bad' | 'wait' | 'none';

function DocBadge({ label, status }: { label: string; status: DocStatus }) {
  const styles: Record<DocStatus, string> = {
    ok: 'bg-green-50 text-green-700',
    bad: 'bg-red-50 text-red-700',
    wait: 'bg-amber-50 text-amber-700',
    none: 'bg-gray-50 text-muted-foreground',
  };
  const symbol: Record<DocStatus, string> = { ok: '\u2713', bad: '\u2717', wait: '~', none: '\u2014' };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${styles[status]}`}>
      {label} {symbol[status]}
    </span>
  );
}

function ProgressSection({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-[10px] font-medium text-gray-500 uppercase">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="w-8 shrink-0 text-right text-[11px] font-mono font-medium text-gray-700">{value}%</span>
    </div>
  );
}

export function ProjectDetailPanel({ project, onClose }: ProjectDetailPanelProps) {
  if (!project) return null;

  const stageColor = STAGE_COLORS[project.status] ?? '#64748B';
  const stageLabel = STAGE_LABELS[project.status] ?? project.status;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3 relative">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 mb-1">
          {project.id}
        </p>
        <h3 className="text-[13px] font-semibold leading-snug text-gray-900 pr-8">{project.name}</h3>
        <div className="mt-2">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: `${stageColor}18`, color: stageColor }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: stageColor }} />
            {stageLabel}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 py-4 space-y-4">
        {/* Progress bars */}
        <div className="space-y-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Progress</p>
          <ProgressSection label="Survey" value={Math.min(project.details.progress + 20, 100)} color="#0EA5E9" />
          <ProgressSection label="DRM" value={Math.min(project.details.progress + 10, 100)} color="#4F46E5" />
          <ProgressSection label="Instalasi" value={project.details.progress} color="#F97316" />
        </div>

        {/* Location */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Lokasi</p>
          <div className="flex items-start gap-2 text-[12px] text-gray-700">
            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gray-400" />
            <span>{project.location.city}, {project.location.province}</span>
          </div>
        </div>

        {/* Dokumen Aktif */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Dokumen Aktif</p>
          <div className="flex flex-wrap gap-1.5">
            <DocBadge label="BOQ" status={project.details.progress > 30 ? 'wait' : 'none'} />
            <DocBadge label="Redline" status={project.details.progress > 50 ? 'ok' : 'none'} />
            <DocBadge label="POW" status={project.details.progress > 10 ? 'ok' : 'none'} />
          </div>
        </div>

        {/* Routes / Spans */}
        {project.routes && project.routes.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
              Route ({project.routes.length})
            </p>
            <div className="space-y-1.5">
              {project.routes.map((route) => (
                <div key={route.id} className="rounded-lg bg-gray-50 p-2.5 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: route.color }} />
                    <span className="text-[11px] font-medium text-gray-800">{route.name}</span>
                  </div>
                  <p className="mt-1 text-[10px] text-gray-500 font-mono">
                    {route.stoFrom} \u2192 {route.stoTo} \u00b7 {(route.length / 1000).toFixed(1)} km
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-gray-200 px-4 py-3 flex flex-col gap-2">
        <button className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-all shadow-sm">
          Buka Detail Lengkap <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
          Lihat KML
        </button>
      </div>
    </div>
  );
}
