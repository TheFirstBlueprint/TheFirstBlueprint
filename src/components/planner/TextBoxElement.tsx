import { useEffect, useRef } from 'react';
import { TextBox } from '@/types/planner';
import { cn } from '@/lib/utils';

interface TextBoxElementProps {
  textBox: TextBox;
  isSelected: boolean;
  onSelect: () => void;
  onPositionChange: (x: number, y: number) => void;
  onRotate: (delta: number) => void;
  onEdit: () => void;
  onRemove: () => void;
  fieldBounds: { width: number; height: number };
  isLocked: boolean;
  scale: number;
  allowInteraction: boolean;
}

const DOUBLE_TAP_MS = 280;

export const TextBoxElement = ({
  textBox,
  isSelected,
  onSelect,
  onPositionChange,
  onRotate,
  onEdit,
  onRemove,
  fieldBounds,
  isLocked,
  scale,
  allowInteraction,
}: TextBoxElementProps) => {
  const positionRef = useRef({ x: textBox.x, y: textBox.y });
  const lastTapRef = useRef<number>(0);
  const showSelection = isSelected && allowInteraction;

  useEffect(() => {
    positionRef.current = { x: textBox.x, y: textBox.y };
  }, [textBox.x, textBox.y]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!allowInteraction) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target instanceof HTMLElement && e.target.closest('button')) return;
    e.stopPropagation();
    if (isLocked) return;
    onSelect();

    const now = Date.now();
    if (e.pointerType !== 'mouse' && now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      onEdit();
      return;
    }
    lastTapRef.current = now;

    const normalizedScale = scale || 1;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = positionRef.current;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) / normalizedScale;
      const dy = (moveEvent.clientY - startY) / normalizedScale;
      const nextX = Math.max(0, Math.min(fieldBounds.width, startPos.x + dx));
      const nextY = Math.max(0, Math.min(fieldBounds.height, startPos.y + dy));
      onPositionChange(nextX, nextY);
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div
      className={cn(
        'absolute select-none touch-none cursor-grab active:cursor-grabbing',
        showSelection && 'z-[40]'
      )}
      style={{
        left: textBox.x,
        top: textBox.y,
        transform: `translate(-50%, -50%) rotate(${textBox.rotation}deg)`,
        pointerEvents: allowInteraction ? 'auto' : 'none',
        zIndex: isSelected ? 40 : 18,
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={(e) => {
        if (!allowInteraction || isLocked) return;
        e.stopPropagation();
        onEdit();
      }}
      onClick={(e) => {
        if (!allowInteraction || isLocked) return;
        e.stopPropagation();
        onSelect();
      }}
    >
      <div
        className={cn(
          'rounded-md px-2 py-1',
          showSelection ? 'border border-foreground/40 bg-background/50' : 'border border-transparent'
        )}
        style={{
          color: textBox.color,
          fontSize: textBox.fontSize,
          lineHeight: 1.2,
          whiteSpace: 'pre-wrap',
          textShadow: '0 1px 2px rgba(0,0,0,0.35)',
        }}
      >
        {textBox.text || 'Text'}
      </div>

      {showSelection && (
        <div
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-1"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            className="tool-button !p-1"
            title="Rotate left"
            onClick={(e) => {
              e.stopPropagation();
              if (!isLocked) onRotate(-15);
            }}
          >
            <span className="material-symbols-outlined text-[16px] scale-x-[-1]" aria-hidden="true">
              rotate_right
            </span>
          </button>
          <button
            className="tool-button !p-1"
            title="Rotate right"
            onClick={(e) => {
              e.stopPropagation();
              if (!isLocked) onRotate(15);
            }}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              rotate_right
            </span>
          </button>
          <button
            className="tool-button !p-1"
            title="Edit text"
            onClick={(e) => {
              e.stopPropagation();
              if (!isLocked) onEdit();
            }}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              edit
            </span>
          </button>
          <button
            className="tool-button !p-1 text-destructive"
            title="Delete text"
            onClick={(e) => {
              e.stopPropagation();
              if (!isLocked) onRemove();
            }}
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
