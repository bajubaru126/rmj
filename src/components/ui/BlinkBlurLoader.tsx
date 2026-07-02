interface BlinkBlurLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  color?: 'purple' | 'blue' | 'gradient' | 'multicolor';
}

export function BlinkBlurLoader({ size = 'md', text, color = 'gradient' }: BlinkBlurLoaderProps) {
  const sizes = {
    sm: { width: 12, height: 20, gap: 2 },
    md: { width: 20, height: 32, gap: 4 },
    lg: { width: 28, height: 44, gap: 6 }
  };

  const colors = {
    purple: 'linear-gradient(135deg, #a32cd3 0%, #327fcd 50%, #cd32cd 100%)',
    blue: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 50%, #60A5FA 100%)',
    gradient: 'linear-gradient(135deg, #a32cd3 0%, #327fcd 50%, #cd32cd 100%)',
    multicolor: '' // Will be handled per bar
  };

  // Multi-color bars matching tab colors: Green (BOQ), Amber (Matrix), Red (RedLine), Orange (KML), Blue (general)
  const multiColors = [
    'linear-gradient(135deg, #10B981 0%, #059669 100%)', // Green - BOQ
    'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', // Amber - Matrix
    'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', // Red - RedLine
    'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', // Orange - KML
    'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', // Blue - General
  ];

  const currentSize = sizes[size];
  const currentColor = colors[color];

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="flex items-center" style={{ gap: `${currentSize.gap}px` }}>
        {[0, 1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className="blinkblur-bar"
            style={{
              width: `${currentSize.width}px`,
              height: `${currentSize.height}px`,
              animationDelay: `${index * 0.1}s`,
              background: color === 'multicolor' ? multiColors[index] : currentColor
            }}
          />
        ))}
      </div>
      {text && (
        <p className="text-gray-600 font-medium text-sm">{text}</p>
      )}
      <style>{`
        .blinkblur-bar {
          border-radius: 4px;
          transform: skewX(-15deg);
          animation: blinkblur 1.2s ease-in-out infinite;
          filter: blur(0);
        }

        @keyframes blinkblur {
          0%, 100% {
            opacity: 0.3;
            filter: blur(2px);
            transform: skewX(-15deg) scale(0.95);
          }
          50% {
            opacity: 1;
            filter: blur(0);
            transform: skewX(-15deg) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
