import { useState, useRef, useEffect } from 'react';
import { Map as MapIcon, Satellite, Layers, Mountain } from 'lucide-react';

interface MapTypeSelectorProps {
  value: 'satellite' | 'streets' | 'hybrid' | 'terrain';
  onChange: (value: 'satellite' | 'streets' | 'hybrid' | 'terrain') => void;
}

export function MapTypeSelector({ value, onChange }: MapTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const mapTypes = [
    { value: 'satellite' as const, label: 'Satelit', icon: Satellite },
    { value: 'streets' as const, label: 'Jalan', icon: MapIcon },
    { value: 'hybrid' as const, label: 'Hybrid', icon: Layers },
    { value: 'terrain' as const, label: 'Terrain', icon: Mountain },
  ];

  const currentType = mapTypes.find(t => t.value === value);
  const CurrentIcon = currentType?.icon || MapIcon;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 shadow-sm"
      >
        <CurrentIcon className="w-4 h-4" />
        <span>{currentType?.label}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px] animate-in slide-in-from-top-2 duration-200">
          {mapTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                onClick={() => {
                  onChange(type.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  value === type.value ? 'bg-red-50 text-[#EF4444] font-medium' : 'text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{type.label}</span>
                {value === type.value && (
                  <svg className="w-4 h-4 ml-auto text-[#EF4444]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
