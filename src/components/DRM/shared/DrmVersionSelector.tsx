import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Calendar, FileText, UploadCloud, Check } from 'lucide-react';
import { drmUploadService, DrmUploadRecord } from '@/services/drmUploadService';

interface DrmVersionSelectorProps {
  versions: DrmUploadRecord[];
  selectedId: string | null;
  onChange: (id: string) => void;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yy} ${hh}:${mi}`;
  } catch {
    return iso;
  }
}

export function DrmVersionSelector({ versions, selectedId, onChange }: DrmVersionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (versions.length <= 1) return null;

  const selectedVersion = versions.find((v) => {
    const vId = drmUploadService.formatRecordId(v.id);
    return vId === selectedId;
  }) || versions[0];

  const getVersionLabel = (v: DrmUploadRecord) => {
    if (v.source === 'finalize') {
      return `${v.link_name} - ${v.project_name}`;
    }
    return v.label || `Manual - ${formatDate(v.created_at)}`;
  };

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-3 px-4 py-2 text-xs font-semibold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all shadow-sm cursor-pointer min-w-[240px] text-left text-gray-700"
      >
        <div className="flex items-center gap-2 truncate">
          {selectedVersion.source === 'finalize' ? (
            <FileText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
          ) : (
            <UploadCloud className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
          )}
          <span className="truncate max-w-[200px]" title={getVersionLabel(selectedVersion)}>
            {getVersionLabel(selectedVersion)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono">
            {formatDate(selectedVersion.created_at)}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-1.5 w-[320px] bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-[150] overflow-hidden"
          style={{ animation: 'slideUp 0.15s ease-out' }}
        >
          <div className="px-3 py-1.5 border-b border-gray-50 mb-1 flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Pilih Versi Dokumen
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-bold">
              {versions.length} versi tersedia
            </span>
          </div>

          <div className="max-h-[260px] overflow-y-auto">
            {versions.map((v) => {
              const vId = drmUploadService.formatRecordId(v.id);
              const isSelected = vId === selectedId;
              const label = getVersionLabel(v);

              return (
                <button
                  key={vId}
                  type="button"
                  onClick={() => {
                    onChange(vId);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 flex items-start gap-2.5 hover:bg-gray-50 text-left transition-colors relative ${
                    isSelected ? 'bg-indigo-50/50 text-indigo-900 font-medium' : 'text-gray-700'
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {v.source === 'finalize' ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-blue-50 text-blue-600">
                        <FileText className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-purple-50 text-purple-600">
                        <UploadCloud className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-xs truncate font-semibold" title={label}>
                      {label}
                    </p>
                    <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-gray-300" />
                      {formatDate(v.created_at)}
                    </p>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-indigo-600 absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
