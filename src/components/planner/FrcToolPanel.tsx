import { Tool, Alliance } from '@/types/planner';
import { cn } from '@/lib/utils';

type ThemeMode = 'base' | 'dark' | 'light' | 'sharkans';

interface FrcToolPanelProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  penColor: string;
  onPenColorChange: (color: string) => void;
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  onAddRobot: (alliance: Alliance) => string | null;
  canAddRedRobot: boolean;
  canAddBlueRobot: boolean;
  onClearDrawings: () => void;
  onClearFuel: () => void;
  onClearRobots: () => void;
  onResetField: () => void;
  onSetupField: () => void;
  onExport: () => void;
  onImport: () => void;
}

const PEN_COLORS = ['#2b76d2', '#f97316', '#eab308', '#22c55e', '#ec4899', '#ffffff'];

export const FrcToolPanel = ({
  activeTool,
  onToolChange,
  penColor,
  onPenColorChange,
  themeMode,
  onThemeModeChange,
  onAddRobot,
  canAddRedRobot,
  canAddBlueRobot,
  onClearDrawings,
  onClearFuel,
  onClearRobots,
  onResetField,
  onSetupField,
  onExport,
  onImport,
}: FrcToolPanelProps) => {
  const isDrawTool =
    activeTool === 'pen' ||
    activeTool === 'dotted' ||
    activeTool === 'arrow' ||
    activeTool === 'box' ||
    activeTool === 'rectangle' ||
    activeTool === 'circle' ||
    activeTool === 'arc';

  return (
    <div className="flex flex-col gap-4">
      <div className="panel">
        <div className="panel-header">Tools</div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onToolChange('select')}
            className={cn('tool-button', activeTool === 'select' && 'active')}
            title="Select (S)"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              mouse
            </span>
          </button>
          <button
            onClick={() => onToolChange('pen')}
            className={cn('tool-button', activeTool === 'pen' && 'active')}
            title="Pen (P)"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              edit
            </span>
          </button>
          <button
            onClick={() => onToolChange('dotted')}
            className={cn('tool-button hidden md:flex', activeTool === 'dotted' && 'active')}
            title="Dotted line"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              remove
            </span>
          </button>
          <button
            onClick={() => onToolChange('arrow')}
            className={cn('tool-button hidden md:flex', activeTool === 'arrow' && 'active')}
            title="Arrow line"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              arrow_right_alt
            </span>
          </button>
          <button
            onClick={() => onToolChange('box')}
            className={cn('tool-button hidden md:flex', activeTool === 'box' && 'active')}
            title="Box"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              crop_square
            </span>
          </button>
          <button
            onClick={() => onToolChange('rectangle')}
            className={cn('tool-button hidden md:flex', activeTool === 'rectangle' && 'active')}
            title="Rectangle"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              rectangle
            </span>
          </button>
          <button
            onClick={() => onToolChange('circle')}
            className={cn('tool-button hidden md:flex', activeTool === 'circle' && 'active')}
            title="Circle"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              radio_button_unchecked
            </span>
          </button>
          <button
            onClick={() => onToolChange('arc')}
            className={cn('tool-button hidden md:flex', activeTool === 'arc' && 'active')}
            title="Arc"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 18A12 12 0 0 1 18 6" />
            </svg>
          </button>
          <button
            onClick={() => onToolChange('eraser')}
            className={cn('tool-button', activeTool === 'eraser' && 'active')}
            title="Eraser (E)"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              ink_eraser
            </span>
          </button>
        </div>

        {isDrawTool && (
          <div className="mt-3">
            <div className="text-xs text-muted-foreground mb-1">Pen Color</div>
            <div className="flex gap-1">
              {PEN_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => onPenColorChange(color)}
                  className={cn(
                    'w-6 h-6 rounded-full border-2 transition-all',
                    penColor === color ? 'border-foreground scale-110' : 'border-transparent'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="panel md:hidden">
        <div className="panel-header">Page Color</div>
        <select
          value={themeMode}
          onChange={(event) => onThemeModeChange(event.target.value as ThemeMode)}
          className="w-full rounded-md border border-border/60 bg-background/70 px-3 py-2 text-xs text-foreground shadow-inner shadow-black/20"
        >
          <option value="base">Base</option>
          <option value="dark">Dark Tactical</option>
          <option value="light">Light</option>
          <option value="sharkans">Sharkans</option>
        </select>
      </div>

      <div className="panel">
        <div className="panel-header">Robots</div>
        <div className="flex gap-2">
          <button
            onClick={() => onAddRobot('red')}
            disabled={!canAddRedRobot}
            className={cn(
              'tool-button flex-1 gap-1',
              !canAddRedRobot && 'opacity-50 cursor-not-allowed'
            )}
            title="Add red alliance robot"
          >
            <span className="material-symbols-outlined text-[18px] text-alliance-red" aria-hidden="true">
              crop_square
            </span>
            <span className="text-xs">Red</span>
          </button>
          <button
            onClick={() => onAddRobot('blue')}
            disabled={!canAddBlueRobot}
            className={cn(
              'tool-button flex-1 gap-1',
              !canAddBlueRobot && 'opacity-50 cursor-not-allowed'
            )}
            title="Add blue alliance robot"
          >
            <span className="material-symbols-outlined text-[18px] text-alliance-blue" aria-hidden="true">
              crop_square
            </span>
            <span className="text-xs">Blue</span>
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">Field Setup</div>
        <button onClick={onSetupField} className="tool-button gap-1">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            auto_fix_high
          </span>
          <span className="text-xs landscape-hide-text">Setup Fuel</span>
        </button>
      </div>

      <div className="panel">
        <div className="panel-header">Clear</div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onClearDrawings} className="tool-button gap-1">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              edit
            </span>
            <span className="text-xs landscape-hide-text">Drawings</span>
          </button>
          <button onClick={onClearFuel} className="tool-button gap-1">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              local_fire_department
            </span>
            <span className="text-xs landscape-hide-text">Fuel</span>
          </button>
          <button onClick={onClearRobots} className="tool-button gap-1">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              crop_square
            </span>
            <span className="text-xs landscape-hide-text">Robots</span>
          </button>
          <button onClick={onResetField} className="tool-button gap-1 text-destructive col-span-2">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              restart_alt
            </span>
            <span className="text-xs landscape-hide-text">Reset Field</span>
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">Save / Load</div>
        <div className="flex gap-2">
          <button onClick={onExport} className="tool-button flex-1 gap-1">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              download
            </span>
            <span className="text-xs landscape-hide-text">Export</span>
          </button>
          <button onClick={onImport} className="tool-button flex-1 gap-1">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              upload
            </span>
            <span className="text-xs landscape-hide-text">Import</span>
          </button>
        </div>
      </div>
    </div>
  );
};
