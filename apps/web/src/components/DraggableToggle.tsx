import React, { useRef, useState, useEffect } from 'react';

interface DraggableToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  color?: 'blue' | 'amber' | 'emerald';
  disabled?: boolean;
}

export const DraggableToggle: React.FC<DraggableToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  color = 'blue',
  disabled = false,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<number | null>(null);

  const activeColorClass =
    color === 'amber'
      ? 'bg-amber-600 border-amber-500'
      : color === 'emerald'
      ? 'bg-emerald-600 border-emerald-500'
      : 'bg-blue-600 border-blue-500';

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    calculateOffset(e);
  };

  const calculateOffset = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const trackWidth = rect.width;
    const thumbWidth = 20; // thumb diameter in px
    const maxOffset = trackWidth - thumbWidth - 4; // 2px padding each side

    const rawOffset = e.clientX - rect.left - thumbWidth / 2;
    const clampedOffset = Math.max(0, Math.min(rawOffset, maxOffset));
    setDragOffset(clampedOffset);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    calculateOffset(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);

    if (trackRef.current && dragOffset !== null) {
      const rect = trackRef.current.getBoundingClientRect();
      const midpoint = (rect.width - 24) / 2;
      const newChecked = dragOffset > midpoint;
      // If dragged significantly, adopt that position. If it was just a click (low movement), toggle it!
      if (Math.abs(dragOffset - (checked ? rect.width - 24 : 0)) > 6) {
        onChange(newChecked);
      } else {
        onChange(!checked);
      }
    } else {
      onChange(!checked);
    }
    setDragOffset(null);
  };

  const getThumbTranslate = () => {
    if (dragOffset !== null) {
      return `${dragOffset}px`;
    }
    return checked ? '22px' : '2px';
  };

  return (
    <div className={`flex items-start gap-3 select-none ${disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}>
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`w-12 h-6 rounded-full border transition-colors duration-150 relative shrink-0 flex items-center touch-none ${
          (dragOffset !== null ? dragOffset > 10 : checked)
            ? activeColorClass
            : 'bg-[#18181c] border-[#27272a]'
        }`}
      >
        <div
          style={{
            transform: `translateX(${getThumbTranslate()})`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          className={`w-5 h-5 rounded-full shadow-md pointer-events-none ${
            (dragOffset !== null ? dragOffset > 10 : checked)
              ? 'bg-white'
              : 'bg-zinc-400'
          }`}
        />
      </div>

      {(label || description) && (
        <div onClick={() => !disabled && onChange(!checked)}>
          {label && (
            <span className="text-xs font-bold text-zinc-200 block uppercase tracking-wider font-mono">
              {label}
            </span>
          )}
          {description && (
            <span className="text-[11px] text-zinc-400 block mt-0.5 leading-relaxed">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
