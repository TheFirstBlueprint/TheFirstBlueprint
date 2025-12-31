import { useRef, useEffect, useState, useCallback } from 'react';
import { DrawingPath, DrawingStyle, DrawingShape, Position, Tool } from '@/types/planner';

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
  scale: number;
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
  scale,
}: DrawingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Position[]>([]);
  const isShapeTool = activeTool === 'box' || activeTool === 'rectangle' || activeTool === 'circle';
  const isDrawTool =
    activeTool === 'pen' || activeTool === 'dotted' || activeTool === 'arrow' || isShapeTool;

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

  const drawShape = useCallback(
    (ctx: CanvasRenderingContext2D, points: Position[], color: string, width: number, shape: DrawingShape) => {
      if (points.length < 2) return;
      const start = points[0];
      const end = points[1];
      const minX = Math.min(start.x, end.x);
      const minY = Math.min(start.y, end.y);
      const rawWidth = Math.abs(end.x - start.x);
      const rawHeight = Math.abs(end.y - start.y);
      const size = Math.max(rawWidth, rawHeight);
      const drawWidth = shape === 'rectangle' ? rawWidth : size;
      const drawHeight = shape === 'rectangle' ? rawHeight : size;

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([]);

      if (shape === 'circle') {
        const radius = drawWidth / 2;
        ctx.arc(minX + radius, minY + radius, radius, 0, Math.PI * 2);
      } else {
        ctx.rect(minX, minY, drawWidth, drawHeight);
      }
      ctx.stroke();
    },
    []
  );

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
      if (drawing.shape && drawing.shape !== 'path') {
        drawShape(ctx, drawing.points, drawing.color, drawing.width, drawing.shape);
      } else {
        drawPath(ctx, drawing.points, drawing.color, drawing.width, drawing.style || 'solid');
      }
    });

    // Draw current path
    if (currentPath.length > 1) {
      if (isShapeTool) {
        drawShape(ctx, currentPath, penColor, penWidth, activeTool as DrawingShape);
      } else {
        drawPath(ctx, currentPath, penColor, penWidth, getDrawingStyle(activeTool));
      }
    }
  }, [
    drawings,
    currentPath,
    penColor,
    penWidth,
    width,
    height,
    drawPath,
    drawShape,
    activeTool,
    getDrawingStyle,
    isShapeTool,
  ]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const getCanvasPoint = (e: React.MouseEvent): Position => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const normalizedScale = scale || 1;
    return {
      x: (e.clientX - rect.left) / normalizedScale,
      y: (e.clientY - rect.top) / normalizedScale,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isLocked) return;
    if (!isDrawTool && activeTool !== 'eraser') return;

    const point = getCanvasPoint(e);

    if (isDrawTool) {
      setIsDrawing(true);
      setCurrentPath(isShapeTool ? [point, point] : [point]);
    } else if (activeTool === 'eraser') {
      // Find and remove path near click
      const clickRadius = 10;
      for (const drawing of drawings) {
        if (drawing.shape && drawing.shape !== 'path') {
          const start = drawing.points[0];
          const end = drawing.points[1];
          const minX = Math.min(start.x, end.x) - clickRadius;
          const minY = Math.min(start.y, end.y) - clickRadius;
          const rawWidth = Math.abs(end.x - start.x);
          const rawHeight = Math.abs(end.y - start.y);
          const size = Math.max(rawWidth, rawHeight);
          const drawWidth = drawing.shape === 'rectangle' ? rawWidth : size;
          const drawHeight = drawing.shape === 'rectangle' ? rawHeight : size;
          if (
            point.x >= minX &&
            point.x <= minX + drawWidth + clickRadius * 2 &&
            point.y >= minY &&
            point.y <= minY + drawHeight + clickRadius * 2
          ) {
            onRemoveDrawing(drawing.id);
            break;
          }
        } else {
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
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isLocked) return;
    if (!isDrawing || !isDrawTool) return;

    const point = getCanvasPoint(e);
    setCurrentPath((prev) => {
      if (isShapeTool) {
        return [prev[0], point];
      }
      return [...prev, point];
    });
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
        style: isShapeTool ? 'solid' : getDrawingStyle(activeTool),
        shape: isShapeTool ? (activeTool as DrawingShape) : 'path',
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
