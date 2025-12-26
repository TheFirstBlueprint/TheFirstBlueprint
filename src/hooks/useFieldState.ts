import { useState, useCallback } from 'react';
import {
  FieldState,
  Robot,
  Ball,
  Position,
  DrawingPath,
  Alliance,
  createInitialState,
  BallColor,
  DEFAULT_CONFIG,
} from '@/types/planner';

let idCounter = 0;
const generateId = () => `id-${++idCounter}-${Date.now()}`;
const BALL_DIAMETER = 20;
const HUMAN_PLAYER_ZONE_SIZE = DEFAULT_CONFIG.tileSize;
const HUMAN_PLAYER_ZONE_INSET = 12;
const HUMAN_PLAYER_SPACING = 24;
const SPIKE_CLEAR_RADIUS = 18;
const SPIKE_ROW_SPACING = 24;
const SPIKE_ROW_HALF = SPIKE_ROW_SPACING;
const SPIKE_MARKS = {
  blue: [
    { x: 0.1621, y: 0.418 },
    { x: 0.1621, y: 0.582 },
    { x: 0.1621, y: 0.7461 },
  ],
  red: [
    { x: 0.8359, y: 0.422 },
    { x: 0.8359, y: 0.582 },
    { x: 0.8359, y: 0.7451 },
  ],
};
const SPIKE_PATTERNS = {
  blue: [
    ['green', 'purple', 'purple'],
    ['purple', 'green', 'purple'],
    ['purple', 'purple', 'green'],
  ],
  red: [
    ['purple', 'purple', 'green'],
    ['purple', 'green', 'purple'],
    ['green', 'purple', 'purple'],
  ],
} as const;

export const useFieldState = () => {
  const [state, setState] = useState<FieldState>(createInitialState());

  // Robot operations
  const addRobot = useCallback((alliance: Alliance, position?: Position) => {
    const allianceCount = state.robots.filter((robot) => robot.alliance === alliance).length;
    if (
      state.robots.length >= DEFAULT_CONFIG.maxRobots ||
      allianceCount >= DEFAULT_CONFIG.maxRobotsPerAlliance
    ) {
      return;
    }

    const robot: Robot = {
      id: generateId(),
      position: position || { x: 300, y: 450 },
      rotation: 0,
      widthIn: 18,
      heightIn: 18,
      alliance,
      heldBalls: [],
      name: '',
      imageDataUrl: null,
    };

    setState((prev) => ({ ...prev, robots: [...prev.robots, robot] }));
  }, [state.robots]);

  const updateRobotPosition = useCallback((id: string, position: Position) => {
    setState((prev) => ({
      ...prev,
      robots: prev.robots.map((r) =>
        r.id === id ? { ...r, position } : r
      ),
    }));
  }, []);

  const updateRobotRotation = useCallback((id: string, rotation: number) => {
    setState((prev) => ({
      ...prev,
      robots: prev.robots.map((r) =>
        r.id === id ? { ...r, rotation: rotation % 360 } : r
      ),
    }));
  }, []);

  const removeRobot = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      robots: prev.robots.filter((r) => r.id !== id),
    }));
  }, []);

  const updateRobotDetails = useCallback((id: string, updates: Partial<Robot>) => {
    setState((prev) => ({
      ...prev,
      robots: prev.robots.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }));
  }, []);

  // Ball operations
  const addBall = useCallback((color: BallColor, position?: Position) => {
    const ball: Ball = {
      id: generateId(),
      color,
      position: position || { x: 300, y: 300 },
      isScored: false,
      heldByRobotId: null,
    };

    setState((prev) => ({ ...prev, balls: [...prev.balls, ball] }));
  }, []);

  const updateBallPosition = useCallback((id: string, position: Position) => {
    setState((prev) => ({
      ...prev,
      balls: prev.balls.map((b) =>
        b.id === id ? { ...b, position } : b
      ),
    }));
  }, []);

  const removeBall = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      balls: prev.balls.filter((b) => b.id !== id),
    }));
  }, []);

  // Robot picks up ball
  const robotCollectBall = useCallback((robotId: string, ballId: string) => {
    setState((prev) => {
      const robot = prev.robots.find((r) => r.id === robotId);
      const ball = prev.balls.find((b) => b.id === ballId);

      if (!robot || !ball || robot.heldBalls.length >= DEFAULT_CONFIG.maxBallsPerRobot) {
        return prev;
      }

      return {
        ...prev,
        robots: prev.robots.map((r) =>
          r.id === robotId
            ? { ...r, heldBalls: [...r.heldBalls, { ...ball, heldByRobotId: robotId }] }
            : r
        ),
        balls: prev.balls.filter((b) => b.id !== ballId),
      };
    });
  }, []);

  const robotCollectBalls = useCallback((robotId: string, ballIds: string[]) => {
    setState((prev) => {
      const robot = prev.robots.find((r) => r.id === robotId);
      if (!robot || robot.heldBalls.length >= DEFAULT_CONFIG.maxBallsPerRobot) {
        return prev;
      }

      const ballMap = new Map(prev.balls.map((b) => [b.id, b]));
      const availableSpace = DEFAULT_CONFIG.maxBallsPerRobot - robot.heldBalls.length;
      const ballsToCollect = ballIds
        .map((id) => ballMap.get(id))
        .filter((ball): ball is Ball => Boolean(ball))
        .slice(0, availableSpace);

      if (ballsToCollect.length === 0) {
        return prev;
      }

      const collectedIds = new Set(ballsToCollect.map((ball) => ball.id));

      return {
        ...prev,
        robots: prev.robots.map((r) =>
          r.id === robotId
            ? { ...r, heldBalls: [...r.heldBalls, ...ballsToCollect.map((b) => ({ ...b, heldByRobotId: robotId }))] }
            : r
        ),
        balls: prev.balls.filter((b) => !collectedIds.has(b.id)),
      };
    });
  }, []);

  // Robot ejects single ball to classifier
  const robotEjectSingle = useCallback((robotId: string) => {
    setState((prev) => {
      const robot = prev.robots.find((r) => r.id === robotId);
      if (!robot || robot.heldBalls.length === 0) return prev;

      const ejectedBall = robot.heldBalls[0];
      const targetAlliance = robot.alliance;
      const classifier = prev.classifiers[targetAlliance];

      if (classifier.balls.length >= classifier.maxCapacity) return prev;

      return {
        ...prev,
        robots: prev.robots.map((r) =>
          r.id === robotId
            ? { ...r, heldBalls: r.heldBalls.slice(1) }
            : r
        ),
        classifiers: {
          ...prev.classifiers,
          [targetAlliance]: {
            ...classifier,
            balls: [...classifier.balls, { ...ejectedBall, isScored: true, heldByRobotId: null }],
          },
        },
      };
    });
  }, []);

  // Robot ejects all balls to classifier
  const robotEjectAll = useCallback((robotId: string) => {
    setState((prev) => {
      const robot = prev.robots.find((r) => r.id === robotId);
      if (!robot || robot.heldBalls.length === 0) return prev;

      const targetAlliance = robot.alliance;
      const classifier = prev.classifiers[targetAlliance];
      const availableSpace = classifier.maxCapacity - classifier.balls.length;
      const ballsToEject = robot.heldBalls.slice(0, availableSpace);

      return {
        ...prev,
        robots: prev.robots.map((r) =>
          r.id === robotId
            ? { ...r, heldBalls: r.heldBalls.slice(availableSpace) }
            : r
        ),
        classifiers: {
          ...prev.classifiers,
          [targetAlliance]: {
            ...classifier,
            balls: [
              ...classifier.balls,
              ...ballsToEject.map((b) => ({ ...b, isScored: true, heldByRobotId: null })),
            ],
          },
        },
      };
    });
  }, []);

  // Score ball directly to classifier (from goal)
  const scoreBallToClassifier = useCallback((ballId: string, alliance: Alliance) => {
    setState((prev) => {
      const ball = prev.balls.find((b) => b.id === ballId);
      const classifier = prev.classifiers[alliance];

      if (!ball || classifier.balls.length >= classifier.maxCapacity) return prev;

      return {
        ...prev,
        balls: prev.balls.filter((b) => b.id !== ballId),
        classifiers: {
          ...prev.classifiers,
          [alliance]: {
            ...classifier,
            balls: [...classifier.balls, { ...ball, isScored: true }],
          },
        },
      };
    });
  }, []);

  // Empty classifier to field corner
  const emptyClassifier = useCallback((alliance: Alliance) => {
    setState((prev) => {
      const classifier = prev.classifiers[alliance];
      if (classifier.balls.length === 0) return prev;

      const columns = 3;
      const zoneStartX = alliance === 'red' ? DEFAULT_CONFIG.fieldWidth - HUMAN_PLAYER_ZONE_SIZE : 0;
      const zoneStartY = DEFAULT_CONFIG.fieldHeight - HUMAN_PLAYER_ZONE_SIZE;
      const baseX = alliance === 'red'
        ? zoneStartX + HUMAN_PLAYER_ZONE_SIZE - HUMAN_PLAYER_ZONE_INSET - BALL_DIAMETER / 2 - (columns - 1) * HUMAN_PLAYER_SPACING
        : zoneStartX + HUMAN_PLAYER_ZONE_INSET + BALL_DIAMETER / 2;
      const baseY = zoneStartY + HUMAN_PLAYER_ZONE_SIZE - HUMAN_PLAYER_ZONE_INSET - BALL_DIAMETER / 2;

      const depositedBalls = classifier.balls.map((ball, index) => ({
        ...ball,
        isScored: false,
        position: {
          x: baseX + (index % columns) * HUMAN_PLAYER_SPACING,
          y: baseY - Math.floor(index / columns) * HUMAN_PLAYER_SPACING,
        },
      }));

      return {
        ...prev,
        balls: [...prev.balls, ...depositedBalls],
        classifiers: {
          ...prev.classifiers,
          [alliance]: { ...classifier, balls: [] },
        },
      };
    });
  }, []);

  const setupFieldArtifacts = useCallback(() => {
    setState((prev) => {
      const spikePositions = (['blue', 'red'] as Alliance[]).flatMap((alliance) =>
        SPIKE_MARKS[alliance].flatMap((mark) => {
          const centerX = mark.x * DEFAULT_CONFIG.fieldWidth;
          const centerY = mark.y * DEFAULT_CONFIG.fieldHeight;
          return [-SPIKE_ROW_HALF, 0, SPIKE_ROW_HALF].map((offsetX) => ({
            x: centerX + offsetX,
            y: centerY,
          }));
        })
      );

      const filteredBalls = prev.balls.filter((ball) => {
        return spikePositions.every((pos) => {
          const dx = ball.position.x - pos.x;
          const dy = ball.position.y - pos.y;
          return Math.sqrt(dx * dx + dy * dy) > SPIKE_CLEAR_RADIUS;
        });
      });

      const newArtifacts = (['blue', 'red'] as Alliance[]).flatMap((alliance) =>
        SPIKE_MARKS[alliance].flatMap((mark, rowIndex) => {
          const pattern = SPIKE_PATTERNS[alliance][rowIndex];
          const centerX = mark.x * DEFAULT_CONFIG.fieldWidth;
          const centerY = mark.y * DEFAULT_CONFIG.fieldHeight;
          return pattern.map((color, index) => ({
            id: generateId(),
            color,
            position: {
              x: Math.max(
                BALL_DIAMETER / 2,
                Math.min(
                  DEFAULT_CONFIG.fieldWidth - BALL_DIAMETER / 2,
                  centerX + (index - 1) * SPIKE_ROW_SPACING
                )
              ),
              y: centerY,
            },
            isScored: false,
            heldByRobotId: null,
          }));
        })
      );

      return {
        ...prev,
        balls: [...filteredBalls, ...newArtifacts],
      };
    });
  }, []);

  // Drawing operations
  const addDrawing = useCallback((path: DrawingPath) => {
    setState((prev) => ({ ...prev, drawings: [...prev.drawings, path] }));
  }, []);

  const removeDrawing = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      drawings: prev.drawings.filter((d) => d.id !== id),
    }));
  }, []);

  // Clear operations
  const clearDrawings = useCallback(() => {
    setState((prev) => ({ ...prev, drawings: [] }));
  }, []);

  const clearBalls = useCallback(() => {
    setState((prev) => ({
      ...prev,
      balls: [],
      classifiers: {
        red: { ...prev.classifiers.red, balls: [] },
        blue: { ...prev.classifiers.blue, balls: [] },
      },
      robots: prev.robots.map((r) => ({ ...r, heldBalls: [] })),
    }));
  }, []);

  const clearRobots = useCallback(() => {
    setState((prev) => ({ ...prev, robots: [] }));
  }, []);

  const resetField = useCallback(() => {
    setState(createInitialState());
    idCounter = 0;
  }, []);

  // Export/Import
  const exportState = useCallback(() => {
    return JSON.stringify(state, null, 2);
  }, [state]);

  const importState = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json) as FieldState;
      setState(parsed);
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    state,
    // Robot
    addRobot,
    updateRobotPosition,
    updateRobotRotation,
    updateRobotDetails,
    removeRobot,
    robotCollectBall,
    robotCollectBalls,
    robotEjectSingle,
    robotEjectAll,
    // Ball
    addBall,
    updateBallPosition,
    removeBall,
    scoreBallToClassifier,
    // Classifier
    emptyClassifier,
    setupFieldArtifacts,
    // Drawing
    addDrawing,
    removeDrawing,
    clearDrawings,
    // Clear
    clearBalls,
    clearRobots,
    resetField,
    // Export/Import
    exportState,
    importState,
  };
};
