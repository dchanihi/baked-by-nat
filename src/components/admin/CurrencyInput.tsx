import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

export const CurrencyInput = ({ value, onChange, className }: CurrencyInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [tempValue, setTempValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = () => {
    setIsFocused(true);
    setTempValue(value === 0 ? '' : value.toString());
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(tempValue) || 0;
    onChange(parsed);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempValue(e.target.value);
  };

  const formattedValue = value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });

  return (
    <div className="relative">
      {isFocused ? (
        <Input
          ref={inputRef}
          type="number"
          step="0.01"
          min="0"
          value={tempValue}
          onChange={handleChange}
          onBlur={handleBlur}
          autoFocus
          className={cn("h-8 border-0 bg-transparent text-right focus-visible:ring-1 focus-visible:ring-offset-0", className)}
        />
      ) : (
        <div
          onClick={() => setIsFocused(true)}
          className={cn(
            "h-8 px-3 flex items-center justify-end text-sm cursor-text rounded-md hover:bg-muted/50 transition-colors",
            className
          )}
        >
          {formattedValue}
        </div>
      )}
    </div>
  );
};
