import { useState, useCallback } from 'react';
import {
  FieldState,
  Robot,
  Ball,
  Position,
  DrawingPath,
  Alliance,
  BallColor,
  createInitialState,
  DEFAULT_CONFIG,
} from '@/types/planner';

let idCounter = 0;
const generateId = () => `id-${++idCounter}-${Date.now()}`;

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
      size: 75, // ~3/4 of a tile
      alliance,
      heldBalls: [],
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

      const spacing = 25;
      const columns = 3;
      const padding = 60;
      const baseX = alliance === 'red'
        ? DEFAULT_CONFIG.fieldWidth - padding - (columns - 1) * spacing
        : padding;
      const baseY = DEFAULT_CONFIG.fieldHeight - padding;

      const depositedBalls = classifier.balls.map((ball, index) => ({
        ...ball,
        isScored: false,
        position: {
          x: baseX + (index % columns) * spacing,
          y: baseY - Math.floor(index / columns) * spacing,
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
    removeRobot,
    robotCollectBall,
    robotEjectSingle,
    robotEjectAll,
    // Ball
    addBall,
    updateBallPosition,
    removeBall,
    scoreBallToClassifier,
    // Classifier
    emptyClassifier,
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
