import { useState, useEffect, useRef } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface CompactTimeSliderProps {
  minDate: Date;
  maxDate: Date;
  onRangeChange: (startDate: Date, endDate: Date) => void;
  showLeftSidebar?: boolean;
  showRightSidebar?: boolean;
  selectedProject?: any;
  onPlayingChange?: (isPlaying: boolean) => void;
}

export function CompactTimeSlider({ 
  minDate, 
  maxDate, 
  onRangeChange,
  showLeftSidebar = true,
  showRightSidebar = true,
  selectedProject = null,
  onPlayingChange
}: CompactTimeSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(100);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);
  const [playPosition, setPlayPosition] = useState(0);
  const [sliderLayout, setSliderLayout] = useState<'horizontal' | 'compact'>('horizontal');
  const sliderRef = useRef<HTMLDivElement>(null);

  const getTotalMonths = () => {
    const years = maxDate.getFullYear() - minDate.getFullYear();
    const months = maxDate.getMonth() - minDate.getMonth();
    return years * 12 + months;
  };

  const totalMonths = getTotalMonths();

  const valueToDate = (value: number): Date => {
    const date = new Date(minDate);
    date.setMonth(date.getMonth() + Math.floor((value / 100) * totalMonths));
    return date;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getMonthLabels = () => {
    const labels = [];
    const startYear = minDate.getFullYear();
    const endYear = maxDate.getFullYear();
    
    for (let year = startYear; year <= endYear; year++) {
      const startMonth = year === startYear ? minDate.getMonth() : 0;
      const endMonth = year === endYear ? maxDate.getMonth() : 11;
      
      for (let month = startMonth; month <= endMonth; month++) {
        labels.push(new Date(year, month, 1).toLocaleDateString('en-US', { month: 'short' }));
      }
    }
    return labels;
  };

  const monthLabels = getMonthLabels();

  useEffect(() => {
    if (!isPlaying) return;

    let lastUpdatePosition = playPosition;
    const updateThreshold = 10;

    const interval = setInterval(() => {
      setPlayPosition(prev => {
        const minPos = Math.min(rangeStart, rangeEnd);
        const maxPos = Math.max(rangeStart, rangeEnd);
        const nextPos = prev + 1.5;

        if (nextPos >= maxPos) {
          setIsPlaying(false);
          if (onPlayingChange) {
            onPlayingChange(false);
          }
          const startDate = valueToDate(rangeStart);
          const endDate = valueToDate(rangeEnd);
          onRangeChange(startDate, endDate);
          return maxPos;
        }

        if (Math.abs(nextPos - lastUpdatePosition) >= updateThreshold) {
          lastUpdatePosition = nextPos;
          const startDate = valueToDate(minPos);
          const currentDate = valueToDate(nextPos);
          onRangeChange(startDate, currentDate);
        }

        return nextPos;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, rangeStart, rangeEnd]);

  const handlePlayPause = () => {
    const newPlayingState = !isPlaying;
    if (newPlayingState) {
      setPlayPosition(Math.min(rangeStart, rangeEnd));
    } else {
      const startDate = valueToDate(rangeStart);
      const endDate = valueToDate(rangeEnd);
      onRangeChange(startDate, endDate);
    }
    setIsPlaying(newPlayingState);
    if (onPlayingChange) {
      onPlayingChange(newPlayingState);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setRangeStart(0);
    setRangeEnd(100);
    setPlayPosition(0);
  };

  useEffect(() => {
    if (!isPlaying) {
      const startDate = valueToDate(rangeStart);
      const endDate = valueToDate(rangeEnd);
      onRangeChange(startDate, endDate);
    }
  }, [rangeStart, rangeEnd, isPlaying]);

  const handlePrevious = () => {
    setRangeStart(prev => Math.max(0, prev - 5));
  };

  const handleNext = () => {
    setRangeEnd(prev => Math.min(100, prev + 5));
  };

  const handleMouseDown = (thumb: 'start' | 'end') => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(thumb);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging || !sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));

    if (dragging === 'start') {
      setRangeStart(percentage);
    } else {
      setRangeEnd(percentage);
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging]);

  const startDate = valueToDate(rangeStart);
  const endDate = valueToDate(rangeEnd);
  const currentPlayDate = valueToDate(playPosition);

  return (
    <div 
      style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        right: '16px',
        backgroundColor: 'rgba(255, 255, 255, 0.97)',
        backdropFilter: 'blur(12px)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        padding: sliderLayout === 'horizontal' ? '16px 20px' : '12px 16px',
        zIndex: 20,
        border: '1px solid rgba(0,0,0,0.08)',
        transition: 'all 0.3s ease',
        overflow: 'hidden'
      }}
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: sliderLayout === 'horizontal' ? '16px' : '12px',
        width: '100%',
        overflow: 'hidden' // Prevent inner content overflow
      }}>
        <button
          onClick={handlePlayPause}
          style={{
            width: '40px',
            height: '40px',
            backgroundColor: isPlaying ? '#EF4444' : 'white',
            border: '2px solid #EF4444',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s ease',
            boxShadow: isPlaying ? '0 4px 12px rgba(239, 68, 68, 0.3)' : 'none'
          }}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause style={{ width: '20px', height: '20px', color: 'white' }} />
          ) : (
            <Play style={{ width: '20px', height: '20px', color: '#EF4444' }} />
          )}
        </button>

        <button
          onClick={handleReset}
          style={{
            width: '40px',
            height: '40px',
            backgroundColor: 'white',
            border: '2px solid #d1d5db',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s ease'
          }}
          title="Reset to default"
        >
          <RotateCcw style={{ width: '18px', height: '18px', color: '#6b7280' }} />
        </button>

        <div style={{ 
          fontSize: '15px', 
          fontWeight: '700', 
          color: isPlaying ? '#EF4444' : '#1f2937',
          minWidth: '100px',
          flexShrink: 0,
          backgroundColor: isPlaying ? '#fef2f2' : '#f3f4f6',
          padding: '8px 12px',
          borderRadius: '6px',
          border: isPlaying ? '2px solid #EF4444' : 'none',
          transition: 'all 0.3s ease'
        }}>
          {isPlaying ? '▶ ' : ''}{formatDate(currentPlayDate)}
        </div>

        <div style={{ 
          fontSize: '12px', 
          color: '#6b7280',
          minWidth: '90px',
          flexShrink: 0,
          fontWeight: '600'
        }}>
          {isPlaying ? '🎬 Playing...' : formatDate(minDate)}
        </div>

        <div 
          ref={sliderRef}
          style={{ flex: 1, position: 'relative', height: '50px', userSelect: 'none' }}
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: '6px',
            fontSize: '10px',
            color: '#9ca3af',
            fontWeight: '600'
          }}>
            {monthLabels.filter((_, i) => i % 3 === 0).map((label, i) => (
              <span key={i}>{label}</span>
            ))}
          </div>

          <div style={{ position: 'relative', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px' }}>
            <div style={{
              position: 'absolute',
              left: `${Math.min(rangeStart, rangeEnd)}%`,
              width: `${Math.abs(rangeEnd - rangeStart)}%`,
              height: '100%',
              backgroundColor: '#EF4444',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
            }} />

            {isPlaying && (
              <div style={{
                position: 'absolute',
                left: `${playPosition}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '4px',
                height: '20px',
                backgroundColor: '#f59e0b',
                borderRadius: '2px',
                boxShadow: '0 0 12px rgba(245, 158, 11, 0.8)',
                zIndex: 4
              }} />
            )}
            
            <div 
              onMouseDown={handleMouseDown('start')}
              style={{
                position: 'absolute',
                left: `${rangeStart}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '18px',
                height: '18px',
                backgroundColor: '#10b981',
                border: '3px solid white',
                borderRadius: '50%',
                boxShadow: '0 3px 8px rgba(0,0,0,0.25)',
                cursor: 'grab',
                zIndex: dragging === 'start' ? 10 : 5,
                transition: 'transform 0.1s ease'
              }} 
            />

            <div 
              onMouseDown={handleMouseDown('end')}
              style={{
                position: 'absolute',
                left: `${rangeEnd}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '18px',
                height: '18px',
                backgroundColor: '#ef4444',
                border: '3px solid white',
                borderRadius: '50%',
                boxShadow: '0 3px 8px rgba(0,0,0,0.25)',
                cursor: 'grab',
                zIndex: dragging === 'end' ? 10 : 5,
                transition: 'transform 0.1s ease'
              }} 
            />
          </div>
        </div>

        <div style={{ 
          fontSize: '12px', 
          color: '#6b7280',
          minWidth: '90px',
          textAlign: 'right',
          flexShrink: 0,
          fontWeight: '600'
        }}>
          {formatDate(maxDate)}
        </div>

        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button
            onClick={handlePrevious}
            style={{
              width: '36px',
              height: '36px',
              backgroundColor: 'white',
              border: '2px solid #10b981',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            title="Move start thumb backward"
          >
            <ChevronLeft style={{ width: '18px', height: '18px', color: '#10b981' }} />
          </button>
          <button
            onClick={handleNext}
            style={{
              width: '36px',
              height: '36px',
              backgroundColor: 'white',
              border: '2px solid #ef4444',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            title="Move end thumb forward"
          >
            <ChevronRight style={{ width: '18px', height: '18px', color: '#ef4444' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
