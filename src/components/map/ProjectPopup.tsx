import { ProjectLocation } from '../../types/map';

interface ProjectPopupProps {
  project: ProjectLocation;
  position: { x: number; y: number };
}

export function ProjectPopup({ project, position }: ProjectPopupProps) {
  const statusColors: Record<string, string> = {
    planning: 'bg-[#EF4444]',
    survey: 'bg-amber-500',
    installation: 'bg-green-500',
    completed: 'bg-[#DC2626]'
  };

  const statusLabels: Record<string, string> = {
    planning: 'Perencanaan',
    survey: 'Survey',
    installation: 'Instalasi',
    completed: 'Selesai'
  };

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: `${position.x + 20}px`,
        top: `${position.y - 80}px`,
      }}
    >
      <div className="bg-white rounded-lg shadow-2xl p-4 w-72 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight pr-2">
            {project.name}
          </h3>
          <span className={`${statusColors[project.status]} text-white text-xs px-2 py-1 rounded-full whitespace-nowrap`}>
            {statusLabels[project.status]}
          </span>
        </div>
        
        <div className="space-y-1 text-xs text-gray-600">
          <p className="flex items-center">
            <span className="mr-2">📍</span>
            {project.location.city}, {project.location.province}
          </p>
          <p className="flex items-center">
            <span className="mr-2">🏢</span>
            {project.details.contractor}
          </p>
          <p className="flex items-center">
            <span className="mr-2">📊</span>
            Progress: {project.details.progress}%
          </p>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`${statusColors[project.status]} h-2 rounded-full transition-all duration-500`}
              style={{ width: `${project.details.progress}%` }}
            />
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-2 text-center">
          Klik untuk detail lengkap
        </p>
      </div>
    </div>
  );
}
