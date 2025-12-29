import { Tool, BallColor, Alliance } from '@/types/planner';
import { cn } from '@/lib/utils';
import {
  MousePointer2,
  Pencil,
  Minus,
  ArrowRight,
  Eraser,
  Circle,
  Square,
  RectangleHorizontal,
  Trash2,
  RotateCcw,
  Wand2,
  Download,
  Upload,
  Users,
} from 'lucide-react';

interface ToolPanelProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  penColor: string;
  onPenColorChange: (color: string) => void;
  onAddBall: (color: BallColor) => void;
  onAddRobot: (alliance: Alliance) => void;
  canAddRedRobot: boolean;
  canAddBlueRobot: boolean;
  onClearDrawings: () => void;
  onClearBalls: () => void;
  onClearRobots: () => void;
  onResetField: () => void;
  onSetupField: () => void;
  onSetupRobots: () => void;
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
  canAddRedRobot,
  canAddBlueRobot,
  onClearDrawings,
  onClearBalls,
  onClearRobots,
  onResetField,
  onSetupField,
  onSetupRobots,
  onExport,
  onImport,
}: ToolPanelProps) => {
  const isDrawTool =
    activeTool === 'pen' ||
    activeTool === 'dotted' ||
    activeTool === 'arrow' ||
    activeTool === 'box' ||
    activeTool === 'rectangle' ||
    activeTool === 'circle';

  return (
    <div className="flex flex-col gap-4">
      {/* Drawing Tools */}
      <div className="panel">
        <div className="panel-header">Tools</div>
        <div className="grid grid-cols-3 gap-2">
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
            onClick={() => onToolChange('dotted')}
            className={cn('tool-button', activeTool === 'dotted' && 'active')}
            title="Dotted line (D)"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToolChange('arrow')}
            className={cn('tool-button', activeTool === 'arrow' && 'active')}
            title="Arrow line (A)"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToolChange('box')}
            className={cn('tool-button', activeTool === 'box' && 'active')}
            title="Box"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToolChange('rectangle')}
            className={cn('tool-button', activeTool === 'rectangle' && 'active')}
            title="Rectangle"
          >
            <RectangleHorizontal className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToolChange('circle')}
            className={cn('tool-button', activeTool === 'circle' && 'active')}
            title="Circle"
          >
            <Circle className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToolChange('eraser')}
            className={cn('tool-button', activeTool === 'eraser' && 'active')}
            title="Eraser (E)"
          >
            <Eraser className="w-4 h-4" />
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
              disabled={!canAddRedRobot}
              className={cn(
                'tool-button flex-1 gap-1',
                !canAddRedRobot && 'opacity-50 cursor-not-allowed'
              )}
              title="Add red alliance robot"
            >
              <Square className="w-4 h-4 fill-alliance-red text-alliance-red" />
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
              <Square className="w-4 h-4 fill-alliance-blue text-alliance-blue" />
              <span className="text-xs">Blue</span>
            </button>
          </div>
        </div>
      </div>

      {/* Field Setup */}
      <div className="panel">
        <div className="panel-header">Field Setup</div>
        <button onClick={onSetupField} className="tool-button gap-1">
          <Wand2 className="w-4 h-4" />
          <span className="text-xs">Place Artifacts</span>
        </button>
        <button onClick={onSetupRobots} className="tool-button gap-1 mt-2">
          <Users className="w-4 h-4" />
          <span className="text-xs">Place Sample Robots</span>
        </button>
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
