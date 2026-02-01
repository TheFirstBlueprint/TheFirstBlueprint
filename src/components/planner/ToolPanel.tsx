import type { CSSProperties } from 'react';
import { Tool, BallColor, Alliance } from '@/types/planner';
import { cn } from '@/lib/utils';

type ThemeMode = 'base' | 'dark' | 'light' | 'sharkans';

interface ToolPanelProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  penColor: string;
  onPenColorChange: (color: string) => void;
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  motif: string;
  motifs: string[];
  onMotifChange: (motif: string) => void;
  onMotifRandomize: () => void;
  onAddHumanPlayerBall: (alliance: Alliance, color: BallColor) => void;
  onAddRobot: (alliance: Alliance) => string | null;
  canAddRedRobot: boolean;
  canAddBlueRobot: boolean;
  isRedDoubleParked: boolean;
  isBlueDoubleParked: boolean;
  onClearDrawings: () => void;
  onClearBalls: () => void;
  onClearRobots: () => void;
  onResetField: () => void;
  onSetupField: () => void;
  onSetupRobots: () => void;
  onExport: () => void;
  onImport: () => void;
  presets: { id: string; label: string; path: string }[];
  onPresetLoad: (preset: { id: string; label: string; path: string }) => void;
  showSetupCoachmark?: boolean;
  onDismissSetupCoachmark?: () => void;
  panelColumns?: 1 | 2;
}

const PEN_COLORS = ['#2b76d2', '#f97316', '#eab308', '#22c55e', '#ec4899', '#ffffff'];

export const ToolPanel = ({
  activeTool,
  onToolChange,
  penColor,
  onPenColorChange,
  themeMode,
  onThemeModeChange,
  motif,
  motifs,
  onMotifChange,
  onMotifRandomize,
  onAddHumanPlayerBall,
  onAddRobot,
  canAddRedRobot,
  canAddBlueRobot,
  isRedDoubleParked,
  isBlueDoubleParked,
  onClearDrawings,
  onClearBalls,
  onClearRobots,
  onResetField,
  onSetupField,
  onSetupRobots,
  onExport,
  onImport,
  presets,
  onPresetLoad,
  onDismissSetupCoachmark,
  panelColumns = 1,
}: ToolPanelProps) => {
  const handleSetupFieldClick = () => {
    onSetupField();
    onDismissSetupCoachmark?.();
  };

  const isDrawTool =
    activeTool === 'pen' ||
    activeTool === 'dotted' ||
    activeTool === 'arrow' ||
    activeTool === 'box' ||
    activeTool === 'rectangle' ||
    activeTool === 'circle' ||
    activeTool === 'arc';

  return (
    <div
      className="sidebar-panel-array"
      style={{ '--sidebar-panel-columns': panelColumns } as CSSProperties}
    >
      {/* Drawing Tools */}
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
            className={cn('tool-button mobile-hide', activeTool === 'dotted' && 'active')}
            title="Dotted line"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              remove
            </span>
          </button>
          <button
            onClick={() => onToolChange('arrow')}
            className={cn('tool-button mobile-hide', activeTool === 'arrow' && 'active')}
            title="Arrow line"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              arrow_right_alt
            </span>
          </button>
          <button
            onClick={() => onToolChange('box')}
            className={cn('tool-button mobile-hide', activeTool === 'box' && 'active')}
            title="Box"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              crop_square
            </span>
          </button>
          <button
            onClick={() => onToolChange('rectangle')}
            className={cn('tool-button mobile-hide', activeTool === 'rectangle' && 'active')}
            title="Rectangle"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              rectangle
            </span>
          </button>
          <button
            onClick={() => onToolChange('circle')}
            className={cn('tool-button mobile-hide', activeTool === 'circle' && 'active')}
            title="Circle"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              radio_button_unchecked
            </span>
          </button>
          <button
            onClick={() => onToolChange('arc')}
            className={cn('tool-button mobile-hide', activeTool === 'arc' && 'active')}
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

      {/* Presets */}
      <div className="panel">
        <div className="panel-header">Presets</div>
        {presets.length ? (
          <div className="grid gap-2">
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  if (preset.id === 'empty-field') {
                    handleSetupFieldClick();
                    return;
                  }
                  onPresetLoad(preset);
                }}
                className="tool-button w-full"
                title={preset.id === 'empty-field' ? 'Setup Field' : `Load ${preset.label}`}
                data-planner-setup={preset.id === 'empty-field' ? 'true' : undefined}
              >
                <span className="text-xs">{preset.id === 'empty-field' ? 'Setup Field' : preset.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">No presets configured.</div>
        )}
      </div>

      {/* Motif */}
      <div className="panel">
        <div className="panel-header">Motif</div>
        <div className="grid grid-cols-3 gap-2">
          {motifs.map((option) => (
            <button
              key={option}
              onClick={() => onMotifChange(option)}
              className={cn('tool-button', motif === option && 'active')}
              title={`Set motif ${option}`}
            >
              <span className="text-xs font-mono">{option}</span>
            </button>
          ))}
          <button
            onClick={onMotifRandomize}
            className="tool-button mobile-only-flex"
            title="Randomize motif"
            aria-label="Randomize motif"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              shuffle
            </span>
          </button>
        </div>
        <button
          onClick={onMotifRandomize}
          className="tool-button mt-2 w-full mobile-hide"
          title="Randomize motif"
        >
          Randomize
        </button>
      </div>

      {/* Add Elements */}
      <div className="panel mobile-hide">
        <div className="panel-header">Add Elements</div>

        <div className="mb-3">
          <div className="text-xs text-muted-foreground mb-1">Human Player Zone</div>
          <div className="space-y-2">
            <div>
              <div className="text-xs text-foreground mb-1">Blue</div>
              <div className="flex gap-2">
                <button
                  onClick={() => onAddHumanPlayerBall('blue', 'green')}
                  className="tool-button flex-1 gap-1"
                  title="Add green ball to blue zone"
                >
                  <span className="material-symbols-outlined text-[16px] text-ball-green" aria-hidden="true">
                    fiber_manual_record
                  </span>
                  <span className="text-xs">Green</span>
                </button>
                <button
                  onClick={() => onAddHumanPlayerBall('blue', 'purple')}
                  className="tool-button flex-1 gap-1"
                  title="Add purple ball to blue zone"
                >
                  <span className="material-symbols-outlined text-[16px] text-ball-purple" aria-hidden="true">
                    fiber_manual_record
                  </span>
                  <span className="text-xs">Purple</span>
                </button>
              </div>
            </div>
            <div>
              <div className="text-xs text-foreground mb-1">Red</div>
              <div className="flex gap-2">
                <button
                  onClick={() => onAddHumanPlayerBall('red', 'green')}
                  className="tool-button flex-1 gap-1"
                  title="Add green ball to red zone"
                >
                  <span className="material-symbols-outlined text-[16px] text-ball-green" aria-hidden="true">
                    fiber_manual_record
                  </span>
                  <span className="text-xs">Green</span>
                </button>
                <button
                  onClick={() => onAddHumanPlayerBall('red', 'purple')}
                  className="tool-button flex-1 gap-1"
                  title="Add purple ball to red zone"
                >
                  <span className="material-symbols-outlined text-[16px] text-ball-purple" aria-hidden="true">
                    fiber_manual_record
                  </span>
                  <span className="text-xs">Purple</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1">Robots</div>
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
          <div className="mt-2 flex justify-between text-[10px] font-mono uppercase tracking-wide">
            <span className={cn('text-alliance-red', !isRedDoubleParked && 'opacity-40')}>
              {isRedDoubleParked ? 'Double Parked' : ' '}
            </span>
            <span className={cn('text-alliance-blue', !isBlueDoubleParked && 'opacity-40')}>
              {isBlueDoubleParked ? 'Double Parked' : ' '}
            </span>
          </div>
        </div>
      </div>

      {/* Clear Controls */}
      <div className="panel">
        <div className="panel-header">Clear</div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onClearDrawings} className="tool-button gap-1" title="Clear drawings" aria-label="Clear drawings">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              edit
            </span>
            <span className="text-xs mobile-hide">Drawings</span>
          </button>
          <button onClick={onClearBalls} className="tool-button gap-1" title="Clear balls" aria-label="Clear balls">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              fiber_manual_record
            </span>
            <span className="text-xs mobile-hide">Balls</span>
          </button>
          <button onClick={onClearRobots} className="tool-button gap-1" title="Clear robots" aria-label="Clear robots">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              crop_square
            </span>
            <span className="text-xs mobile-hide">Robots</span>
          </button>
          <button onClick={onResetField} className="tool-button gap-1 text-destructive" title="Reset all" aria-label="Reset all">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              restart_alt
            </span>
            <span className="text-xs mobile-hide">Reset All</span>
          </button>
        </div>
      </div>

      <div className="panel mobile-only-block">
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

      {/* Export/Import */}
      <div className="panel">
        <div className="panel-header">Save / Load</div>
        <div className="flex gap-2">
          <button onClick={onExport} className="tool-button flex-1 gap-1">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              download
            </span>
            <span className="text-xs mobile-hide">Export</span>
          </button>
          <button onClick={onImport} className="tool-button flex-1 gap-1">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              upload
            </span>
            <span className="text-xs mobile-hide">Import</span>
          </button>
        </div>
      </div>
    </div>
  );
};
