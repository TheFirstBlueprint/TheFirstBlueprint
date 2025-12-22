import { useState, useRef, useCallback, useEffect } from 'react';
import { useFieldState } from '@/hooks/useFieldState';
import { Tool, DEFAULT_CONFIG } from '@/types/planner';
import fieldImage from '@/assets/ftc-decode-field.png';
import { RobotElement } from './RobotElement';
import { BallElement } from './BallElement';
import { DrawingCanvas } from './DrawingCanvas';
import { ToolPanel } from './ToolPanel';
import { ClassifierDisplay } from './ClassifierDisplay';
import { toast } from 'sonner';

const FIELD_SIZE = 600;

export const FieldPlanner = () => {
  const {
    state,
    addRobot,
    updateRobotPosition,
    updateRobotRotation,
    removeRobot,
    robotEjectSingle,
    robotEjectAll,
    robotCollectBall,
    addBall,
    updateBallPosition,
    removeBall,
    emptyClassifier,
    addDrawing,
    removeDrawing,
    clearDrawings,
    clearBalls,
    clearRobots,
    resetField,
    exportState,
    importState,
  } = useFieldState();

  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [penColor, setPenColor] = useState('#22d3ee');
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      switch (e.key.toLowerCase()) {
        case 's':
          setActiveTool('select');
          break;
        case 'p':
          setActiveTool('pen');
          break;
        case 'e':
          setActiveTool('eraser');
          break;
        case 'escape':
          setSelectedRobotId(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFieldClick = () => {
    setSelectedRobotId(null);
  };

  const checkRobotCollision = useCallback(
    (x: number, y: number): string | null => {
      for (const robot of state.robots) {
        const dx = x - robot.position.x;
        const dy = y - robot.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < robot.size / 2 + 10) {
          if (robot.heldBalls.length < DEFAULT_CONFIG.maxBallsPerRobot) {
            return robot.id;
          }
        }
      }
      return null;
    },
    [state.robots]
  );

  const handleExport = () => {
    const data = exportState();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ftc-strategy-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Strategy exported!');
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importState(content);
      if (success) {
        toast.success('Strategy loaded!');
      } else {
        toast.error('Failed to load strategy file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel */}
      <div className="w-56 p-4 border-r border-border flex-shrink-0">
        <ToolPanel
          activeTool={activeTool}
          onToolChange={setActiveTool}
          penColor={penColor}
          onPenColorChange={setPenColor}
          onAddBall={addBall}
          onAddRobot={addRobot}
          canAddRobot={state.robots.length < DEFAULT_CONFIG.maxRobots}
          onClearDrawings={clearDrawings}
          onClearBalls={clearBalls}
          onClearRobots={clearRobots}
          onResetField={resetField}
          onExport={handleExport}
          onImport={handleImport}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Field Area */}
      <div className="flex-1 flex items-center justify-center p-8 field-container">
        <div
          className="relative bg-card rounded-lg overflow-hidden shadow-2xl border border-border"
          style={{ width: FIELD_SIZE, height: FIELD_SIZE }}
          onClick={handleFieldClick}
        >
          {/* Field Background */}
          <img
            src={fieldImage}
            alt="FTC DECODE Field"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            draggable={false}
          />

          {/* Drawing Canvas (beneath elements) */}
          <DrawingCanvas
            width={FIELD_SIZE}
            height={FIELD_SIZE}
            drawings={state.drawings}
            activeTool={activeTool}
            penColor={penColor}
            penWidth={3}
            onAddDrawing={addDrawing}
            onRemoveDrawing={removeDrawing}
          />

          {/* Balls */}
          {state.balls.map((ball) => (
            <BallElement
              key={ball.id}
              ball={ball}
              onPositionChange={(x, y) => updateBallPosition(ball.id, { x, y })}
              onRemove={() => removeBall(ball.id)}
              fieldBounds={{ width: FIELD_SIZE, height: FIELD_SIZE }}
              checkRobotCollision={checkRobotCollision}
              onCollectByRobot={(robotId) => robotCollectBall(robotId, ball.id)}
            />
          ))}

          {/* Robots */}
          {state.robots.map((robot) => (
            <RobotElement
              key={robot.id}
              robot={robot}
              isSelected={selectedRobotId === robot.id}
              onSelect={() => setSelectedRobotId(robot.id)}
              onPositionChange={(x, y) => updateRobotPosition(robot.id, { x, y })}
              onRotate={(delta) => updateRobotRotation(robot.id, robot.rotation + delta)}
              onRemove={() => {
                removeRobot(robot.id);
                setSelectedRobotId(null);
              }}
              onEjectSingle={() => robotEjectSingle(robot.id)}
              onEjectAll={() => robotEjectAll(robot.id)}
              fieldBounds={{ width: FIELD_SIZE, height: FIELD_SIZE }}
            />
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-56 p-4 border-l border-border flex-shrink-0">
        <div className="mb-6">
          <h1 className="font-mono text-lg font-semibold text-primary mb-1">
            FTC DECODE
          </h1>
          <p className="text-xs text-muted-foreground">
            Strategy Planner 2025-26
          </p>
        </div>

        <div className="space-y-4">
          <ClassifierDisplay
            classifier={state.classifiers.red}
            onEmpty={() => emptyClassifier('red')}
          />
          <ClassifierDisplay
            classifier={state.classifiers.blue}
            onEmpty={() => emptyClassifier('blue')}
          />
        </div>

        <div className="mt-6 panel">
          <div className="panel-header">Instructions</div>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Drag robots & balls to position</li>
            <li>• Drop balls on robots to collect</li>
            <li>• Click robot for controls</li>
            <li>• Use pen to draw paths</li>
            <li>• Export to save strategy</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
