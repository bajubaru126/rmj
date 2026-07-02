import { useState, useEffect } from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { Play, Pause, RotateCcw, Calendar } from 'lucide-react';

interface SimpleTimeSliderProps {
  minDate: Date;
  maxDate: Date;
  onRangeChange: (startDate: Date, endDate: Date) => void;
}

export function SimpleTimeSlider({ minDate, maxDate, onRangeChange }: SimpleTimeSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rangeValue, setRangeValue] = useState<[number, number]>([0, 100]);

  // Debug - component mounted
  useEffect(() => {
    console.log('🎬 SimpleTimeSlider MOUNTED!');
    console.log('Min Date:', minDate);
    console.log('Max Date:', maxDate);
  }, []);

  // Calculate total months
  const getTotalMonths = () => {
    const years = maxDate.getFullYear() - minDate.getFullYear();
    const months = maxDate.getMonth() - minDate.getMonth();
    return years * 12 + months;
  };

  const totalMonths = getTotalMonths();

  // Convert index to date
  const indexToDate = (index: number): Date => {
    const date = new Date(minDate);
    date.setMonth(date.getMonth() + Math.floor((index / 100) * totalMonths));
    return date;
  };

  // Format date
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('id-ID', { 
      year: 'numeric', 
      month: 'short' 
    });
  };

  // Auto-play
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= 100) {
          setIsPlaying(false);
          return 100;
        }
        return prev + 1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Update range when slider changes
  useEffect(() => {
    const startDate = indexToDate(rangeValue[0]);
    const endDate = indexToDate(rangeValue[1]);
    onRangeChange(startDate, endDate);
  }, [rangeValue]);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
    setRangeValue([0, 100]);
  };

  const currentDate = indexToDate(currentIndex);
  const startDate = indexToDate(rangeValue[0]);
  const endDate = indexToDate(rangeValue[1]);

  return (
    <div 
      className="fixed bottom-8 left-1/2 transform -translate-x-1/2 rounded-xl shadow-2xl p-6 border-4"
      style={{ 
        width: '700px', 
        zIndex: 99999,
        maxWidth: '90vw',
        backgroundColor: '#ff0000', // RED untuk testing visibility
        borderColor: '#ffff00' // YELLOW border
      }}
    >
      {/* TEST VISIBILITY */}
      <div className="text-white text-2xl font-bold text-center mb-4">
        ⚠️ TIMESLIDER TEST - IF YOU SEE THIS, IT WORKS! ⚠️
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-gray-900">Timeline Filter</h3>
        </div>
        <div className="text-sm font-medium text-gray-600">
          {formatDate(startDate)} - {formatDate(endDate)}
        </div>
      </div>

      {/* Current Date Display */}
      <div className="text-center mb-6">
        <div className="text-3xl font-bold text-blue-600 mb-1">
          {formatDate(currentDate)}
        </div>
        <div className="text-xs text-gray-500">
          Progress: {currentIndex}%
        </div>
      </div>

      {/* Main Progress Slider */}
      <div className="mb-6">
        <div className="text-xs text-gray-600 mb-2">Current Timeline Position</div>
        <Slider
          value={currentIndex}
          onChange={(value) => setCurrentIndex(value as number)}
          min={0}
          max={100}
          step={1}
          trackStyle={{ backgroundColor: '#3b82f6', height: 8 }}
          railStyle={{ backgroundColor: '#e5e7eb', height: 8 }}
          handleStyle={{
            borderColor: '#3b82f6',
            height: 20,
            width: 20,
            marginTop: -6,
            backgroundColor: '#3b82f6',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.5)'
          }}
        />
      </div>

      {/* Range Slider */}
      <div className="mb-6">
        <div className="text-xs text-gray-600 mb-2">Filter Date Range</div>
        <Slider
          range
          value={rangeValue}
          onChange={(value) => setRangeValue(value as [number, number])}
          min={0}
          max={100}
          step={1}
          trackStyle={[{ backgroundColor: '#10b981', height: 6 }]}
          railStyle={{ backgroundColor: '#e5e7eb', height: 6 }}
          handleStyle={[
            {
              borderColor: '#10b981',
              height: 18,
              width: 18,
              marginTop: -6,
              backgroundColor: '#10b981'
            },
            {
              borderColor: '#ef4444',
              height: 18,
              width: 18,
              marginTop: -6,
              backgroundColor: '#ef4444'
            }
          ]}
        />
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>🟢 Start: {formatDate(startDate)}</span>
          <span>🔴 End: {formatDate(endDate)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={handleReset}
          className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          title="Reset"
        >
          <RotateCcw className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Info */}
      <div className="mt-4 text-center text-xs text-gray-500">
        Click Play to animate timeline • Drag sliders to filter date range
      </div>
    </div>
  );
}
