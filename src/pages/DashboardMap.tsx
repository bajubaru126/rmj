import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MapView } from '../components/map/MapView';
import { MapSidebar } from '../components/map/MapSidebar';
import { ProjectDetailPanel } from '../components/map/ProjectDetailPanel';
import { ProjectPopup } from '../components/map/ProjectPopup';
import { CompactTimeSlider } from '../components/map/CompactTimeSlider';
import { MapTypeSelector } from '../components/map/MapTypeSelector';
import { ProjectLocation } from '../types/map';
import { fetchProjects } from '../services/mapService';
import { projectLocations } from '../data/projectLocations';

// Toggle untuk menggunakan dummy data (untuk development)
const USE_DUMMY_DATA = false;

export function DashboardMap() {
  const [projects, setProjects] = useState<ProjectLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectLocation | null>(null);
  const [hoveredProject, setHoveredProject] = useState<ProjectLocation | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [lineWidthMultiplier, setLineWidthMultiplier] = useState(1.5);
  const [stoSizeMultiplier, setStoSizeMultiplier] = useState(1.5);
  const [projectMarkerMultiplier, setProjectMarkerMultiplier] = useState(1.5);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [zoomLevelMode, setZoomLevelMode] = useState<'auto' | 'project' | 'sto' | 'route'>('auto');
  const [highlightedSpanId, setHighlightedSpanId] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'satellite' | 'streets' | 'hybrid' | 'terrain'>('hybrid');
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);
  const [filters, setFilters] = useState({
    types: [] as string[],
    statuses: [] as string[],
    searchQuery: ''
  });

  const [dateRange, setDateRange] = useState({
    start: new Date('2023-01-01'),
    end: new Date('2026-12-31')
  });

  const getProjectDateRange = () => {
    try {
      if (!projects || projects.length === 0) {
        return {
          min: new Date('2023-01-01'),
          max: new Date('2026-12-31')
        };
      }

      const dates = projects.flatMap(p => [
        new Date(p.details.startDate),
        new Date(p.details.endDate)
      ]);

      const validDates = dates.filter(d => !isNaN(d.getTime()));

      if (validDates.length === 0) {
        return {
          min: new Date('2023-01-01'),
          max: new Date('2026-12-31')
        };
      }

      return {
        min: new Date(Math.min(...validDates.map(d => d.getTime()))),
        max: new Date(Math.max(...validDates.map(d => d.getTime())))
      };
    } catch (error) {
      console.error('Error calculating date range:', error);
      return {
        min: new Date('2023-01-01'),
        max: new Date('2026-12-31')
      };
    }
  };

  const projectDateRange = getProjectDateRange();

  // Fetch projects dari API saat component mount
  useEffect(() => {
    const loadProjects = async () => {
      // Jika menggunakan dummy data, langsung set dan return
      if (USE_DUMMY_DATA) {
        console.log('📦 Using dummy data (development mode)');
        setProjects(projectLocations);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        console.log('🔄 Loading projects from API...');
        const data = await fetchProjects();
        console.log('✅ Projects loaded:', data.length);
        
        if (data.length > 0) {
          console.log('✅ First project ID:', data[0].id, '(type:', typeof data[0].id, ')');
        }
        
        setProjects(data);
      } catch (err: any) {
        console.error('❌ Failed to load projects:', err);
        
        // Detailed error message
        let errorMessage = 'Gagal memuat data proyek. ';
        
        if (err.message && err.message.includes('No authentication token')) {
          errorMessage = 'Anda belum login. Silakan login terlebih dahulu untuk melihat data proyek.';
        } else if (err.code === 'ECONNABORTED') {
          errorMessage += 'Request timeout. Pastikan backend sedang berjalan.';
        } else if (err.code === 'ERR_NETWORK') {
          errorMessage += 'Tidak dapat terhubung ke server. Pastikan backend berjalan di http://localhost:8080';
        } else if (err.response) {
          if (err.response.status === 401) {
            errorMessage = 'Sesi Anda telah berakhir. Silakan login kembali.';
          } else if (err.response.status === 403) {
            errorMessage = 'Anda tidak memiliki akses untuk melihat data proyek.';
          } else {
            errorMessage += `Server error: ${err.response.status} - ${err.response.statusText}`;
          }
        } else if (err.request) {
          errorMessage += 'Tidak ada response dari server. Pastikan backend sedang berjalan dan CORS sudah dikonfigurasi.';
        } else {
          errorMessage += err.message || 'Unknown error';
        }
        
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, []);

  useEffect(() => {
    let rafId: number | null = null;
    let lastUpdate = 0;
    const throttleMs = 50;
    
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      
      if (now - lastUpdate < throttleMs) {
        return;
      }
      
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      
      rafId = requestAnimationFrame(() => {
        setMousePosition({ x: e.clientX, y: e.clientY });
        lastUpdate = now;
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const handleProjectClick = useCallback((project: ProjectLocation) => {
    setSelectedProject(project);
  }, []);

  const handleProjectHover = useCallback((project: ProjectLocation | null) => {
    setHoveredProject(project);
  }, []);

  const handleFilterChange = useCallback((newFilters: { types: string[]; statuses: string[]; searchQuery: string }) => {
    setFilters(newFilters);
  }, []);

  const handleProjectSelect = useCallback((project: ProjectLocation) => {
    setSelectedProject(project);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedProject(null);
  }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const typeMatch = filters.types.length === 0 || filters.types.includes(project.type);
      const statusMatch = filters.statuses.length === 0 || filters.statuses.includes(project.status);
      const searchMatch = filters.searchQuery === '' || 
        project.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        project.location.city.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        project.location.province.toLowerCase().includes(filters.searchQuery.toLowerCase());
      
      const projectStart = new Date(project.details.startDate);
      const projectEnd = new Date(project.details.endDate);
      const dateMatch = projectStart <= dateRange.end && projectEnd >= dateRange.start;
      
      return typeMatch && statusMatch && searchMatch && dateMatch;
    });
  }, [projects, filters, dateRange]);

  const handleRangeChange = useCallback((start: Date, end: Date) => {
    setDateRange({ start, end });
  }, []);

  const extractProjectId = (id: any): string => {
    if (typeof id === 'object' && id !== null && 'id' in id) return String((id as any).id);
    return String(id);
  };

  const selectedProjectId = selectedProject ? extractProjectId(selectedProject.id) : null;

  return (
    <div className="flex h-full overflow-hidden">
      {/* LEFT: Always visible filter panel */}
      <div className="w-60 shrink-0 border-r border-gray-200 bg-white overflow-hidden flex flex-col">
        <MapSidebar
          projects={projects}
          onFilterChange={handleFilterChange}
          onProjectSelect={handleProjectSelect}
          selectedProjectId={selectedProjectId}
        />
      </div>

      {/* CENTER: Header + Map */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Map Header Bar */}
        <div className="shrink-0 flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-2">
          <LegendDropdown
            id="cable-type"
            title="Designator"
            items={[
              { color: '#8B4513', label: 'BC-TR-C-1' },
              { color: '#F4A460', label: 'BC-TR-C-3' },
              { color: '#D2691E', label: 'BCTR-KH-3' },
              { color: '#654321', label: 'BC-TR-S-3' },
              { color: '#F5F5DC', label: 'BC-TR-S-4' },
              { color: '#2F4F4F', label: 'BM1' },
              { color: '#CD5C5C', label: 'BSS' },
              { color: '#DAA520', label: 'DA' },
              { color: '#696969', label: 'DD-BM-HDPE-40-1' },
              { color: '#BC8F8F', label: 'HBPS1' },
              { color: '#A0522D', label: 'HH2' },
              { color: '#DEB887', label: 'PP-IN' },
              { color: '#D2B48C', label: 'PS7' },
              { color: '#F4A460', label: 'PS9' },
              { color: '#CD853F', label: 'PUAS' },
              { color: '#8B7355', label: 'S3' },
              { color: '#A0826D', label: 'SC48' },
              { color: '#C19A6B', label: 'SLACK-T' },
              { color: '#B8860B', label: 'TC48' }
            ]}
            isOpen={openDropdown === 'cable-type'}
            onToggle={() => setOpenDropdown(openDropdown === 'cable-type' ? null : 'cable-type')}
          />

          <LegendDropdown
            id="status-project"
            title="Status Proyek"
            items={[
              { color: '#ef4444', label: 'Planning' },
              { color: '#f59e0b', label: 'Survey' },
              { color: '#10b981', label: 'Installation' },
              { color: '#EF4444', label: 'Completed' }
            ]}
            isOpen={openDropdown === 'status-project'}
            onToggle={() => setOpenDropdown(openDropdown === 'status-project' ? null : 'status-project')}
          />

          <SizeControlDropdown
            isOpen={openDropdown === 'display-size'}
            onToggle={() => setOpenDropdown(openDropdown === 'display-size' ? null : 'display-size')}
            lineWidthMultiplier={lineWidthMultiplier}
            setLineWidthMultiplier={setLineWidthMultiplier}
            setStoSizeMultiplier={setStoSizeMultiplier}
            setProjectMarkerMultiplier={setProjectMarkerMultiplier}
            zoomLevelMode={zoomLevelMode}
            setZoomLevelMode={setZoomLevelMode}
            highlightedSpanId={highlightedSpanId}
            setHighlightedSpanId={setHighlightedSpanId}
          />

          <MapTypeSelector
            value={mapType}
            onChange={setMapType}
          />

          <div className="rounded-lg px-3 py-2 border border-gray-200 flex items-center bg-white">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-gray-800 whitespace-nowrap">
                {filteredProjects.length} Proyek
              </span>
            </div>
          </div>
        </div>

        {/* Map Canvas */}
        <div className="flex-1 relative bg-[#0a0e15] overflow-hidden">
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 bg-[#0a0e15]/95 z-40 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-[#EF4444] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-white/80 text-sm">Memuat data proyek...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="absolute inset-0 bg-[#0a0e15]/95 z-40 flex items-center justify-center">
              <div className="text-center max-w-md mx-auto p-6">
                <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">⚠️</span>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Terjadi Kesalahan</h2>
                <p className="text-red-300 mb-4 text-sm">{error}</p>
                <div className="flex gap-3 justify-center flex-wrap">
                  {(error.includes('login') || error.includes('Sesi')) && (
                    <button
                      onClick={() => window.location.href = '/login'}
                      className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm"
                    >
                      Login
                    </button>
                  )}
                  <button
                    onClick={() => window.location.reload()}
                    className="px-5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg transition-colors text-sm"
                  >
                    Muat Ulang
                  </button>
                  <button
                    onClick={() => {
                      setProjects(projectLocations);
                      setError(null);
                    }}
                    className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                  >
                    Gunakan Data Demo
                  </button>
                </div>
              </div>
            </div>
          )}

          <MapView
            projects={filteredProjects}
            selectedProject={selectedProject}
            onProjectClick={handleProjectClick}
            onProjectHover={handleProjectHover}
            filters={filters}
            lineWidthMultiplier={lineWidthMultiplier}
            stoSizeMultiplier={stoSizeMultiplier}
            projectMarkerMultiplier={projectMarkerMultiplier}
            onLineWidthChange={setLineWidthMultiplier}
            onStoSizeChange={setStoSizeMultiplier}
            onProjectMarkerChange={setProjectMarkerMultiplier}
            zoomLevelMode={zoomLevelMode}
            onZoomLevelModeChange={setZoomLevelMode}
            highlightedSpanId={highlightedSpanId}
            onHighlightedSpanIdChange={setHighlightedSpanId}
            mapType={mapType}
            onMapTypeChange={setMapType}
            isTimelinePlaying={isTimelinePlaying}
          />

          {projectDateRange.min && projectDateRange.max && (
            <CompactTimeSlider
              minDate={projectDateRange.min}
              maxDate={projectDateRange.max}
              onRangeChange={handleRangeChange}
              showLeftSidebar={false}
              showRightSidebar={!!selectedProject}
              selectedProject={selectedProject}
              onPlayingChange={setIsTimelinePlaying}
            />
          )}

          {/* Stage legend overlay */}
          <div className="absolute bottom-16 left-4 flex flex-col gap-1.5 rounded-xl bg-black/60 px-3 py-2.5 backdrop-blur z-10">
            <span className="font-mono text-[9px] uppercase tracking-widest text-white/50 mb-0.5">Tahap</span>
            {[
              { label: 'Preparation', color: '#64748B' },
              { label: 'Survey', color: '#0EA5E9' },
              { label: 'DRM', color: '#4F46E5' },
              { label: 'Instalasi', color: '#F97316' },
              { label: 'Selesai', color: '#10B981' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="font-mono text-[10px] text-white/70">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: Context drawer (conditional) */}
      {selectedProject && (
        <div className="w-70 shrink-0 border-l border-gray-200 bg-white overflow-hidden" style={{ width: 280 }}>
          <ProjectDetailPanel
            project={selectedProject}
            onClose={handleCloseDetail}
          />
        </div>
      )}

      {hoveredProject && !selectedProject && (
        <ProjectPopup
          project={hoveredProject}
          position={mousePosition}
        />
      )}
    </div>
  );
}




interface LegendItem {
  color: string;
  label: string;
}

interface LegendDropdownProps {
  id: string;
  title: string;
  items: LegendItem[];
  isOpen: boolean;
  onToggle: () => void;
}

function LegendDropdown({ title, items, isOpen, onToggle }: LegendDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (isOpen) {
          onToggle();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onToggle]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={onToggle}
        className="rounded-md px-2.5 py-1.5 border border-gray-200 flex items-center gap-1.5 hover:bg-gray-50 transition-colors bg-white"
      >
        <span className="text-[10px] font-semibold text-gray-700">{title}</span>
        <svg 
          className={`w-3 h-3 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="absolute top-full mt-1 rounded-lg shadow-lg p-2.5 border border-gray-200 z-[1001]"
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            minWidth: '180px',
            maxWidth: '220px'
          }}
        >
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-6 h-3 rounded border border-gray-300 flex-shrink-0" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[10px] text-gray-700 font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SizeControlDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  lineWidthMultiplier: number;
  setLineWidthMultiplier: (value: number) => void;
  setStoSizeMultiplier: (value: number) => void;
  setProjectMarkerMultiplier: (value: number) => void;
  zoomLevelMode: 'auto' | 'project' | 'sto' | 'route';
  setZoomLevelMode: (value: 'auto' | 'project' | 'sto' | 'route') => void;
  highlightedSpanId: string | null;
  setHighlightedSpanId: (value: string | null) => void;
}

function SizeControlDropdown({ 
  isOpen, 
  onToggle, 
  lineWidthMultiplier,
  setLineWidthMultiplier,
  setStoSizeMultiplier,
  setProjectMarkerMultiplier,
  zoomLevelMode,
  setZoomLevelMode,
  highlightedSpanId,
  setHighlightedSpanId
}: SizeControlDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (isOpen) {
          onToggle();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onToggle]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={onToggle}
        className="rounded-md px-2.5 py-1.5 border border-gray-200 flex items-center gap-1.5 hover:bg-gray-50 transition-colors bg-white"
      >
        <span className="text-[10px] font-semibold text-gray-700">Ukuran Tampilan</span>
        <svg 
          className={`w-3 h-3 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="absolute top-full mt-1 rounded-lg shadow-lg p-2.5 border border-gray-200 z-[1001]"
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            minWidth: '200px'
          }}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const newValue = Math.max(0.5, lineWidthMultiplier - 0.5);
                  setLineWidthMultiplier(newValue);
                  setStoSizeMultiplier(newValue);
                  setProjectMarkerMultiplier(newValue);
                }}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-bold transition-colors"
                title="Perkecil"
              >
                −
              </button>
              <div className="flex-1 text-center text-sm font-bold text-gray-900">
                {lineWidthMultiplier}x
              </div>
              <button
                onClick={() => {
                  const newValue = Math.min(5, lineWidthMultiplier + 0.5);
                  setLineWidthMultiplier(newValue);
                  setStoSizeMultiplier(newValue);
                  setProjectMarkerMultiplier(newValue);
                }}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-bold transition-colors"
                title="Perbesar"
              >
                +
              </button>
            </div>
            <div className="flex gap-1 flex-wrap">
              {[0.5, 1, 1.5, 2, 3].map(value => (
                <button
                  key={value}
                  onClick={() => {
                    setLineWidthMultiplier(value);
                    setStoSizeMultiplier(value);
                    setProjectMarkerMultiplier(value);
                  }}
                  className={`flex-1 px-2 py-1 text-xs rounded transition-colors font-medium ${
                    lineWidthMultiplier === value
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {value}x
                </button>
              ))}
            </div>
            <div className="pt-2 border-t border-gray-200">
              <div className="text-[10px] font-semibold text-gray-700 mb-2">
                Zoom Level Mode
              </div>
              <select
                value={zoomLevelMode}
                onChange={(e) => setZoomLevelMode(e.target.value as 'auto' | 'project' | 'sto' | 'route')}
                className="w-full text-[10px] px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-purple-500 bg-white"
              >
                <option value="auto">🔄 Auto (Default)</option>
                <option value="project">📍 Project Level</option>
                <option value="sto">🏢 STO Level</option>
                <option value="route">🛣️ Route Level</option>
              </select>
              <div className="text-[9px] text-gray-500 mt-1.5 text-center">
                {zoomLevelMode === 'auto' 
                  ? 'Otomatis sesuai zoom'
                  : zoomLevelMode === 'project' ? 'Selalu tampilkan project'
                  : zoomLevelMode === 'sto' ? 'Selalu tampilkan STO'
                  : 'Selalu tampilkan route'}
              </div>
            </div>
            
            {highlightedSpanId && (
              <div className="pt-2 border-t border-gray-200">
                <div className="text-[10px] text-[#EF4444] font-semibold mb-1">
                  🔵 Span Selected
                </div>
                <button
                  onClick={() => setHighlightedSpanId(null)}
                  className="w-full text-[9px] text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded px-2 py-1 transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
