import { memo, useEffect, useRef } from 'react';
import { FrcRobot } from '@/types/frcPlanner';
import { cn } from '@/lib/utils';

interface FrcRobotElementProps {
  robot: FrcRobot;
  dimensions: { width: number; height: number };
  displayName: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onPositionChange: (id: string, x: number, y: number) => void;
  onRotate: (id: string, delta: number) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  isLocked: boolean;
  scale: number;
  disablePointerEvents?: boolean;
}

const FrcRobotElementComponent = ({
  robot,
  dimensions,
  displayName,
  isSelected,
  onSelect,
  onPositionChange,
  onRotate,
  onEdit,
  onRemove,
  isLocked,
  scale,
  disablePointerEvents,
}: FrcRobotElementProps) => {
  const positionRef = useRef(robot.position);
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null);
  const pendingPositionRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const hasImage = Boolean(robot.imageDataUrl);
  const badgeScale = Math.min(1.4, Math.max(0.85, 1 / (scale || 1)));

  useEffect(() => {
    positionRef.current = robot.position;
  }, [robot.position.x, robot.position.y]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target instanceof HTMLElement && e.target.closest('button')) return;
    e.stopPropagation();
    if (isLocked) return;
    onSelect(robot.id);

    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    const normalizedScale = scale || 1;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

    const flushPendingPosition = () => {
      rafRef.current = null;
      const pending = pendingPositionRef.current;
      if (!pending) return;
      pendingPositionRef.current = null;
      onPositionChange(robot.id, pending.x, pending.y);
    };

    const scheduleFlush = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(flushPendingPosition);
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!lastMouseRef.current) return;
      const dx = (moveEvent.clientX - lastMouseRef.current.x) / normalizedScale;
      const dy = (moveEvent.clientY - lastMouseRef.current.y) / normalizedScale;
      const basePosition = positionRef.current;
      pendingPositionRef.current = {
        x: basePosition.x + dx,
        y: basePosition.y + dy,
      };
      scheduleFlush();
      lastMouseRef.current = { x: moveEvent.clientX, y: moveEvent.clientY };
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const pending = pendingPositionRef.current;
      if (pending) {
        pendingPositionRef.current = null;
        onPositionChange(robot.id, pending.x, pending.y);
      }
      lastMouseRef.current = null;
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) return;
    onSelect(robot.id);
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
          <div className="absolute inset-0">
            <img
              src={robot.imageDataUrl ?? undefined}
              alt={displayName || 'Robot'}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-[22px] text-foreground/90 -mt-1 robot-indicator" aria-hidden="true">
              north
            </span>
            <span className="text-xs font-mono text-foreground/90 robot-indicator">{displayName}</span>
          </div>
        )}
      </div>
      <div
        className="absolute -top-2 -right-2 rounded-full px-2 py-0.5 text-[10px] font-mono text-black bg-amber-300 border border-amber-500 shadow"
        style={{ transform: `rotate(-${robot.rotation}deg) scale(${badgeScale})` }}
        aria-label={`Fuel count ${robot.fuelCount}`}
      >
        {robot.fuelCount}
      </div>
      {hasImage && displayName && (
        <div
          className="absolute left-1/2 top-full mt-1 text-xs font-mono text-foreground/90 robot-indicator"
          style={{ transform: `translateX(-50%) rotate(-${robot.rotation}deg)` }}
        >
          {displayName}
        </div>
      )}

      {isSelected && (
        <div
          className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-1"
          style={{ transform: 'translateX(-50%)', transformOrigin: 'center center' }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => { e.stopPropagation(); if (!isLocked) onRotate(robot.id, -45); }}
            className="tool-button !p-1"
            title="Rotate left"
          >
            <span className="material-symbols-outlined text-[16px] scale-x-[-1]" aria-hidden="true">
              rotate_right
            </span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); if (!isLocked) onRotate(robot.id, 45); }}
            className="tool-button !p-1"
            title="Rotate right"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              rotate_right
            </span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); if (!isLocked) onEdit(robot.id); }}
            className="tool-button !p-1"
            title="Edit robot"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              edit
            </span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); if (!isLocked) onRemove(robot.id); }}
            className="tool-button !p-1 text-destructive"
            title="Remove robot"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              delete
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export const FrcRobotElement = memo(
  FrcRobotElementComponent,
  (prev, next) =>
    prev.robot === next.robot &&
    prev.dimensions.width === next.dimensions.width &&
    prev.dimensions.height === next.dimensions.height &&
    prev.displayName === next.displayName &&
    prev.isSelected === next.isSelected &&
    prev.isLocked === next.isLocked &&
    prev.scale === next.scale &&
    prev.disablePointerEvents === next.disablePointerEvents
);
