import { useState, useMemo } from 'react';
import { Search, MapPin, ChevronRight } from 'lucide-react';
import { ProjectLocation } from '../../types/map';

interface MapSidebarProps {
  projects: ProjectLocation[];
  onFilterChange: (filters: { types: string[]; statuses: string[]; searchQuery: string }) => void;
  onProjectSelect: (project: ProjectLocation) => void;
  selectedProjectId?: string | null;
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

export function MapSidebar({ projects, onFilterChange, onProjectSelect, selectedProjectId }: MapSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [regionFilter, setRegionFilter] = useState('Semua Region');
  const [tahapFilter, setTahapFilter] = useState('Semua Tahap');
  const [statusFilter, setStatusFilter] = useState('Semua Status');

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    onFilterChange({ types: selectedTypes, statuses: selectedStatuses, searchQuery: query });
  };

  const toggleType = (type: string) => {
    const newTypes = selectedTypes.includes(type)
      ? selectedTypes.filter(t => t !== type)
      : [...selectedTypes, type];
    setSelectedTypes(newTypes);
    onFilterChange({ types: newTypes, statuses: selectedStatuses, searchQuery });
  };

  const toggleStatus = (status: string) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter(s => s !== status)
      : [...selectedStatuses, status];
    setSelectedStatuses(newStatuses);
    onFilterChange({ types: selectedTypes, statuses: newStatuses, searchQuery });
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(project.type);
      const statusMatch = selectedStatuses.length === 0 || selectedStatuses.includes(project.status);
      const searchMatch = searchQuery === '' ||
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.location.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.location.province.toLowerCase().includes(searchQuery.toLowerCase());
      return typeMatch && statusMatch && searchMatch;
    });
  }, [projects, selectedTypes, selectedStatuses, searchQuery]);

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Search */}
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
          <input
            type="text"
            placeholder="Cari ruas..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-gray-400 bg-gray-50"
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto p-3 space-y-4">
        {/* Filter Jaringan */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Filter Jaringan</p>
          <div className="space-y-1.5">
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="h-7 w-full rounded-md border border-gray-200 bg-gray-50 px-2 text-[11px] text-gray-700 outline-none focus:border-gray-400"
            >
              <option>Semua Region</option>
              <option>DKI Jakarta</option>
              <option>Jawa Barat</option>
              <option>Jawa Tengah</option>
              <option>Jawa Timur</option>
            </select>
            <select
              value={tahapFilter}
              onChange={(e) => setTahapFilter(e.target.value)}
              className="h-7 w-full rounded-md border border-gray-200 bg-gray-50 px-2 text-[11px] text-gray-700 outline-none focus:border-gray-400"
            >
              <option>Semua Tahap</option>
              <option>Planning</option>
              <option>Survey</option>
              <option>Installation</option>
              <option>Completed</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-7 w-full rounded-md border border-gray-200 bg-gray-50 px-2 text-[11px] text-gray-700 outline-none focus:border-gray-400"
            >
              <option>Semua Status</option>
              <option>On Track</option>
              <option>Delayed</option>
            </select>
          </div>
        </div>

        {/* Type filter chips */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Tipe</p>
          <div className="flex flex-wrap gap-1">
            {['tower', 'fiber', 'infrastructure', 'maintenance'].map(type => (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                  selectedTypes.includes(type)
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Status filter chips */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Status</p>
          <div className="flex flex-wrap gap-1">
            {['planning', 'survey', 'installation', 'completed'].map(status => {
              const color = STAGE_COLORS[status];
              const isActive = selectedStatuses.includes(status);
              return (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                    isActive
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  style={isActive ? { backgroundColor: color } : undefined}
                >
                  {STAGE_LABELS[status]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ruas Aktif */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
            Ruas Aktif ({filteredProjects.length})
          </p>
          <div className="space-y-1">
            {filteredProjects.map(project => {
              const isSelected = selectedProjectId === project.id;
              const stageColor = STAGE_COLORS[project.status] ?? '#64748B';
              const progress = project.details?.progress ?? 0;

              return (
                <button
                  key={project.id}
                  onClick={() => onProjectSelect(project)}
                  className={`w-full rounded-lg p-2 text-left transition-all ${
                    isSelected
                      ? 'bg-gray-50 ring-1 ring-gray-300'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-mono text-[10px] font-semibold leading-snug text-gray-900 line-clamp-2">
                      {project.name}
                    </span>
                    <ChevronRight
                      className={`h-3 w-3 shrink-0 mt-0.5 transition-transform ${
                        isSelected ? 'rotate-90 text-gray-900' : 'text-gray-400'
                      }`}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span
                      className="font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{
                        background: `${stageColor}18`,
                        color: stageColor,
                      }}
                    >
                      {STAGE_LABELS[project.status] || project.status}
                    </span>
                    <span className="font-mono text-[10px] text-gray-400">
                      {progress}%
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-1.5 h-1 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${progress}%`, backgroundColor: stageColor }}
                    />
                  </div>
                </button>
              );
            })}
            {filteredProjects.length === 0 && (
              <p className="text-[10px] text-gray-400 text-center py-4">Tidak ada ruas ditemukan</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
