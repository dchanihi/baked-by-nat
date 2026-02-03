import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Default preset colors (pastel/bakery themed)
const DEFAULT_PRESETS = [
  '#F5B8C9', // Pink (default)
  '#FFB5A7', // Coral
  '#FCD5CE', // Peach
  '#F9DCC4', // Apricot
  '#FEC89A', // Orange cream
  '#D4E09B', // Lime
  '#98D8AA', // Mint
  '#A8E6CF', // Seafoam
  '#88D4AB', // Green
  '#7BDFF2', // Sky blue
  '#B8E0D2', // Teal
  '#D6EADF', // Sage
  '#EAE4E9', // Lavender gray
  '#DCD0FF', // Lavender
  '#E2CFF4', // Light purple
  '#F0A6CA', // Rose
];

const STORAGE_KEY = 'event-item-custom-colors';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  id?: string;
}

export const ColorPicker = ({ value, onChange, id }: ColorPickerProps) => {
  const [open, setOpen] = useState(false);
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [tempColor, setTempColor] = useState(value);

  // Load custom colors from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCustomColors(parsed);
        }
      } catch (e) {
        console.error('Failed to parse custom colors', e);
      }
    }
  }, []);

  // Sync tempColor with value when popover opens
  useEffect(() => {
    if (open) {
      setTempColor(value);
    }
  }, [open, value]);

  const saveCustomColors = (colors: string[]) => {
    setCustomColors(colors);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  };

  const addCustomColor = () => {
    // Don't add duplicates or colors already in presets
    const normalizedColor = tempColor.toUpperCase();
    const allColors = [...DEFAULT_PRESETS.map(c => c.toUpperCase()), ...customColors.map(c => c.toUpperCase())];
    
    if (!allColors.includes(normalizedColor)) {
      const newCustomColors = [...customColors, tempColor];
      // Limit to 16 custom colors
      if (newCustomColors.length > 16) {
        newCustomColors.shift();
      }
      saveCustomColors(newCustomColors);
    }
  };

  const removeCustomColor = (colorToRemove: string) => {
    const newCustomColors = customColors.filter(c => c !== colorToRemove);
    saveCustomColors(newCustomColors);
  };

  const selectColor = (color: string) => {
    onChange(color);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-7 h-7 rounded-full border-2 border-border cursor-pointer block hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          style={{ backgroundColor: value }}
          title="Click to change icon color"
          id={id}
        />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="center" sideOffset={5}>
        <div className="space-y-3">
          {/* Color picker input with add button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="color"
                value={tempColor}
                onChange={(e) => setTempColor(e.target.value)}
                className="w-full h-9 rounded-md cursor-pointer border border-border"
                style={{ padding: '2px' }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={addCustomColor}
              title="Add to custom colors"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Apply current picker color */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => selectColor(tempColor)}
          >
            Apply Color
          </Button>

          {/* Preset colors */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Presets</span>
            <div className="grid grid-cols-8 gap-1.5">
              {DEFAULT_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => selectColor(color)}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring",
                    value.toUpperCase() === color.toUpperCase()
                      ? "border-foreground scale-110"
                      : "border-transparent"
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Custom colors */}
          {customColors.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Custom</span>
              <div className="grid grid-cols-8 gap-1.5">
                {customColors.map((color, index) => (
                  <button
                    key={`${color}-${index}`}
                    type="button"
                    onClick={() => selectColor(color)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      removeCustomColor(color);
                    }}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring",
                      value.toUpperCase() === color.toUpperCase()
                        ? "border-foreground scale-110"
                        : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                    title={`${color} (right-click to remove)`}
                  />
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Right-click custom colors to remove
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
