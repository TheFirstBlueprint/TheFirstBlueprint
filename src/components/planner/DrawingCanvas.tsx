import { useRef, useEffect, useState, useCallback } from 'react';
import { DrawingPath, DrawingStyle, Position, Tool } from '@/types/planner';

interface DrawingCanvasProps {
  width: number;
  height: number;
  drawings: DrawingPath[];
  activeTool: Tool;
  penColor: string;
  penWidth: number;
  onAddDrawing: (path: DrawingPath) => void;
  onRemoveDrawing: (id: string) => void;
  isLocked: boolean;
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
  isLocked,
}: DrawingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Position[]>([]);
  const isDrawTool = activeTool === 'pen' || activeTool === 'dotted' || activeTool === 'arrow';

  const getDrawingStyle = (tool: Tool): DrawingStyle => {
    switch (tool) {
      case 'dotted':
        return 'dotted';
      case 'arrow':
        return 'arrow';
      default:
        return 'solid';
    }
  };

  const drawPath = useCallback(
    (ctx: CanvasRenderingContext2D, points: Position[], color: string, width: number, style: DrawingStyle) => {
      if (points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash(style === 'dotted' ? [6, 6] : []);

      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();

      if (style === 'arrow') {
        const end = points[points.length - 1];
        const prev = points[points.length - 2];
        const angle = Math.atan2(end.y - prev.y, end.x - prev.x);
        const size = 10;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - size * Math.cos(angle - Math.PI / 6), end.y - size * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(end.x - size * Math.cos(angle + Math.PI / 6), end.y - size * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      }
    },
    []
  );

  // Redraw all paths
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    drawings.forEach((drawing) => {
      drawPath(ctx, drawing.points, drawing.color, drawing.width, drawing.style || 'solid');
    });

    // Draw current path
    if (currentPath.length > 1) {
      drawPath(ctx, currentPath, penColor, penWidth, getDrawingStyle(activeTool));
    }
  }, [drawings, currentPath, penColor, penWidth, width, height, drawPath, activeTool, getDrawingStyle]);

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
    if (isLocked) return;
    if (!isDrawTool && activeTool !== 'eraser') return;

    const point = getCanvasPoint(e);

    if (isDrawTool) {
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
    if (isLocked) return;
    if (!isDrawing || !isDrawTool) return;

    const point = getCanvasPoint(e);
    setCurrentPath((prev) => [...prev, point]);
  };

  const handleMouseUp = () => {
    if (isLocked) return;
    if (!isDrawing || !isDrawTool) return;

    if (currentPath.length > 1) {
      const newPath: DrawingPath = {
        id: `path-${++pathIdCounter}-${Date.now()}`,
        points: currentPath,
        color: penColor,
        width: penWidth,
        style: getDrawingStyle(activeTool),
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
        pointerEvents: activeTool === 'select' || isLocked ? 'none' : 'auto',
        cursor: isDrawTool ? 'crosshair' : activeTool === 'eraser' ? 'pointer' : 'default',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
};
