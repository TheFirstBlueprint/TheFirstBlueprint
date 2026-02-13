import { memo, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Position } from '@/types/planner';

interface FrcFuelElementProps {
  id: string;
  position: Position;
  radius: number;
  onPositionChange: (id: string, x: number, y: number) => void;
  onCollectByRobot: (robotId: string, fuelId: string) => void;
  checkRobotCollision: (x: number, y: number) => string | null;
  clampPosition: (from: Position, to: Position) => Position;
  isLocked: boolean;
  scale: number;
  disablePointerEvents?: boolean;
}

const FrcFuelElementComponent = ({
  id,
  position,
  radius,
  onPositionChange,
  onCollectByRobot,
  checkRobotCollision,
  clampPosition,
  isLocked,
  scale,
  disablePointerEvents,
}: FrcFuelElementProps) => {
  const positionRef = useRef(position);
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null);
  const pendingPositionRef = useRef<Position | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    positionRef.current = position;
  }, [position.x, position.y]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.stopPropagation();
    if (isLocked) return;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    const normalizedScale = scale || 1;

    const flushPendingPosition = () => {
      rafRef.current = null;
      const pending = pendingPositionRef.current;
      if (!pending) return;
      pendingPositionRef.current = null;
      onPositionChange(id, pending.x, pending.y);
    };

    const scheduleFlush = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(flushPendingPosition);
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!lastMouseRef.current) return;
      const dx = (moveEvent.clientX - lastMouseRef.current.x) / normalizedScale;
      const dy = (moveEvent.clientY - lastMouseRef.current.y) / normalizedScale;
      const current = positionRef.current;
      const desired = { x: current.x + dx, y: current.y + dy };
      pendingPositionRef.current = clampPosition(current, desired);
      scheduleFlush();
      lastMouseRef.current = { x: moveEvent.clientX, y: moveEvent.clientY };
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);

      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      const current = positionRef.current;
      const dx = lastMouseRef.current ? (upEvent.clientX - lastMouseRef.current.x) / normalizedScale : 0;
      const dy = lastMouseRef.current ? (upEvent.clientY - lastMouseRef.current.y) / normalizedScale : 0;
      const desired = { x: current.x + dx, y: current.y + dy };
      const pending = pendingPositionRef.current;
      const finalPos = clampPosition(current, pending ?? desired);
      pendingPositionRef.current = null;
      onPositionChange(id, finalPos.x, finalPos.y);
      lastMouseRef.current = null;

      const robotId = checkRobotCollision(finalPos.x, finalPos.y);
      if (robotId) {
        onCollectByRobot(robotId, id);
      }
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
  };

  return (
    <div
      className={cn(
        'absolute rounded-full cursor-grab active:cursor-grabbing select-none touch-none',
        'border border-black/20'
      )}
      style={{
        left: position.x - radius,
        top: position.y - radius,
        width: radius * 2,
        height: radius * 2,
        background: 'radial-gradient(circle at 30% 30%, #ffe4a3 0%, #f59e0b 55%, #b45309 100%)',
        boxShadow: '0 0 6px rgba(0,0,0,0.25)',
        zIndex: 14,
        pointerEvents: disablePointerEvents ? 'none' : 'auto',
      }}
      onPointerDown={handlePointerDown}
      data-fuel-id={id}
    />
  );
};

export const FrcFuelElement = memo(
  FrcFuelElementComponent,
  (prev, next) =>
    prev.id === next.id &&
    prev.position.x === next.position.x &&
    prev.position.y === next.position.y &&
    prev.radius === next.radius &&
    prev.isLocked === next.isLocked &&
    prev.scale === next.scale &&
    prev.disablePointerEvents === next.disablePointerEvents
);
