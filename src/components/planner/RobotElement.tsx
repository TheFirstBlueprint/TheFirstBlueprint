import { Robot } from '@/types/planner';
import { cn } from '@/lib/utils';
import { RotateCw, ChevronUp, Trash2 } from 'lucide-react';

interface RobotElementProps {
  robot: Robot;
  isSelected: boolean;
  onSelect: () => void;
  onPositionChange: (x: number, y: number) => void;
  onRotate: (delta: number) => void;
  onRemove: () => void;
  onEjectSingle: () => void;
  onEjectAll: () => void;
  fieldBounds: { width: number; height: number };
}

export const RobotElement = ({
  robot,
  isSelected,
  onSelect,
  onPositionChange,
  onRotate,
  onRemove,
  onEjectSingle,
  onEjectAll,
  fieldBounds,
}: RobotElementProps) => {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();

    const startX = e.clientX;
    const startY = e.clientY;
    const startPosX = robot.position.x;
    const startPosY = robot.position.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const newX = Math.max(robot.size / 2, Math.min(fieldBounds.width - robot.size / 2, startPosX + dx));
      const newY = Math.max(robot.size / 2, Math.min(fieldBounds.height - robot.size / 2, startPosY + dy));
      onPositionChange(newX, newY);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className={cn(
        'absolute cursor-grab active:cursor-grabbing select-none',
        'transition-shadow duration-200'
      )}
      style={{
        left: robot.position.x - robot.size / 2,
        top: robot.position.y - robot.size / 2,
        width: robot.size,
        height: robot.size,
        transform: `rotate(${robot.rotation}deg)`,
        zIndex: isSelected ? 50 : 20,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Robot body */}
      <div
        className={cn(
          'w-full h-full rounded-md border-2 flex items-center justify-center',
          'transition-all duration-200',
          robot.alliance === 'red'
            ? 'bg-alliance-red/80 border-alliance-red'
            : 'bg-alliance-blue/80 border-alliance-blue',
          isSelected && (robot.alliance === 'red' ? 'glow-alliance-red' : 'glow-alliance-blue')
        )}
      >
        {/* Orientation indicator */}
        <ChevronUp className="w-6 h-6 text-foreground/90" />

        {/* Ball count indicator */}
        {robot.heldBalls.length > 0 && (
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center text-xs font-mono"
            style={{ transform: `rotate(-${robot.rotation}deg)` }}
          >
            {robot.heldBalls.length}
          </div>
        )}
      </div>

      {/* Controls (shown when selected) */}
      {isSelected && (
        <div
          className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-1"
          style={{ transform: `translateX(-50%) rotate(-${robot.rotation}deg)` }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onRotate(-15); }}
            className="tool-button !p-1"
            title="Rotate left"
          >
            <RotateCw className="w-3 h-3 scale-x-[-1]" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRotate(15); }}
            className="tool-button !p-1"
            title="Rotate right"
          >
            <RotateCw className="w-3 h-3" />
          </button>
          {robot.heldBalls.length > 0 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onEjectSingle(); }}
                className="tool-button !p-1 text-ball-green"
                title="Eject one ball"
              >
                1
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onEjectAll(); }}
                className="tool-button !p-1 text-ball-purple"
                title="Eject all balls"
              >
                ★
              </button>
            </>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="tool-button !p-1 text-destructive"
            title="Remove robot"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
