import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  min?: number;
}

export const NumericInput = ({ value, onChange, className, min = 0 }: NumericInputProps) => {
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

  const handleBlur = () => {
    setIsFocused(false);
    setIsSelected(false);
    const parsed = parseInt(tempValue) || 0;
    onChange(parsed);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempValue(e.target.value);
  };

  return (
    <div className="relative">
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
