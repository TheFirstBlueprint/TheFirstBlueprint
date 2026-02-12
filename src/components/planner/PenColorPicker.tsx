import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const PRESET_COLORS = ['#2b76d2', '#f97316', '#eab308', '#22c55e', '#ec4899', '#ffffff'];
const CUSTOM_COLOR_STORAGE_KEY = 'planner-custom-pen-color';

type InputMode = 'hex' | 'rgb' | 'hsv';
type Hsv = { h: number; s: number; v: number };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b]
    .map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`;

const hexToRgb = (value: string) => {
  const match = value.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;
  let hex = match[1].toLowerCase();
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('');
  }
  const int = parseInt(hex, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
};

const rgbToHsv = (r: number, g: number, b: number): Hsv => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rn) {
      h = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
      h = (bn - rn) / delta + 2;
    } else {
      h = (rn - gn) / delta + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : delta / max;
  const v = max;
  return { h, s, v };
};

const hsvToRgb = (h: number, s: number, v: number) => {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rn = 0;
  let gn = 0;
  let bn = 0;
  if (h >= 0 && h < 60) {
    rn = c; gn = x; bn = 0;
  } else if (h >= 60 && h < 120) {
    rn = x; gn = c; bn = 0;
  } else if (h >= 120 && h < 180) {
    rn = 0; gn = c; bn = x;
  } else if (h >= 180 && h < 240) {
    rn = 0; gn = x; bn = c;
  } else if (h >= 240 && h < 300) {
    rn = x; gn = 0; bn = c;
  } else {
    rn = c; gn = 0; bn = x;
  }
  return {
    r: Math.round((rn + m) * 255),
    g: Math.round((gn + m) * 255),
    b: Math.round((bn + m) * 255),
  };
};

const parseRgb = (value: string) => {
  const nums = value.match(/-?\d+(\.\d+)?/g);
  if (!nums || nums.length < 3) return null;
  const [r, g, b] = nums.slice(0, 3).map((num) => clamp(Number(num), 0, 255));
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b };
};

const parseHsv = (value: string) => {
  const nums = value.match(/-?\d+(\.\d+)?/g);
  if (!nums || nums.length < 3) return null;
  const [hRaw, sRaw, vRaw] = nums.slice(0, 3).map((num) => Number(num));
  if ([hRaw, sRaw, vRaw].some((num) => Number.isNaN(num))) return null;
  const h = ((hRaw % 360) + 360) % 360;
  const s = clamp(sRaw, 0, 100) / 100;
  const v = clamp(vRaw, 0, 100) / 100;
  return { h, s, v };
};

const formatInput = (mode: InputMode, hex: string, hsv: Hsv) => {
  if (mode === 'hex') return hex.toUpperCase();
  if (mode === 'rgb') {
    const rgb = hexToRgb(hex);
    if (!rgb) return '';
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  }
  return `hsv(${Math.round(hsv.h)}, ${Math.round(hsv.s * 100)}, ${Math.round(hsv.v * 100)})`;
};

interface PenColorPickerProps {
  penColor: string;
  onPenColorChange: (color: string) => void;
}

export const PenColorPicker = ({ penColor, onPenColorChange }: PenColorPickerProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const spectrumRef = useRef<HTMLDivElement>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customSelected, setCustomSelected] = useState(false);
  const [customColor, setCustomColor] = useState(() => {
    if (typeof window === 'undefined') return '#2b76d2';
    const stored = window.localStorage.getItem(CUSTOM_COLOR_STORAGE_KEY);
    const storedRgb = stored ? hexToRgb(stored) : null;
    if (storedRgb) return rgbToHex(storedRgb.r, storedRgb.g, storedRgb.b);
    const fromPen = hexToRgb(penColor);
    return fromPen ? rgbToHex(fromPen.r, fromPen.g, fromPen.b) : '#2b76d2';
  });
  const [hsv, setHsv] = useState<Hsv>(() => {
    const rgb = hexToRgb(customColor) ?? { r: 43, g: 118, b: 210 };
    return rgbToHsv(rgb.r, rgb.g, rgb.b);
  });
  const [inputMode, setInputMode] = useState<InputMode>('hex');
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState(false);

  const customGradient = useMemo(
    () => `linear-gradient(135deg, #ff4fd8 0%, #7c3aed 45%, #22d3ee 100%)`,
    []
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CUSTOM_COLOR_STORAGE_KEY, customColor);
    }
  }, [customColor]);

  useEffect(() => {
    if (!customOpen) return;
    setInputValue(formatInput(inputMode, customColor, hsv));
    setInputError(false);
  }, [customColor, hsv, inputMode, customOpen]);

  useEffect(() => {
    if (PRESET_COLORS.includes(penColor)) {
      setCustomSelected(false);
      return;
    }
    const rgb = hexToRgb(penColor);
    if (rgb) {
      const nextHex = rgbToHex(rgb.r, rgb.g, rgb.b);
      setCustomColor(nextHex);
      setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
      setCustomSelected(true);
    }
  }, [penColor]);

  useEffect(() => {
    if (!customOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!panelRef.current) return;
      if (panelRef.current.contains(event.target as Node)) return;
      setCustomOpen(false);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [customOpen]);

  const applyHsv = (next: Hsv) => {
    const rgb = hsvToRgb(next.h, next.s, next.v);
    const nextHex = rgbToHex(rgb.r, rgb.g, rgb.b);
    setHsv(next);
    setCustomColor(nextHex);
    setCustomSelected(true);
    onPenColorChange(nextHex);
    setInputError(false);
  };

  const handleSpectrumPointer = (clientX: number, clientY: number) => {
    if (!spectrumRef.current) return;
    const rect = spectrumRef.current.getBoundingClientRect();
    const x = clamp((clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((clientY - rect.top) / rect.height, 0, 1);
    applyHsv({ h: hsv.h, s: x, v: 1 - y });
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    let nextHex: string | null = null;
    let nextHsv: Hsv | null = null;

    if (inputMode === 'hex') {
      const rgb = hexToRgb(value);
      if (rgb) {
        nextHex = rgbToHex(rgb.r, rgb.g, rgb.b);
        nextHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      }
    } else if (inputMode === 'rgb') {
      const rgb = parseRgb(value);
      if (rgb) {
        nextHex = rgbToHex(rgb.r, rgb.g, rgb.b);
        nextHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      }
    } else {
      const parsed = parseHsv(value);
      if (parsed) {
        nextHsv = parsed;
        const rgb = hsvToRgb(parsed.h, parsed.s, parsed.v);
        nextHex = rgbToHex(rgb.r, rgb.g, rgb.b);
      }
    }

    if (!nextHex || !nextHsv) {
      setInputError(true);
      return;
    }

    setInputError(false);
    setHsv(nextHsv);
    setCustomColor(nextHex);
    setCustomSelected(true);
    onPenColorChange(nextHex);
  };

  return (
    <div className="relative" ref={panelRef}>
      <div className="flex gap-1">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => {
              setCustomSelected(false);
              setCustomOpen(false);
              onPenColorChange(color);
            }}
            className={cn(
              'w-6 h-6 rounded-full border-2 transition-all',
              penColor === color ? 'border-foreground scale-110' : 'border-transparent'
            )}
            style={{ backgroundColor: color }}
          />
        ))}
        <button
          onClick={() => {
            setCustomOpen(true);
            setCustomSelected(true);
            onPenColorChange(customColor);
          }}
          className={cn(
            'w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center',
            customSelected ? 'border-foreground scale-110' : 'border-transparent'
          )}
          style={{ background: customGradient }}
          title="Custom color"
        >
          <span className="material-symbols-outlined text-[14px] text-background" aria-hidden="true">
            colorize
          </span>
        </button>
      </div>

      {customOpen && (
        <div className="absolute left-0 top-full mt-2 w-64 rounded-lg border border-border/60 bg-background/95 p-3 shadow-lg backdrop-blur z-50">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Custom</div>
          <div className="flex gap-3">
            <div className="flex flex-col gap-2">
              <div
                ref={spectrumRef}
                className="relative h-28 w-36 rounded-md border border-border/60 cursor-crosshair"
                style={{
                  backgroundImage: `
                    linear-gradient(to top, rgba(0,0,0,1), rgba(0,0,0,0)),
                    linear-gradient(to right, #ffffff, hsl(${hsv.h}, 100%, 50%))
                  `,
                }}
                onPointerDown={(event) => {
                  event.preventDefault();
                  handleSpectrumPointer(event.clientX, event.clientY);
                  (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  if ((event.currentTarget as HTMLDivElement).hasPointerCapture(event.pointerId)) {
                    handleSpectrumPointer(event.clientX, event.clientY);
                  }
                }}
                onPointerUp={(event) => {
                  if ((event.currentTarget as HTMLDivElement).hasPointerCapture(event.pointerId)) {
                    (event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId);
                  }
                }}
              >
                <div
                  className="absolute h-3 w-3 rounded-full border border-foreground shadow"
                  style={{
                    left: `${hsv.s * 100}%`,
                    top: `${(1 - hsv.v) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    background: customColor,
                  }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={360}
                value={Math.round(hsv.h)}
                onChange={(event) => applyHsv({ ...hsv, h: Number(event.target.value) })}
                className="h-2 w-36 appearance-none rounded-full"
                style={{
                  background:
                    'linear-gradient(90deg, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
                }}
              />
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                {(['hex', 'rgb', 'hsv'] as InputMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setInputMode(mode)}
                    className={cn('tool-button !p-1 text-[10px]', inputMode === mode && 'active')}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={inputValue}
                onChange={(event) => handleInputChange(event.target.value)}
                placeholder={inputMode === 'hex' ? '#RRGGBB' : inputMode === 'rgb' ? '255, 0, 0' : '0, 100, 100'}
                className={cn(
                  'w-full rounded-md border px-2 py-1 text-xs bg-background/70 shadow-inner',
                  inputError ? 'border-destructive text-destructive' : 'border-border/60 text-foreground'
                )}
              />
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span
                  className="inline-flex h-4 w-4 rounded-full border border-border/60"
                  style={{ backgroundColor: customColor }}
                />
                {inputError ? 'Invalid value' : 'Updates instantly'}
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              className="tool-button !px-3"
              onClick={() => setCustomOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
