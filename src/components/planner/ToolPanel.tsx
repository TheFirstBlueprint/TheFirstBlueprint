import { Tool, BallColor, Alliance } from '@/types/planner';
import { cn } from '@/lib/utils';
import {
  MousePointer2,
  Pencil,
  Eraser,
  Circle,
  Square,
  Trash2,
  RotateCcw,
  Download,
  Upload,
} from 'lucide-react';

interface ToolPanelProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  penColor: string;
  onPenColorChange: (color: string) => void;
  onAddBall: (color: BallColor) => void;
  onAddRobot: (alliance: Alliance) => void;
  canAddRobot: boolean;
  onClearDrawings: () => void;
  onClearBalls: () => void;
  onClearRobots: () => void;
  onResetField: () => void;
  onExport: () => void;
  onImport: () => void;
}

const PEN_COLORS = ['#22d3ee', '#f97316', '#eab308', '#22c55e', '#ec4899', '#ffffff'];

export const ToolPanel = ({
  activeTool,
  onToolChange,
  penColor,
  onPenColorChange,
  onAddBall,
  onAddRobot,
  canAddRobot,
  onClearDrawings,
  onClearBalls,
  onClearRobots,
  onResetField,
  onExport,
  onImport,
}: ToolPanelProps) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Drawing Tools */}
      <div className="panel">
        <div className="panel-header">Tools</div>
        <div className="flex gap-2">
          <button
            onClick={() => onToolChange('select')}
            className={cn('tool-button', activeTool === 'select' && 'active')}
            title="Select (S)"
          >
            <MousePointer2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToolChange('pen')}
            className={cn('tool-button', activeTool === 'pen' && 'active')}
            title="Pen (P)"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToolChange('eraser')}
            className={cn('tool-button', activeTool === 'eraser' && 'active')}
            title="Eraser (E)"
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>

        {activeTool === 'pen' && (
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

      {/* Add Elements */}
      <div className="panel">
        <div className="panel-header">Add Elements</div>
        
        <div className="mb-3">
          <div className="text-xs text-muted-foreground mb-1">Balls</div>
          <div className="flex gap-2">
            <button
              onClick={() => onAddBall('green')}
              className="tool-button flex-1 gap-1"
              title="Add green ball"
            >
              <Circle className="w-4 h-4 fill-ball-green text-ball-green" />
              <span className="text-xs">Green</span>
            </button>
            <button
              onClick={() => onAddBall('purple')}
              className="tool-button flex-1 gap-1"
              title="Add purple ball"
            >
              <Circle className="w-4 h-4 fill-ball-purple text-ball-purple" />
              <span className="text-xs">Purple</span>
            </button>
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1">Robots</div>
          <div className="flex gap-2">
            <button
              onClick={() => onAddRobot('red')}
              disabled={!canAddRobot}
              className={cn(
                'tool-button flex-1 gap-1',
                !canAddRobot && 'opacity-50 cursor-not-allowed'
              )}
              title="Add red alliance robot"
            >
              <Square className="w-4 h-4 fill-alliance-red text-alliance-red" />
              <span className="text-xs">Red</span>
            </button>
            <button
              onClick={() => onAddRobot('blue')}
              disabled={!canAddRobot}
              className={cn(
                'tool-button flex-1 gap-1',
                !canAddRobot && 'opacity-50 cursor-not-allowed'
              )}
              title="Add blue alliance robot"
            >
              <Square className="w-4 h-4 fill-alliance-blue text-alliance-blue" />
              <span className="text-xs">Blue</span>
            </button>
          </div>
        </div>
      </div>

      {/* Clear Controls */}
      <div className="panel">
        <div className="panel-header">Clear</div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onClearDrawings} className="tool-button gap-1">
            <Pencil className="w-3 h-3" />
            <span className="text-xs">Drawings</span>
          </button>
          <button onClick={onClearBalls} className="tool-button gap-1">
            <Circle className="w-3 h-3" />
            <span className="text-xs">Balls</span>
          </button>
          <button onClick={onClearRobots} className="tool-button gap-1">
            <Square className="w-3 h-3" />
            <span className="text-xs">Robots</span>
          </button>
          <button onClick={onResetField} className="tool-button gap-1 text-destructive">
            <RotateCcw className="w-3 h-3" />
            <span className="text-xs">Reset All</span>
          </button>
        </div>
      </div>

      {/* Export/Import */}
      <div className="panel">
        <div className="panel-header">Save / Load</div>
        <div className="flex gap-2">
          <button onClick={onExport} className="tool-button flex-1 gap-1">
            <Download className="w-4 h-4" />
            <span className="text-xs">Export</span>
          </button>
          <button onClick={onImport} className="tool-button flex-1 gap-1">
            <Upload className="w-4 h-4" />
            <span className="text-xs">Import</span>
          </button>
        </div>
      </div>
    </div>
  );
};
