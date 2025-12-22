import { useRef, useEffect, useState, useCallback } from 'react';
import { DrawingPath, Position, Tool } from '@/types/planner';

interface DrawingCanvasProps {
  width: number;
  height: number;
  drawings: DrawingPath[];
  activeTool: Tool;
  penColor: string;
  penWidth: number;
  onAddDrawing: (path: DrawingPath) => void;
  onRemoveDrawing: (id: string) => void;
}

let pathIdCounter = 0;

export const DrawingCanvas = ({
  width,
  height,
  drawings,
  activeTool,
  penColor,
  penWidth,
  onAddDrawing,
  onRemoveDrawing,
}: DrawingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Position[]>([]);

  // Redraw all paths
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    drawings.forEach((drawing) => {
      if (drawing.points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = drawing.color;
      ctx.lineWidth = drawing.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.moveTo(drawing.points[0].x, drawing.points[0].y);
      for (let i = 1; i < drawing.points.length; i++) {
        ctx.lineTo(drawing.points[i].x, drawing.points[i].y);
      }
      ctx.stroke();
    });

    // Draw current path
    if (currentPath.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y);
      }
      ctx.stroke();
    }
  }, [drawings, currentPath, penColor, penWidth, width, height]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const getCanvasPoint = (e: React.MouseEvent): Position => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'select') return;

    const point = getCanvasPoint(e);

    if (activeTool === 'pen') {
      setIsDrawing(true);
      setCurrentPath([point]);
    } else if (activeTool === 'eraser') {
      // Find and remove path near click
      const clickRadius = 10;
      for (const drawing of drawings) {
        for (const pathPoint of drawing.points) {
          const dx = pathPoint.x - point.x;
          const dy = pathPoint.y - point.y;
          if (Math.sqrt(dx * dx + dy * dy) < clickRadius) {
            onRemoveDrawing(drawing.id);
            break;
          }
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || activeTool !== 'pen') return;

    const point = getCanvasPoint(e);
    setCurrentPath((prev) => [...prev, point]);
  };

  const handleMouseUp = () => {
    if (!isDrawing || activeTool !== 'pen') return;

    if (currentPath.length > 1) {
      const newPath: DrawingPath = {
        id: `path-${++pathIdCounter}-${Date.now()}`,
        points: currentPath,
        color: penColor,
        width: penWidth,
      };
      onAddDrawing(newPath);
    }

    setIsDrawing(false);
    setCurrentPath([]);
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0"
      style={{
        zIndex: 5,
        pointerEvents: activeTool === 'select' ? 'none' : 'auto',
        cursor: activeTool === 'pen' ? 'crosshair' : activeTool === 'eraser' ? 'pointer' : 'default',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
};
