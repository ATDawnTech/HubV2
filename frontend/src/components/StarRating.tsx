import React, { useState, useEffect, useRef } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showValue?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  readOnly = false,
  size = 'md',
  className,
  showValue = false
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const getStarValue = (index: number, isHalf: boolean) => {
    return index + (isHalf ? 0.5 : 1);
  };

  const handleStarClick = (starValue: number) => {
    if (!readOnly) {
      console.debug('[StarRating] click', { starValue });
      onChange(starValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (readOnly) return;

    let newValue = value;
    
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        newValue = Math.max(0.5, value - 0.5);
        break;
      case 'ArrowRight':
        e.preventDefault();
        newValue = Math.min(5, value + 0.5);
        break;
      case ' ':
      case 'Enter':
        e.preventDefault();
        // No action needed for space/enter as they just commit current value
        return;
      default:
        return;
    }
    
    onChange(newValue);
  };

  const renderStar = (index: number) => {
    const fullValue = index + 1;
    const halfValue = index + 0.5;
    const displayValue = hoverValue !== null ? hoverValue : value;
    
    const isFullFilled = displayValue >= fullValue;
    const isHalfFilled = displayValue >= halfValue && displayValue < fullValue;

    return (
      <div
        key={index}
        className={cn(
          "relative cursor-pointer",
          readOnly && "cursor-default",
          className
        )}
        onMouseEnter={() => !readOnly && setHoverValue(fullValue)}
        onMouseLeave={() => !readOnly && setHoverValue(null)}
      >
        {/* Half star (left side) */}
        <div
          className="absolute inset-0 w-1/2 overflow-hidden z-10"
          onClick={() => handleStarClick(halfValue)}
          onMouseEnter={() => !readOnly && setHoverValue(halfValue)}
          title={`${halfValue} / 5`}
        >
          <Star 
            className={cn(
              sizeClasses[size],
              isHalfFilled || isFullFilled 
                ? "fill-yellow-400 text-yellow-400" 
                : "fill-transparent text-muted-foreground hover:text-yellow-400"
            )}
          />
        </div>
        
        {/* Full star (right side) */}
        <div
          className="w-full"
          onClick={() => handleStarClick(fullValue)}
          title={`${fullValue} / 5`}
        >
          <Star 
            className={cn(
              sizeClasses[size],
              isFullFilled 
                ? "fill-yellow-400 text-yellow-400" 
                : "fill-transparent text-muted-foreground hover:text-yellow-400"
            )}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex items-center gap-1">
      <div
        ref={containerRef}
        className={cn(
          "flex items-center gap-0.5",
          !readOnly && "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 rounded"
        )}
        tabIndex={readOnly ? -1 : 0}
        onKeyDown={handleKeyDown}
        role="slider"
        aria-valuemin={0.5}
        aria-valuemax={5}
        aria-valuenow={value}
        aria-label={`Rating: ${value} out of 5 stars`}
      >
        {[0, 1, 2, 3, 4].map(renderStar)}
      </div>
      
      {showValue && (
        <span className="text-sm text-muted-foreground ml-2">
          {(hoverValue !== null ? hoverValue : value).toFixed(1)} / 5
        </span>
      )}
    </div>
  );
};