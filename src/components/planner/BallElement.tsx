import { Alliance, Ball } from '@/types/planner';
import { cn } from '@/lib/utils';

interface BallElementProps {
  ball: Ball;
  onPositionChange: (x: number, y: number) => void;
  onRemove: () => void;
  fieldBounds: { width: number; height: number };
  checkRobotCollision: (x: number, y: number) => string | null;
  checkGoalDrop: (clientX: number, clientY: number) => Alliance | null;
  checkClassifierDrop: (clientX: number, clientY: number) => Alliance | null;
  onCollectByRobot: (robotId: string) => void;
  onScoreToClassifier: (ballId: string, alliance: Alliance) => void;
  isLocked: boolean;
  scale: number;
  isGhost?: boolean;
}

const BALL_SIZE = 20;

export const BallElement = ({
  ball,
  onPositionChange,
  fieldBounds,
  checkRobotCollision,
  checkGoalDrop,
  checkClassifierDrop,
  onCollectByRobot,
  onScoreToClassifier,
  isLocked,
  scale,
  isGhost,
}: BallElementProps) => {
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.stopPropagation();
    if (isLocked) return;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startY = e.clientY;
    const startPosX = ball.position.x;
    const startPosY = ball.position.y;
    const normalizedScale = scale || 1;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) / normalizedScale;
      const dy = (moveEvent.clientY - startY) / normalizedScale;
      const newX = Math.max(BALL_SIZE / 2, Math.min(fieldBounds.width - BALL_SIZE / 2, startPosX + dx));
      const newY = Math.max(BALL_SIZE / 2, Math.min(fieldBounds.height - BALL_SIZE / 2, startPosY + dy));
      onPositionChange(newX, newY);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);

      // Check for robot collision on drop
      const goalTarget = checkGoalDrop(upEvent.clientX, upEvent.clientY);
      if (goalTarget) {
        onScoreToClassifier(ball.id, goalTarget);
        return;
      }

      const classifierTarget = checkClassifierDrop(upEvent.clientX, upEvent.clientY);
      if (classifierTarget) {
        onScoreToClassifier(ball.id, classifierTarget);
        return;
      }

      const dx = (upEvent.clientX - startX) / normalizedScale;
      const dy = (upEvent.clientY - startY) / normalizedScale;
      const finalX = Math.max(BALL_SIZE / 2, Math.min(fieldBounds.width - BALL_SIZE / 2, startPosX + dx));
      const finalY = Math.max(BALL_SIZE / 2, Math.min(fieldBounds.height - BALL_SIZE / 2, startPosY + dy));
      
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
        'border-2 transition-all duration-150',
        'hover:scale-110',
        ball.color === 'green'
          ? 'bg-ball-green border-ball-green/50'
          : 'bg-ball-purple border-ball-purple/50',
        isGhost && 'ring-2 ring-red-500'
      )}
      style={{
        left: ball.position.x - BALL_SIZE / 2,
        top: ball.position.y - BALL_SIZE / 2,
        width: BALL_SIZE,
        height: BALL_SIZE,
        zIndex: 15,
      }}
      onPointerDown={handlePointerDown}
    />
  );
};
