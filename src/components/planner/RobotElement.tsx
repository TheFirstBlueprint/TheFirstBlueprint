import { useEffect, useRef } from 'react';
import { Robot } from '@/types/planner';
import { cn } from '@/lib/utils';

interface RobotElementProps {
  robot: Robot;
  dimensions: { width: number; height: number };
  displayName: string;
  isSelected: boolean;
  isMobile: boolean;
  onSelect: () => void;
  onPositionChange: (x: number, y: number) => void;
  onRotate: (delta: number) => void;
  onEdit: () => void;
  onRemove: () => void;
  onEjectSingle: () => void;
  onEjectAll: () => void;
  fieldBounds: { width: number; height: number };
  intakeActive: boolean;
  onToggleIntake: () => void;
  onCycleBalls: () => void;
  onRemoveHeldBall: (ballId: string) => void;
  isLocked: boolean;
  scale: number;
  disablePointerEvents?: boolean;
}

export const RobotElement = ({
  robot,
  dimensions,
  displayName,
  isSelected,
  isMobile,
  onSelect,
  onPositionChange,
  onRotate,
  onEdit,
  onRemove,
  onEjectSingle,
  onEjectAll,
  fieldBounds,
  intakeActive,
  onToggleIntake,
  onCycleBalls,
  onRemoveHeldBall,
  isLocked,
  scale,
  disablePointerEvents,
}: RobotElementProps) => {
  const positionRef = useRef(robot.position);
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null);
  const hasImage = Boolean(robot.imageDataUrl);
  const safeMargin = 10;
  const mobileActionSize = isMobile ? 28 : 0;
  const mobileUnderBotOffset = dimensions.height / 2 + safeMargin + 22;
  const mobileUnderBotSpacing = 20;
  useEffect(() => {
    positionRef.current = robot.position;
  }, [robot.position.x, robot.position.y]);
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target instanceof HTMLElement && e.target.closest('button')) return;
    e.stopPropagation();
    if (isLocked) return;
    onSelect();

    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    const normalizedScale = scale || 1;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!lastMouseRef.current) return;
      const dx = (moveEvent.clientX - lastMouseRef.current.x) / normalizedScale;
      const dy = (moveEvent.clientY - lastMouseRef.current.y) / normalizedScale;
      const basePosition = positionRef.current;
      const halfWidth = dimensions.width / 2;
      const halfHeight = dimensions.height / 2;
      const newX = Math.max(halfWidth, Math.min(fieldBounds.width - halfWidth, basePosition.x + dx));
      const newY = Math.max(halfHeight, Math.min(fieldBounds.height - halfHeight, basePosition.y + dy));
      onPositionChange(newX, newY);
      lastMouseRef.current = { x: moveEvent.clientX, y: moveEvent.clientY };
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      lastMouseRef.current = null;
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) return;
    onSelect();
  };

  return (
    <div
      className={cn(
        'absolute cursor-grab active:cursor-grabbing select-none touch-none',
        'transition-shadow duration-200'
      )}
      style={{
        left: robot.position.x - dimensions.width / 2,
        top: robot.position.y - dimensions.height / 2,
        width: dimensions.width,
        height: dimensions.height,
        transform: `rotate(${robot.rotation}deg)`,
        zIndex: isSelected ? 50 : 20,
        pointerEvents: disablePointerEvents ? 'none' : 'auto',
      }}
      onPointerDown={handlePointerDown}
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
            <span className="material-symbols-outlined text-[22px] text-foreground/90 -mt-1 robot-indicator" aria-hidden="true">
              north
            </span>
            <span className="text-xs font-mono text-foreground/90 robot-indicator">{displayName}</span>
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
          style={{ transform: 'translateY(-50%)' }}
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
          className="absolute left-1/2 top-full mt-1 text-xs font-mono text-foreground/90 robot-indicator"
          style={{ transform: `translateX(-50%) rotate(-${robot.rotation}deg)` }}
        >
          {displayName}
        </div>
      )}

      {/* Controls (shown when selected) */}
      {isSelected && (
        <>
          {isMobile ? (
            <>
              {[-mobileUnderBotSpacing / 2, mobileUnderBotSpacing / 2].map((offset, index) => (
                <button
                  key={`mobile-${index}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isLocked) return;
                    if (index === 0) {
                      onEdit();
                    } else {
                      onRemove();
                    }
                  }}
                  className={cn(
                    'tool-button !p-1 absolute mobile-robot-action-button',
                    index === 1 && 'text-destructive'
                  )}
                  title={index === 0 ? 'Edit robot' : 'Remove robot'}
                  style={{
                    left: '50%',
                    top: '50%',
                    width: mobileActionSize,
                    height: mobileActionSize,
                    transform: `translate(-50%, -50%) translate(${offset}px, ${mobileUnderBotOffset}px)`,
                    transformOrigin: 'center center',
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                    {index === 0 ? 'edit' : 'delete'}
                  </span>
                </button>
              ))}
            </>
          ) : (
            <div
              className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-1"
              style={{ transform: 'translateX(-50%)', transformOrigin: 'center center' }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => { e.stopPropagation(); if (!isLocked) onRotate(-45); }}
                className="tool-button !p-1"
                title="Rotate left"
              >
                <span className="material-symbols-outlined text-[16px] scale-x-[-1]" aria-hidden="true">
                  rotate_right
                </span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); if (!isLocked) onRotate(45); }}
                className="tool-button !p-1"
                title="Rotate right"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  rotate_right
                </span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); if (!isLocked) onEdit(); }}
                className="tool-button !p-1"
                title="Edit robot"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  edit
                </span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); if (!isLocked) onToggleIntake(); }}
                className={cn('tool-button !p-1', intakeActive && 'active')}
                title="Toggle intake (I)"
              >
                I
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); if (!isLocked) onEjectAll(); }}
                className="tool-button !p-1"
                title="Shoot all balls (K)"
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
                <button
                  onClick={(e) => { e.stopPropagation(); if (!isLocked) onEjectSingle(); }}
                  className="tool-button !p-1 text-ball-green"
                  title="Shoot one ball (O)"
                >
                  O
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); if (!isLocked) onRemove(); }}
                className="tool-button !p-1 text-destructive"
                title="Remove robot"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  delete
                </span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

