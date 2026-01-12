import { cn } from '@/lib/utils';
import { Position } from '@/types/planner';

interface FrcFuelElementProps {
  id: string;
  position: Position;
  radius: number;
  onPositionChange: (x: number, y: number) => void;
  onCollectByRobot: (robotId: string) => void;
  checkRobotCollision: (x: number, y: number) => string | null;
  fieldBounds: { width: number; height: number };
  isLocked: boolean;
  scale: number;
}

export const FrcFuelElement = ({
  id,
  position,
  radius,
  onPositionChange,
  onCollectByRobot,
  checkRobotCollision,
  fieldBounds,
  isLocked,
  scale,
}: FrcFuelElementProps) => {
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.stopPropagation();
    if (isLocked) return;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startY = e.clientY;
    const startPosX = position.x;
    const startPosY = position.y;
    const normalizedScale = scale || 1;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) / normalizedScale;
      const dy = (moveEvent.clientY - startY) / normalizedScale;
      const newX = Math.max(radius, Math.min(fieldBounds.width - radius, startPosX + dx));
      const newY = Math.max(radius, Math.min(fieldBounds.height - radius, startPosY + dy));
      onPositionChange(newX, newY);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);

      const dx = (upEvent.clientX - startX) / normalizedScale;
      const dy = (upEvent.clientY - startY) / normalizedScale;
      const finalX = Math.max(radius, Math.min(fieldBounds.width - radius, startPosX + dx));
      const finalY = Math.max(radius, Math.min(fieldBounds.height - radius, startPosY + dy));
      const robotId = checkRobotCollision(finalX, finalY);
      if (robotId) {
        onCollectByRobot(robotId);
      }
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
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
      }}
      onPointerDown={handlePointerDown}
      data-fuel-id={id}
    />
  );
};
