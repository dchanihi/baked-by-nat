import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  min?: number;
  onNavigate?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onEnter?: () => void;
}

export const NumericInput = ({ value, onChange, className, min = 0, onNavigate, onEnter }: NumericInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [tempValue, setTempValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const enterEditMode = () => {
    setIsFocused(true);
    setIsSelected(false);
    setTempValue(value === 0 ? '' : value.toString());
  };

  const handleClick = () => {
    if (value === 0) {
      enterEditMode();
    } else {
      setIsSelected(true);
    }
  };

  const handleDoubleClick = () => {
    enterEditMode();
  };

  const commitValue = () => {
    const parsed = parseInt(tempValue) || 0;
    onChange(parsed);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setIsSelected(false);
    commitValue();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isFocused) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitValue();
        setIsFocused(false);
        onEnter?.();
      } else if (e.key === 'Tab') {
        commitValue();
        setIsFocused(false);
        onNavigate?.(e.shiftKey ? 'left' : 'right');
        e.preventDefault();
      } else if (e.key === 'Escape') {
        setIsFocused(false);
        setTempValue(value.toString());
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        commitValue();
        setIsFocused(false);
        onNavigate?.('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        commitValue();
        setIsFocused(false);
        onNavigate?.('down');
      }
    } else if (isSelected) {
      if (e.key === 'Enter' || e.key === 'F2') {
        e.preventDefault();
        enterEditMode();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        setIsSelected(false);
        onNavigate?.(e.shiftKey ? 'left' : 'right');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIsSelected(false);
        onNavigate?.('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIsSelected(false);
        onNavigate?.('down');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsSelected(false);
        onNavigate?.('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsSelected(false);
        onNavigate?.('right');
      } else if (/^[0-9]$/.test(e.key)) {
        enterEditMode();
        setTempValue(e.key);
      }
    }
  };

  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      {isFocused ? (
        <Input
          ref={inputRef}
          type="number"
          min={min}
          value={tempValue}
          onChange={handleChange}
          onBlur={handleBlur}
          autoFocus
          className={cn("h-8 border-0 bg-transparent text-center focus-visible:ring-1 focus-visible:ring-offset-0", className)}
        />
      ) : (
        <div
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onBlur={() => setIsSelected(false)}
          tabIndex={0}
          className={cn(
            "h-8 px-3 flex items-center justify-center text-sm cursor-text rounded-md transition-colors select-all",
            isSelected ? "bg-primary/20 ring-2 ring-primary/50" : "hover:bg-muted/50",
            className
          )}
        >
          {value}
        </div>
      )}
    </div>
  );
};
