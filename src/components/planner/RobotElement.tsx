import { Robot } from '@/types/planner';
import { cn } from '@/lib/utils';
import { RotateCw, ChevronUp, Trash2, Pencil } from 'lucide-react';

interface RobotElementProps {
  robot: Robot;
  dimensions: { width: number; height: number };
  displayName: string;
  isSelected: boolean;
  onSelect: () => void;
  onPositionChange: (x: number, y: number) => void;
  onRotate: (delta: number) => void;
  onEdit: () => void;
  onRemove: () => void;
  onEjectSingle: () => void;
  onEjectAll: () => void;
  fieldBounds: { width: number; height: number };
  intakeActive: boolean;
  outtakeActive: boolean;
  onToggleIntake: () => void;
  onToggleOuttake: () => void;
  onCycleBalls: () => void;
  onRemoveHeldBall: (ballId: string) => void;
  isLocked: boolean;
}

export const RobotElement = ({
  robot,
  dimensions,
  displayName,
  isSelected,
  onSelect,
  onPositionChange,
  onRotate,
  onEdit,
  onRemove,
  onEjectSingle,
  onEjectAll,
  fieldBounds,
  intakeActive,
  outtakeActive,
  onToggleIntake,
  onToggleOuttake,
  onCycleBalls,
  onRemoveHeldBall,
  isLocked,
}: RobotElementProps) => {
  const hasImage = Boolean(robot.imageDataUrl);
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) return;
    onSelect();

    const startX = e.clientX;
    const startY = e.clientY;
    const startPosX = robot.position.x;
    const startPosY = robot.position.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const halfWidth = dimensions.width / 2;
      const halfHeight = dimensions.height / 2;
      const newX = Math.max(halfWidth, Math.min(fieldBounds.width - halfWidth, startPosX + dx));
      const newY = Math.max(halfHeight, Math.min(fieldBounds.height - halfHeight, startPosY + dy));
      onPositionChange(newX, newY);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) return;
    onSelect();
  };

  return (
    <div
      className={cn(
        'absolute cursor-grab active:cursor-grabbing select-none',
        'transition-shadow duration-200'
      )}
      style={{
        left: robot.position.x - dimensions.width / 2,
        top: robot.position.y - dimensions.height / 2,
        width: dimensions.width,
        height: dimensions.height,
        transform: `rotate(${robot.rotation}deg)`,
        zIndex: isSelected ? 50 : 20,
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      {/* Robot body */}
      <div
        className={cn(
          'w-full h-full rounded-md border-2 flex items-center justify-center overflow-hidden',
          'transition-all duration-200',
          hasImage
            ? 'bg-transparent border-transparent'
            : robot.alliance === 'red'
              ? 'bg-alliance-red/80 border-alliance-red'
              : 'bg-alliance-blue/80 border-alliance-blue',
          isSelected && (robot.alliance === 'red' ? 'glow-alliance-red' : 'glow-alliance-blue')
        )}
      >
        {hasImage ? (
          <>
            <div className="absolute inset-0">
              <img
                src={robot.imageDataUrl ?? undefined}
                alt={displayName || 'Robot'}
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <ChevronUp className="w-6 h-6 text-foreground/90 -mt-1" />
            <span className="text-xs font-mono text-foreground/90">{displayName}</span>
          </div>
        )}

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
      {robot.heldBalls.length > 0 && (
        <div
          className="absolute top-1/2 -right-4 flex flex-col gap-1"
          style={{ transform: `translateY(-50%) rotate(-${robot.rotation}deg)` }}
        >
          {robot.heldBalls.map((ball, index) => (
            <button
              key={ball.id}
              type="button"
              className={cn(
                'w-3 h-3 rounded-full border border-border',
                ball.color === 'green' ? 'bg-ball-green' : 'bg-ball-purple'
              )}
              title="Remove ball"
              onClick={(e) => {
                e.stopPropagation();
                if (!isLocked) {
                  onRemoveHeldBall(ball.id);
                }
              }}
            />
          ))}
        </div>
      )}
      {hasImage && displayName && (
        <div
          className="absolute left-1/2 top-full mt-1 text-xs font-mono text-foreground/90"
          style={{ transform: `translateX(-50%) rotate(-${robot.rotation}deg)` }}
        >
          {displayName}
        </div>
      )}

      {/* Controls (shown when selected) */}
      {isSelected && (
        <div
          className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-1"
          style={{ transform: `translateX(-50%) rotate(-${robot.rotation}deg)` }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); if (!isLocked) onRotate(-45); }}
            className="tool-button !p-1"
            title="Rotate left"
          >
            <RotateCw className="w-3 h-3 scale-x-[-1]" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); if (!isLocked) onRotate(45); }}
            className="tool-button !p-1"
            title="Rotate right"
          >
            <RotateCw className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); if (!isLocked) onEdit(); }}
            className="tool-button !p-1"
            title="Edit robot"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); if (!isLocked) onToggleIntake(); }}
            className={cn('tool-button !p-1', intakeActive && 'active')}
            title="Toggle intake (I)"
          >
            I
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); if (!isLocked) onToggleOuttake(); }}
            className={cn('tool-button !p-1', outtakeActive && 'active')}
            title="Toggle rapid fire (K)"
          >
            K
          </button>
          {robot.heldBalls.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); if (!isLocked) onCycleBalls(); }}
              className="tool-button !p-1"
              title="Cycle balls (L)"
            >
              L
            </button>
          )}
          {robot.heldBalls.length > 0 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); if (!isLocked) onEjectSingle(); }}
                className="tool-button !p-1 text-ball-green"
                title="Shoot one ball (O)"
              >
                O
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); if (!isLocked) onEjectAll(); }}
                className="tool-button !p-1 text-ball-purple"
                title="Eject all balls"
              >
                ★
              </button>
            </>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); if (!isLocked) onRemove(); }}
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
