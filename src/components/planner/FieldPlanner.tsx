import { useState, useRef, useCallback, useEffect } from 'react';
import { useFieldState } from '@/hooks/useFieldState';
import { Tool, DEFAULT_CONFIG } from '@/types/planner';
import fieldImage from '@/assets/ftc-decode-field-2.png';
import { RobotElement } from './RobotElement';
import { BallElement } from './BallElement';
import { DrawingCanvas } from './DrawingCanvas';
import { ToolPanel } from './ToolPanel';
import { ClassifierDisplay } from './ClassifierDisplay';
import { toast } from 'sonner';

const FIELD_SIZE = 600;
const GOAL_SIZE = 120;
const AUTON_SECONDS = 30;
const TRANSITION_SECONDS = 7;
const TELEOP_SECONDS = 120;
const MAGNET_RADIUS = 10;
const MAGNET_TARGETS = [
  { x: 0.27, y: 0.761 },
  { x: 0.7275, y: 0.761 },
];
const CLASSIFIER_STACK = {
  top: 126,
  sideInset: 0,
  slotSize: 14,
  gap: 4,
  padding: 6,
};

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
    robotCollectBalls,
    addBall,
    updateBallPosition,
    removeBall,
    scoreBallToClassifier,
    emptyClassifier,
    setupFieldArtifacts,
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
  const [motif, setMotif] = useState('GPP');
  const [robotModes, setRobotModes] = useState<Record<string, { intake: boolean; outtake: boolean }>>({});
  const [timerMode, setTimerMode] = useState<'full' | 'teleop' | 'auton'>('full');
  const [timerPhase, setTimerPhase] = useState<'idle' | 'auton' | 'transition' | 'teleop'>('auton');
  const [timeLeft, setTimeLeft] = useState(AUTON_SECONDS);
  const [timerRunning, setTimerRunning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const redClassifierRef = useRef<HTMLDivElement>(null);
  const blueClassifierRef = useRef<HTMLDivElement>(null);
  const redClassifierFieldRef = useRef<HTMLDivElement>(null);
  const blueClassifierFieldRef = useRef<HTMLDivElement>(null);
  const isInputLocked = timerRunning && timerPhase === 'transition';

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (isInputLocked) return;
      
      switch (e.key.toLowerCase()) {
        case 's':
          setActiveTool('select');
          break;
        case 'p':
          setActiveTool('pen');
          break;
        case 'd':
          setActiveTool('dotted');
          break;
        case 'a':
          setActiveTool('arrow');
          break;
        case 'e':
          setActiveTool('eraser');
          break;
        case 'i':
          if (selectedRobotId) {
            setRobotModes((prev) => ({
              ...prev,
              [selectedRobotId]: {
                intake: !prev[selectedRobotId]?.intake,
                outtake: prev[selectedRobotId]?.outtake ?? false,
              },
            }));
          }
          break;
        case 'o':
          if (selectedRobotId) {
            setRobotModes((prev) => ({
              ...prev,
              [selectedRobotId]: {
                intake: prev[selectedRobotId]?.intake ?? false,
                outtake: !prev[selectedRobotId]?.outtake,
              },
            }));
          }
          break;
        case 'escape':
          setSelectedRobotId(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInputLocked, selectedRobotId]);

  useEffect(() => {
    setRobotModes((prev) => {
      const next: Record<string, { intake: boolean; outtake: boolean }> = {};
      state.robots.forEach((robot) => {
        next[robot.id] = prev[robot.id] ?? { intake: false, outtake: false };
      });
      return next;
    });
  }, [state.robots]);

  useEffect(() => {
    if (!timerRunning) return;

    const interval = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev > 1) return prev - 1;

        if (timerMode === 'full') {
          if (timerPhase === 'auton') {
            setTimerPhase('transition');
            return TRANSITION_SECONDS;
          }
          if (timerPhase === 'transition') {
            setTimerPhase('teleop');
            return TELEOP_SECONDS;
          }
          if (timerPhase === 'teleop') {
            setTimerRunning(false);
            setTimerPhase('idle');
            return 0;
          }
        }

        setTimerRunning(false);
        setTimerPhase('idle');
        return 0;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timerRunning, timerMode, timerPhase]);

  const handleFieldClick = () => {
    if (isInputLocked) return;
    setSelectedRobotId(null);
  };

  const motifs = ['GPP', 'PGP', 'PPG'];

  const handleRandomizeMotif = () => {
    const next = motifs[Math.floor(Math.random() * motifs.length)];
    setMotif(next);
  };

  const handleSetupField = () => {
    setupFieldArtifacts();
    toast.success('Artifacts placed on spike marks.');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimerModeChange = (mode: 'full' | 'teleop' | 'auton') => {
    setTimerMode(mode);
    setTimerRunning(false);
    if (mode === 'full') {
      setTimerPhase('auton');
      setTimeLeft(AUTON_SECONDS);
      return;
    }
    setTimerPhase(mode);
    setTimeLeft(mode === 'auton' ? AUTON_SECONDS : TELEOP_SECONDS);
  };

  const handleTimerToggle = () => {
    if (timerRunning) {
      setTimerRunning(false);
      return;
    }

    if (timeLeft === 0) {
      if (timerMode === 'full') {
        setTimerPhase('auton');
        setTimeLeft(AUTON_SECONDS);
      } else {
        setTimerPhase(timerMode);
        setTimeLeft(timerMode === 'auton' ? AUTON_SECONDS : TELEOP_SECONDS);
      }
    }
    setTimerRunning(true);
  };

  const redRobotCount = state.robots.filter((robot) => robot.alliance === 'red').length;
  const blueRobotCount = state.robots.filter((robot) => robot.alliance === 'blue').length;
  const canAddRedRobot = redRobotCount < DEFAULT_CONFIG.maxRobotsPerAlliance;
  const canAddBlueRobot = blueRobotCount < DEFAULT_CONFIG.maxRobotsPerAlliance;

  const getGoalTargetForPosition = useCallback((x: number, y: number) => {
    if (x <= GOAL_SIZE && y <= GOAL_SIZE && x + y <= GOAL_SIZE) {
      return 'blue';
    }

    const xFromRight = FIELD_SIZE - x;
    if (xFromRight <= GOAL_SIZE && y <= GOAL_SIZE && xFromRight + y <= GOAL_SIZE) {
      return 'red';
    }

    return null;
  }, []);

  const getGoalDropTarget = useCallback((clientX: number, clientY: number) => {
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;

    return getGoalTargetForPosition(x, y);
  }, [getGoalTargetForPosition]);

  const isPointInRect = useCallback((rect: DOMRect | undefined, clientX: number, clientY: number) => {
    if (!rect) return false;
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }, []);

  const getClassifierDropTarget = useCallback((clientX: number, clientY: number) => {
    const redRect = redClassifierRef.current?.getBoundingClientRect();
    const redFieldRect = redClassifierFieldRef.current?.getBoundingClientRect();
    if (
      isPointInRect(redFieldRect, clientX, clientY) ||
      isPointInRect(redRect, clientX, clientY)
    ) {
      return 'red';
    }

    const blueRect = blueClassifierRef.current?.getBoundingClientRect();
    const blueFieldRect = blueClassifierFieldRef.current?.getBoundingClientRect();
    if (
      isPointInRect(blueFieldRect, clientX, clientY) ||
      isPointInRect(blueRect, clientX, clientY)
    ) {
      return 'blue';
    }

    return null;
  }, [isPointInRect]);

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

  const getIntakeRobotForBall = useCallback(
    (x: number, y: number) => {
      for (const robot of state.robots) {
        const modes = robotModes[robot.id];
        if (!modes?.intake) continue;
        const dx = x - robot.position.x;
        const dy = y - robot.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < robot.size / 2 + 10 && robot.heldBalls.length < DEFAULT_CONFIG.maxBallsPerRobot) {
          return robot.id;
        }
      }
      return null;
    },
    [state.robots, robotModes]
  );

  const getGoalRotation = useCallback((robot: { alliance: 'red' | 'blue'; position: { x: number; y: number } }) => {
    const targetX = robot.alliance === 'blue' ? 0 : FIELD_SIZE;
    const targetY = 0;
    const dx = targetX - robot.position.x;
    const dy = targetY - robot.position.y;
    return (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  }, []);

  const handleRobotShoot = useCallback(
    (robotId: string, mode: 'single' | 'all') => {
      if (isInputLocked) return;
      const robot = state.robots.find((item) => item.id === robotId);
      if (!robot || robot.heldBalls.length === 0) return;

      const originalRotation = robot.rotation;
      const targetRotation = getGoalRotation(robot);
      updateRobotRotation(robotId, targetRotation);

      if (mode === 'single') {
        robotEjectSingle(robotId);
      } else {
        robotEjectAll(robotId);
      }

      window.setTimeout(() => {
        updateRobotRotation(robotId, originalRotation);
      }, 250);
    },
    [getGoalRotation, isInputLocked, robotEjectAll, robotEjectSingle, state.robots, updateRobotRotation]
  );

  const handleBallMove = useCallback(
    (ballId: string, x: number, y: number) => {
      if (isInputLocked) return;
      updateBallPosition(ballId, { x, y });

      const intakeRobotId = getIntakeRobotForBall(x, y);
      if (intakeRobotId) {
        robotCollectBall(intakeRobotId, ballId);
      }
    },
    [getIntakeRobotForBall, isInputLocked, robotCollectBall, updateBallPosition]
  );

  const handleRobotMove = useCallback(
    (robotId: string, x: number, y: number) => {
      if (isInputLocked) return;
      let nextX = x;
      let nextY = y;
      for (const target of MAGNET_TARGETS) {
        const targetX = target.x * FIELD_SIZE;
        const targetY = target.y * FIELD_SIZE;
        const dx = targetX - nextX;
        const dy = targetY - nextY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= MAGNET_RADIUS) {
          nextX = targetX;
          nextY = targetY;
          break;
        }
      }

      updateRobotPosition(robotId, { x: nextX, y: nextY });

      const robot = state.robots.find((item) => item.id === robotId);
      const modes = robotModes[robotId];
      if (!robot || !modes) return;

      if (modes.intake) {
        const inRange = state.balls
          .map((ball) => {
            const dx = ball.position.x - nextX;
            const dy = ball.position.y - nextY;
            return { ball, distance: Math.sqrt(dx * dx + dy * dy) };
          })
          .filter(({ distance }) => distance < robot.size / 2 + 10)
          .sort((a, b) => a.distance - b.distance)
          .map(({ ball }) => ball.id);

        if (inRange.length > 0) {
          robotCollectBalls(robotId, inRange);
        }
      }

      if (modes.outtake && robot.heldBalls.length > 0) {
        const goalTarget = getGoalTargetForPosition(nextX, nextY);
        if (goalTarget && goalTarget === robot.alliance) {
          handleRobotShoot(robotId, 'all');
        }
      }
    },
    [
      getGoalTargetForPosition,
      handleRobotShoot,
      isInputLocked,
      robotCollectBalls,
      robotModes,
      state.balls,
      state.robots,
      updateRobotPosition,
    ]
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
      <div className="w-64 p-4 border-r border-border flex-shrink-0">
        <ToolPanel
          activeTool={activeTool}
          onToolChange={setActiveTool}
          penColor={penColor}
          onPenColorChange={setPenColor}
          onAddBall={addBall}
          onAddRobot={addRobot}
          canAddRedRobot={canAddRedRobot}
          canAddBlueRobot={canAddBlueRobot}
          onClearDrawings={clearDrawings}
          onClearBalls={clearBalls}
          onClearRobots={clearRobots}
          onResetField={resetField}
          onSetupField={handleSetupField}
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
          ref={fieldRef}
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
            isLocked={isInputLocked}
          />

          {/* Balls */}
          {state.balls.map((ball) => (
            <BallElement
              key={ball.id}
              ball={ball}
              onPositionChange={(x, y) => handleBallMove(ball.id, x, y)}
              onRemove={() => removeBall(ball.id)}
              fieldBounds={{ width: FIELD_SIZE, height: FIELD_SIZE }}
              checkRobotCollision={checkRobotCollision}
              checkGoalDrop={getGoalDropTarget}
              checkClassifierDrop={getClassifierDropTarget}
              onCollectByRobot={(robotId) => robotCollectBall(robotId, ball.id)}
              onScoreToClassifier={(ballId, alliance) => scoreBallToClassifier(ballId, alliance)}
              isLocked={isInputLocked}
            />
          ))}

          {/* Classifier stacks (field overlay) */}
          <div
            ref={blueClassifierFieldRef}
            className="absolute z-10 pointer-events-none"
            style={{
              top: CLASSIFIER_STACK.top,
              left: CLASSIFIER_STACK.sideInset,
              padding: CLASSIFIER_STACK.padding,
            }}
          >
            <div
              className="flex flex-col-reverse rounded-md bg-background/70 border border-border/60 p-1"
              style={{ gap: CLASSIFIER_STACK.gap }}
            >
              {Array.from({ length: state.classifiers.blue.maxCapacity }, (_, index) => {
                const ball = state.classifiers.blue.balls[index];
                return (
                  <div
                    key={`blue-slot-${index}`}
                    className={`rounded-full border border-border/60 ${
                      ball
                        ? ball.color === 'green'
                          ? 'bg-ball-green'
                          : 'bg-ball-purple'
                        : 'bg-muted/30'
                    }`}
                    style={{
                      width: CLASSIFIER_STACK.slotSize,
                      height: CLASSIFIER_STACK.slotSize,
                    }}
                  />
                );
              })}
            </div>
          </div>
          <div
            ref={redClassifierFieldRef}
            className="absolute z-10 pointer-events-none"
            style={{
              top: CLASSIFIER_STACK.top,
              right: CLASSIFIER_STACK.sideInset,
              padding: CLASSIFIER_STACK.padding,
            }}
          >
            <div
              className="flex flex-col-reverse rounded-md bg-background/70 border border-border/60 p-1"
              style={{ gap: CLASSIFIER_STACK.gap }}
            >
              {Array.from({ length: state.classifiers.red.maxCapacity }, (_, index) => {
                const ball = state.classifiers.red.balls[index];
                return (
                  <div
                    key={`red-slot-${index}`}
                    className={`rounded-full border border-border/60 ${
                      ball
                        ? ball.color === 'green'
                          ? 'bg-ball-green'
                          : 'bg-ball-purple'
                        : 'bg-muted/30'
                    }`}
                    style={{
                      width: CLASSIFIER_STACK.slotSize,
                      height: CLASSIFIER_STACK.slotSize,
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Robots */}
          {state.robots.map((robot) => (
            <RobotElement
              key={robot.id}
              robot={robot}
              isSelected={selectedRobotId === robot.id}
              onSelect={() => setSelectedRobotId(robot.id)}
              onPositionChange={(x, y) => handleRobotMove(robot.id, x, y)}
              onRotate={(delta) => updateRobotRotation(robot.id, robot.rotation + delta)}
              onRemove={() => {
                removeRobot(robot.id);
                setSelectedRobotId(null);
              }}
              onEjectSingle={() => handleRobotShoot(robot.id, 'single')}
              onEjectAll={() => handleRobotShoot(robot.id, 'all')}
              fieldBounds={{ width: FIELD_SIZE, height: FIELD_SIZE }}
              intakeActive={robotModes[robot.id]?.intake ?? false}
              outtakeActive={robotModes[robot.id]?.outtake ?? false}
              onToggleIntake={() =>
                setRobotModes((prev) => ({
                  ...prev,
                  [robot.id]: {
                    intake: !prev[robot.id]?.intake,
                    outtake: prev[robot.id]?.outtake ?? false,
                  },
                }))
              }
              onToggleOuttake={() =>
                setRobotModes((prev) => ({
                  ...prev,
                  [robot.id]: {
                    intake: prev[robot.id]?.intake ?? false,
                    outtake: !prev[robot.id]?.outtake,
                  },
                }))
              }
              isLocked={isInputLocked}
            />
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-64 p-4 border-l border-border flex-shrink-0">
        <div className="mb-6">
          <h1 className="font-mono text-lg font-semibold text-primary mb-1">
            FTC DECODE
          </h1>
          <p className="text-xs text-muted-foreground">
            Strategy Planner 2025-26
          </p>
        </div>

        <div className="space-y-4">
          <div className="panel">
            <div className="panel-header">Game Timer</div>
            <div className="text-center text-2xl font-mono text-foreground">
              {formatTime(timeLeft)}
            </div>
            <div className="text-center text-xs text-muted-foreground">
              {timerMode === 'full'
                ? timerPhase === 'transition'
                  ? 'Transition (inputs locked)'
                  : timerPhase === 'idle'
                    ? 'Idle'
                    : `Phase: ${timerPhase}`
                : timerMode.toUpperCase()}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <button
                onClick={() => handleTimerModeChange('full')}
                className={`tool-button ${timerMode === 'full' ? 'active' : ''}`}
                title="Full game"
              >
                <span className="text-xs font-mono">Full</span>
              </button>
              <button
                onClick={() => handleTimerModeChange('auton')}
                className={`tool-button ${timerMode === 'auton' ? 'active' : ''}`}
                title="Auton"
              >
                <span className="text-xs font-mono">Auton</span>
              </button>
              <button
                onClick={() => handleTimerModeChange('teleop')}
                className={`tool-button ${timerMode === 'teleop' ? 'active' : ''}`}
                title="Teleop"
              >
                <span className="text-xs font-mono">Teleop</span>
              </button>
            </div>
            <button
              onClick={handleTimerToggle}
              className="tool-button mt-2 w-full"
              title={timerRunning ? 'Pause timer' : 'Start timer'}
            >
              {timerRunning ? 'Pause' : 'Start'}
            </button>
          </div>
          <div className="panel">
            <div className="panel-header">Motif</div>
            <div className="grid grid-cols-3 gap-2">
              {motifs.map((option) => (
                <button
                  key={option}
                  onClick={() => setMotif(option)}
                  className={`tool-button ${motif === option ? 'active' : ''}`}
                  title={`Set motif ${option}`}
                >
                  <span className="text-xs font-mono">{option}</span>
                </button>
              ))}
            </div>
            <button
              onClick={handleRandomizeMotif}
              className="tool-button mt-2 w-full"
              title="Randomize motif"
            >
              Randomize
            </button>
          </div>
          <div ref={redClassifierRef}>
            <ClassifierDisplay
              classifier={state.classifiers.red}
              motif={motif}
              onEmpty={() => emptyClassifier('red')}
            />
          </div>
          <div ref={blueClassifierRef}>
            <ClassifierDisplay
              classifier={state.classifiers.blue}
              motif={motif}
              onEmpty={() => emptyClassifier('blue')}
            />
          </div>
        </div>

        <div className="mt-6 panel">
          <div className="panel-header">Instructions</div>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Drag robots & balls to position</li>
            <li>• Drop balls on robots to collect</li>
            <li>• Click robot for controls</li>
            <li>• I/O to toggle intake/outtake</li>
            <li>• Use pen to draw paths</li>
            <li>• Export to save strategy</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
