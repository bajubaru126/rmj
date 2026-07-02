import { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Calendar } from 'lucide-react';

interface TimeSliderProps {
  minDate: Date;
  maxDate: Date;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onRangeChange: (startDate: Date, endDate: Date) => void;
}

export function TimeSlider({ minDate, maxDate, currentDate, onDateChange, onRangeChange }: TimeSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [rangeStart, setRangeStart] = useState(minDate);
  const [rangeEnd, setRangeEnd] = useState(maxDate);
  const [speed, setSpeed] = useState(1000); // milliseconds per step

  // Debug log
  useEffect(() => {
    console.log('TimeSlider mounted!');
    console.log('Date range:', minDate, 'to', maxDate);
  }, []);

  // Calculate total months between min and max
  const getTotalMonths = () => {
    const months = (maxDate.getFullYear() - minDate.getFullYear()) * 12 + 
                   (maxDate.getMonth() - minDate.getMonth());
    return months;
  };

  const getCurrentMonthIndex = () => {
    const months = (currentDate.getFullYear() - minDate.getFullYear()) * 12 + 
                   (currentDate.getMonth() - minDate.getMonth());
    return months;
  };

  const getDateFromMonthIndex = (index: number) => {
    const date = new Date(minDate);
    date.setMonth(date.getMonth() + index);
    return date;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'short' });
  };

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const currentIndex = getCurrentMonthIndex();
      const totalMonths = getTotalMonths();

      if (currentIndex >= totalMonths) {
        setIsPlaying(false);
        return;
      }

      const nextDate = getDateFromMonthIndex(currentIndex + 1);
      onDateChange(nextDate);
    }, speed);

    return () => clearInterval(interval);
  }, [isPlaying, currentDate, speed]);

  // Update range when slider changes
  useEffect(() => {
    onRangeChange(rangeStart, rangeEnd);
  }, [rangeStart, rangeEnd]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value);
    const newDate = getDateFromMonthIndex(index);
    onDateChange(newDate);
  };

  const handleRangeStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value);
    const newDate = getDateFromMonthIndex(index);
    setRangeStart(newDate);
  };

  const handleRangeEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value);
    const newDate = getDateFromMonthIndex(index);
    setRangeEnd(newDate);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    onDateChange(minDate);
    setRangeStart(minDate);
    setRangeEnd(maxDate);
  };

  const handleSkipToEnd = () => {
    setIsPlaying(false);
    onDateChange(maxDate);
  };

  const totalMonths = getTotalMonths();
  const currentIndex = getCurrentMonthIndex();
  const rangeStartIndex = (rangeStart.getFullYear() - minDate.getFullYear()) * 12 + 
                          (rangeStart.getMonth() - minDate.getMonth());
  const rangeEndIndex = (rangeEnd.getFullYear() - minDate.getFullYear()) * 12 + 
                        (rangeEnd.getMonth() - minDate.getMonth());

  // Generate tick marks (every 6 months)
  const tickMarks = [];
  for (let i = 0; i <= totalMonths; i += 6) {
    const date = getDateFromMonthIndex(i);
    tickMarks.push({
      index: i,
      label: formatDate(date)
    });
  }

  return (
    <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl p-4 w-[800px] z-50 border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Timeline Filter</h3>
        </div>
        <div className="text-sm text-gray-600">
          {formatDate(rangeStart)} - {formatDate(rangeEnd)}
        </div>
      </div>

      {/* Current Date Display */}
      <div className="text-center mb-4">
        <div className="text-2xl font-bold text-blue-600">
          {formatDate(currentDate)}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Bulan {currentIndex + 1} dari {totalMonths + 1}
        </div>
      </div>

      {/* Main Slider */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="range"
            min="0"
            max={totalMonths}
            value={currentIndex}
            onChange={handleSliderChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentIndex / totalMonths) * 100}%, #e5e7eb ${(currentIndex / totalMonths) * 100}%, #e5e7eb 100%)`
            }}
          />
          
          {/* Tick marks */}
          <div className="relative mt-2">
            {tickMarks.map((tick) => (
              <div
                key={tick.index}
                className="absolute transform -translate-x-1/2"
                style={{ left: `${(tick.index / totalMonths) * 100}%` }}
              >
                <div className="w-px h-2 bg-gray-400 mx-auto"></div>
                <div className="text-[10px] text-gray-500 mt-1 whitespace-nowrap">
                  {tick.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Range Sliders */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-600 w-16">Start:</span>
          <input
            type="range"
            min="0"
            max={totalMonths}
            value={rangeStartIndex}
            onChange={handleRangeStartChange}
            className="flex-1 h-1 bg-green-200 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-gray-700 font-medium w-24">{formatDate(rangeStart)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-600 w-16">End:</span>
          <input
            type="range"
            min="0"
            max={totalMonths}
            value={rangeEndIndex}
            onChange={handleRangeEndChange}
            className="flex-1 h-1 bg-red-200 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-gray-700 font-medium w-24">{formatDate(rangeEnd)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Reset"
          >
            <SkipBack className="w-4 h-4 text-gray-700" />
          </button>
          <button
            onClick={handlePlayPause}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={handleSkipToEnd}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Skip to End"
          >
            <SkipForward className="w-4 h-4 text-gray-700" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">Speed:</span>
          <select
            value={speed}
            onChange={(e) => setSpeed(parseInt(e.target.value))}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="2000">0.5x</option>
            <option value="1000">1x</option>
            <option value="500">2x</option>
            <option value="250">4x</option>
          </select>
        </div>
      </div>

      <style>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .slider-thumb::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}
