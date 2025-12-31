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
const HUMAN_PLAYER_BOX_COLUMNS = 3;
const HUMAN_PLAYER_BOX_ROWS = 3;
const HUMAN_PLAYER_TUNNEL_SLOTS = 6;
const HUMAN_PLAYER_TUNNEL_INSET = 2;
const OCCUPIED_SLOT_RADIUS = 10;
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

const getHumanPlayerZoneStart = (alliance: Alliance) => {
  const zoneStartX = alliance === 'red' ? DEFAULT_CONFIG.fieldWidth - HUMAN_PLAYER_ZONE_SIZE : 0;
  const zoneStartY = DEFAULT_CONFIG.fieldHeight - HUMAN_PLAYER_ZONE_SIZE;
  return { zoneStartX, zoneStartY };
};

const getHumanPlayerSlots = (alliance: Alliance) => {
  const { zoneStartX, zoneStartY } = getHumanPlayerZoneStart(alliance);
  const baseX = alliance === 'red'
    ? zoneStartX + HUMAN_PLAYER_ZONE_SIZE - HUMAN_PLAYER_ZONE_INSET - BALL_DIAMETER / 2 - (HUMAN_PLAYER_BOX_COLUMNS - 1) * HUMAN_PLAYER_SPACING
    : zoneStartX + HUMAN_PLAYER_ZONE_INSET + BALL_DIAMETER / 2;
  const baseY = zoneStartY + HUMAN_PLAYER_ZONE_SIZE - HUMAN_PLAYER_ZONE_INSET - BALL_DIAMETER / 2;
  const boxSlots: Position[] = [];
  for (let row = 0; row < HUMAN_PLAYER_BOX_ROWS; row += 1) {
    for (let col = 0; col < HUMAN_PLAYER_BOX_COLUMNS; col += 1) {
      boxSlots.push({
        x: baseX + col * HUMAN_PLAYER_SPACING,
        y: baseY - row * HUMAN_PLAYER_SPACING,
      });
    }
  }

  const tunnelX = alliance === 'red'
    ? zoneStartX + HUMAN_PLAYER_ZONE_SIZE - HUMAN_PLAYER_TUNNEL_INSET - BALL_DIAMETER / 2
    : zoneStartX + HUMAN_PLAYER_TUNNEL_INSET + BALL_DIAMETER / 2;
  const tunnelStartY = zoneStartY - HUMAN_PLAYER_TUNNEL_INSET - BALL_DIAMETER / 2;
  const tunnelSlots: Position[] = Array.from({ length: HUMAN_PLAYER_TUNNEL_SLOTS }, (_, index) => ({
    x: tunnelX,
    y: tunnelStartY - index * HUMAN_PLAYER_SPACING,
  }));

  return { boxSlots, tunnelSlots };
};

const getOccupiedSlots = (balls: Ball[], slots: Position[]) => {
  return slots.map((slot) =>
    balls.some((ball) => {
      const dx = ball.position.x - slot.x;
      const dy = ball.position.y - slot.y;
      return Math.sqrt(dx * dx + dy * dy) <= OCCUPIED_SLOT_RADIUS;
    })
  );
};

const placeBallsInHumanZone = (balls: Ball[], existing: Ball[], alliance: Alliance) => {
  const { boxSlots, tunnelSlots } = getHumanPlayerSlots(alliance);
  const occupiedBox = getOccupiedSlots(existing, boxSlots);
  const occupiedTunnel = getOccupiedSlots(existing, tunnelSlots);
  const placed: Ball[] = [];

  balls.forEach((ball) => {
    const nextBoxIndex = occupiedBox.findIndex((filled) => !filled);
    if (nextBoxIndex !== -1) {
      occupiedBox[nextBoxIndex] = true;
      placed.push({ ...ball, position: boxSlots[nextBoxIndex] });
      return;
    }

    const nextTunnelIndex = occupiedTunnel.findIndex((filled) => !filled);
    if (nextTunnelIndex !== -1) {
      occupiedTunnel[nextTunnelIndex] = true;
      placed.push({ ...ball, position: tunnelSlots[nextTunnelIndex] });
      return;
    }
  });

  return placed;
};

export const useFieldState = () => {
  const [state, setState] = useState<FieldState>(createInitialState());

  // Robot operations
  const addRobot = useCallback((alliance: Alliance, position?: Position) => {
    const allianceCount = state.robots.filter((robot) => robot.alliance === alliance).length;
    if (
      state.robots.length >= DEFAULT_CONFIG.maxRobots ||
      allianceCount >= DEFAULT_CONFIG.maxRobotsPerAlliance
    ) {
      return null;
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
    return robot.id;
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

  const removeRobotBall = useCallback((robotId: string, ballId: string) => {
    setState((prev) => ({
      ...prev,
      robots: prev.robots.map((robot) => {
        if (robot.id !== robotId) return robot;
        return { ...robot, heldBalls: robot.heldBalls.filter((ball) => ball.id !== ballId) };
      }),
    }));
  }, []);

  // Robot ejects single ball to classifier
  const robotEjectSingle = useCallback((robotId: string) => {
    setState((prev) => {
      const robot = prev.robots.find((r) => r.id === robotId);
      if (!robot || robot.heldBalls.length === 0) return prev;

      const ejectedBall = robot.heldBalls[0];
      const targetAlliance = robot.alliance;
      const classifier = prev.classifiers[targetAlliance];

      if (classifier.balls.length >= classifier.maxCapacity) {
        const overflowBall: Ball = { ...ejectedBall, isScored: false, heldByRobotId: null };
        const placed = placeBallsInHumanZone([overflowBall], prev.balls, targetAlliance);
        return {
          ...prev,
          robots: prev.robots.map((r) =>
            r.id === robotId
              ? { ...r, heldBalls: r.heldBalls.slice(1) }
              : r
          ),
          balls: [...prev.balls, ...placed],
        };
      }

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
      const ballsToEject = robot.heldBalls.slice(0, Math.max(0, availableSpace));
      const overflowBalls = robot.heldBalls.slice(ballsToEject.length);
      const overflowPlaced = overflowBalls.length > 0
        ? placeBallsInHumanZone(
            overflowBalls.map((ball) => ({ ...ball, isScored: false, heldByRobotId: null })),
            prev.balls,
            targetAlliance
          )
        : [];

      return {
        ...prev,
        robots: prev.robots.map((r) =>
          r.id === robotId
            ? { ...r, heldBalls: [] }
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
        balls: [...prev.balls, ...overflowPlaced],
      };
    });
  }, []);

  // Score ball directly to classifier (from goal)
  const scoreBallToClassifier = useCallback((ballId: string, alliance: Alliance) => {
    setState((prev) => {
      const ball = prev.balls.find((b) => b.id === ballId);
      const classifier = prev.classifiers[alliance];

      if (!ball) return prev;
      if (classifier.balls.length >= classifier.maxCapacity) {
        const overflowBall: Ball = { ...ball, isScored: false, heldByRobotId: null };
        const placed = placeBallsInHumanZone([overflowBall], prev.balls, alliance);
        return {
          ...prev,
          balls: [...prev.balls.filter((b) => b.id !== ballId), ...placed],
        };
      }

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

  const cycleRobotBalls = useCallback((robotId: string) => {
    setState((prev) => ({
      ...prev,
      robots: prev.robots.map((robot) => {
        if (robot.id !== robotId || robot.heldBalls.length < 2) return robot;
        const last = robot.heldBalls[robot.heldBalls.length - 1];
        const rest = robot.heldBalls.slice(0, -1);
        return { ...robot, heldBalls: [last, ...rest] };
      }),
    }));
  }, []);

  // Empty classifier to field corner
  const emptyClassifier = useCallback((alliance: Alliance) => {
    setState((prev) => {
      const classifier = prev.classifiers[alliance];
      if (classifier.balls.length === 0) return prev;

      const depositedBalls = placeBallsInHumanZone(
        classifier.balls.map((ball) => ({ ...ball, isScored: false, heldByRobotId: null })),
        prev.balls,
        alliance
      );

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

  // Pop one ball from classifier to field corner
  const popClassifierBall = useCallback((alliance: Alliance) => {
    setState((prev) => {
      const classifier = prev.classifiers[alliance];
      if (classifier.balls.length === 0) return prev;

      const index = classifier.balls.length - 1;
      const ball = classifier.balls[index];
      const poppedBall: Ball = {
        ...ball,
        isScored: false,
        heldByRobotId: null,
      };
      const placed = placeBallsInHumanZone([poppedBall], prev.balls, alliance);

      return {
        ...prev,
        balls: [...prev.balls, ...placed],
        classifiers: {
          ...prev.classifiers,
          [alliance]: { ...classifier, balls: classifier.balls.slice(0, -1) },
        },
      };
    });
  }, []);

  const setupFieldArtifacts = useCallback(() => {
    setState((prev) => {
      const spikeArtifacts = (['blue', 'red'] as Alliance[]).flatMap((alliance) =>
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
                  centerX + (index - 1) * HUMAN_PLAYER_SPACING
                )
              ),
              y: centerY,
            },
            isScored: false,
            heldByRobotId: null,
          }));
        })
      );

      const colors: BallColor[] = ['green', 'purple', 'purple'];
      const humanZoneArtifacts = (['blue', 'red'] as Alliance[]).flatMap((alliance) => {
        const seeded = colors.map((color) => ({
          id: generateId(),
          color,
          position: { x: 0, y: 0 },
          isScored: false,
          heldByRobotId: null,
        }));
        return placeBallsInHumanZone(seeded, [...prev.balls, ...spikeArtifacts], alliance);
      });

      return {
        ...prev,
        balls: [...spikeArtifacts, ...humanZoneArtifacts],
      };
    });
  }, []);

  const addHumanPlayerBall = useCallback((alliance: Alliance, color: BallColor) => {
    const { boxSlots } = getHumanPlayerSlots(alliance);
    const occupiedBox = getOccupiedSlots(state.balls, boxSlots);
    const slotIndex = occupiedBox.findIndex((filled) => !filled);
    if (slotIndex === -1) {
      return false;
    }
    const newBall: Ball = {
      id: generateId(),
      color,
      position: boxSlots[slotIndex],
      isScored: false,
      heldByRobotId: null,
    };
    setState((prev) => ({
      ...prev,
      balls: [...prev.balls, newBall],
    }));
    return true;
  }, [state.balls]);

  const loadRobotBalls = useCallback((robotId: string, colors: BallColor[]) => {
    setState((prev) => ({
      ...prev,
      robots: prev.robots.map((robot) => {
        if (robot.id !== robotId) return robot;
        const heldBalls = colors.slice(0, DEFAULT_CONFIG.maxBallsPerRobot).map((color) => ({
          id: generateId(),
          color,
          position: { ...robot.position },
          isScored: false,
          heldByRobotId: robotId,
        }));
        return { ...robot, heldBalls };
      }),
    }));
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
    removeRobotBall,
    robotEjectSingle,
    robotEjectAll,
    cycleRobotBalls,
    // Ball
    addBall,
    updateBallPosition,
    removeBall,
    scoreBallToClassifier,
    // Classifier
    emptyClassifier,
    popClassifierBall,
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
    // Human Player Zone
    addHumanPlayerBall,
    loadRobotBalls,
  };
};
