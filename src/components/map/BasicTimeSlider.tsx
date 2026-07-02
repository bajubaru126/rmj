import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Calendar } from 'lucide-react';

interface BasicTimeSliderProps {
  minDate: Date;
  maxDate: Date;
  onRangeChange: (startDate: Date, endDate: Date) => void;
}

export function BasicTimeSlider({ minDate, maxDate, onRangeChange }: BasicTimeSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentValue, setCurrentValue] = useState(0);
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(100);

  console.log('🎬 BasicTimeSlider RENDERED!');

  // Calculate total months
  const getTotalMonths = () => {
    const years = maxDate.getFullYear() - minDate.getFullYear();
    const months = maxDate.getMonth() - minDate.getMonth();
    return years * 12 + months;
  };

  const totalMonths = getTotalMonths();

  // Convert value to date
  const valueToDate = (value: number): Date => {
    const date = new Date(minDate);
    date.setMonth(date.getMonth() + Math.floor((value / 100) * totalMonths));
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
      setCurrentValue(prev => {
        if (prev >= 100) {
          setIsPlaying(false);
          return 100;
        }
        return prev + 1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Update range when sliders change
  useEffect(() => {
    const startDate = valueToDate(rangeStart);
    const endDate = valueToDate(rangeEnd);
    onRangeChange(startDate, endDate);
  }, [rangeStart, rangeEnd]);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentValue(0);
    setRangeStart(0);
    setRangeEnd(100);
  };

  const currentDate = valueToDate(currentValue);
  const startDate = valueToDate(rangeStart);
  const endDate = valueToDate(rangeEnd);

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '50px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '700px',
        maxWidth: '90vw',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        padding: '24px',
        zIndex: 99999,
        border: '2px solid #3b82f6'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1f2937' }}>Timeline Filter</h3>
        </div>
        <div style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>
          {formatDate(startDate)} - {formatDate(endDate)}
        </div>
      </div>

      {/* Current Date Display */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '4px' }}>
          {formatDate(currentDate)}
        </div>
        <div style={{ fontSize: '11px', color: '#9ca3af' }}>
          Progress: {currentValue}%
        </div>
      </div>

      {/* Main Progress Slider */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>Current Timeline Position</div>
        <input
          type="range"
          min="0"
          max="100"
          value={currentValue}
          onChange={(e) => setCurrentValue(parseInt(e.target.value))}
          style={{
            width: '100%',
            height: '8px',
            borderRadius: '4px',
            outline: 'none',
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${currentValue}%, #e5e7eb ${currentValue}%, #e5e7eb 100%)`
          }}
        />
      </div>

      {/* Range Sliders */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>Filter Date Range</div>
        
        {/* Start Range */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '10px', color: '#10b981', marginBottom: '4px' }}>
            🟢 Start: {formatDate(startDate)}
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={rangeStart}
            onChange={(e) => setRangeStart(parseInt(e.target.value))}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              outline: 'none',
              background: `linear-gradient(to right, #10b981 0%, #10b981 ${rangeStart}%, #e5e7eb ${rangeStart}%, #e5e7eb 100%)`
            }}
          />
        </div>

        {/* End Range */}
        <div>
          <div style={{ fontSize: '10px', color: '#ef4444', marginBottom: '4px' }}>
            🔴 End: {formatDate(endDate)}
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(parseInt(e.target.value))}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              outline: 'none',
              background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${rangeEnd}%, #e5e7eb ${rangeEnd}%, #e5e7eb 100%)`
            }}
          />
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <button
          onClick={handleReset}
          style={{
            padding: '12px',
            backgroundColor: '#f3f4f6',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Reset"
        >
          <RotateCcw style={{ width: '20px', height: '20px', color: '#6b7280' }} />
        </button>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
          }}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause style={{ width: '20px', height: '20px' }} />
          ) : (
            <Play style={{ width: '20px', height: '20px' }} />
          )}
        </button>
      </div>

      {/* Info */}
      <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '10px', color: '#9ca3af' }}>
        Click Play to animate • Drag sliders to filter date range
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}
