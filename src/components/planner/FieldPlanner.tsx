import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useFieldState } from '@/hooks/useFieldState';
import { Tool, DEFAULT_CONFIG } from '@/types/planner';
import fieldImage from '@/assets/ftc-decode-field-2.png';
import { RobotElement } from './RobotElement';
import { BallElement } from './BallElement';
import { DrawingCanvas } from './DrawingCanvas';
import { ToolPanel } from './ToolPanel';
import { ClassifierDisplay } from './ClassifierDisplay';
import { toast } from 'sonner';
import { Goal, Save, Settings, X } from 'lucide-react';

const FIELD_SIZE = 600;
const FIELD_INCHES = 144;
const GOAL_WIDTH = 120;
const GOAL_HEIGHT = 156;
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
const MAX_ROBOT_INCHES = 18;
const MIN_ROBOT_INCHES = 1;
const CLASSIFIER_ZONE = {
  blue: { x: 0, y: 126, width: 14, height: 162 },
  red: { x: FIELD_SIZE - 14, y: 126, width: 14, height: 162 },
};
const GOAL_ZONE = {
  blue: { x: 0, y: 0, width: GOAL_WIDTH, height: GOAL_HEIGHT },
  red: { x: FIELD_SIZE - GOAL_WIDTH, y: 0, width: GOAL_WIDTH, height: GOAL_HEIGHT },
};
const LEVER_RADIUS = 6;
const LEVER_POSITION = {
  blue: {
    x: CLASSIFIER_ZONE.blue.x + CLASSIFIER_ZONE.blue.width + 20,
    y: CLASSIFIER_ZONE.blue.y + CLASSIFIER_ZONE.blue.height - 20,
  },
  red: {
    x: CLASSIFIER_ZONE.red.x - CLASSIFIER_ZONE.red.width - 20,
    y: CLASSIFIER_ZONE.red.y + CLASSIFIER_ZONE.red.height - 20,
  },
};
const THEME_STORAGE_KEY = 'planner-theme-mode';
const KEYBINDS_STORAGE_KEY = 'planner-keybinds';
const DEFAULT_KEYBINDS = {
  select: 's',
  pen: 'p',
  dotted: 'd',
  arrow: 'a',
  eraser: 'e',
  intake: 'i',
  outtakeSingle: 'o',
  outtakeAll: 'k',
  cycle: 'l',
  rotateLeft: 'arrowleft',
  rotateRight: 'arrowright',
};
type ThemeMode = 'basic' | 'dark' | 'light';
type Keybinds = typeof DEFAULT_KEYBINDS;

export const FieldPlanner = () => {
  const {
    state,
    addRobot,
    updateRobotPosition,
    updateRobotRotation,
    updateRobotDetails,
    removeRobot,
    robotEjectSingle,
    robotEjectAll,
    robotCollectBall,
    robotCollectBalls,
    removeRobotBall,
    cycleRobotBalls,
    addBall,
    updateBallPosition,
    removeBall,
    scoreBallToClassifier,
    emptyClassifier,
    popClassifierBall,
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
  const [themeMode, setThemeMode] = useState<ThemeMode>('basic');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftThemeMode, setDraftThemeMode] = useState<ThemeMode>('basic');
  const [keybinds, setKeybinds] = useState<Keybinds>(DEFAULT_KEYBINDS);
  const [draftKeybinds, setDraftKeybinds] = useState<Keybinds>(DEFAULT_KEYBINDS);
  const [robotPanelOpen, setRobotPanelOpen] = useState(false);
  const [classifierEmptying, setClassifierEmptying] = useState({ red: false, blue: false });
  const [robotDraft, setRobotDraft] = useState<{
    widthIn: number;
    heightIn: number;
    name: string;
    imageDataUrl: string | null;
  } | null>(null);
  const [draftRobotId, setDraftRobotId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const robotImageInputRef = useRef<HTMLInputElement>(null);
  const leverContactRef = useRef<{ red: number | null; blue: number | null }>({
    red: null,
    blue: null,
  });
  const manualClassifierEmptyingRef = useRef({ red: false, blue: false });
  const manualEmptyingTimeoutRef = useRef<{ red: number | null; blue: number | null }>({
    red: null,
    blue: null,
  });
  const fieldRef = useRef<HTMLDivElement>(null);
  const redClassifierRef = useRef<HTMLDivElement>(null);
  const blueClassifierRef = useRef<HTMLDivElement>(null);
  const redClassifierFieldRef = useRef<HTMLDivElement>(null);
  const blueClassifierFieldRef = useRef<HTMLDivElement>(null);
  const isInputLocked = timerRunning && timerPhase === 'transition';
  const pixelsPerInch = FIELD_SIZE / FIELD_INCHES;

  const normalizeKey = useCallback((value: string) => value.trim().toLowerCase(), []);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (storedTheme) {
      setThemeMode(storedTheme);
      setDraftThemeMode(storedTheme);
    }

    const storedKeybinds = window.localStorage.getItem(KEYBINDS_STORAGE_KEY);
    if (storedKeybinds) {
      try {
        const parsed = JSON.parse(storedKeybinds) as Partial<Keybinds>;
        const merged = { ...DEFAULT_KEYBINDS, ...parsed };
        setKeybinds(merged);
        setDraftKeybinds(merged);
      } catch {
        setKeybinds(DEFAULT_KEYBINDS);
        setDraftKeybinds(DEFAULT_KEYBINDS);
      }
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-basic', 'theme-dark', 'theme-light');
    root.classList.add(`theme-${themeMode}`);
  }, [themeMode]);

  const rotateSelectedRobot = useCallback(
    (delta: number) => {
      if (!selectedRobotId) return;
      const robot = state.robots.find((item) => item.id === selectedRobotId);
      if (!robot) return;
      updateRobotRotation(selectedRobotId, robot.rotation + delta);
    },
    [selectedRobotId, state.robots, updateRobotRotation]
  );

  const handleClassifierAction = useCallback((alliance: 'red' | 'blue', action: () => void) => {
    manualClassifierEmptyingRef.current[alliance] = true;
    setClassifierEmptying((prev) => ({ ...prev, [alliance]: true }));
    if (manualEmptyingTimeoutRef.current[alliance]) {
      window.clearTimeout(manualEmptyingTimeoutRef.current[alliance]);
    }
    manualEmptyingTimeoutRef.current[alliance] = window.setTimeout(() => {
      manualClassifierEmptyingRef.current[alliance] = false;
      setClassifierEmptying((prev) => ({ ...prev, [alliance]: false }));
    }, 1000);
    action();
  }, []);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.target instanceof HTMLTextAreaElement) return;
      if (isInputLocked) return;
      if (settingsOpen) return;

      const key = e.key.toLowerCase();
      switch (key) {
        case keybinds.select:
          setActiveTool('select');
          break;
        case keybinds.pen:
          setActiveTool('pen');
          break;
        case keybinds.dotted:
          setActiveTool('dotted');
          break;
        case keybinds.arrow:
          setActiveTool('arrow');
          break;
        case keybinds.eraser:
          setActiveTool('eraser');
          break;
        case keybinds.rotateLeft:
          e.preventDefault();
          rotateSelectedRobot(-15);
          break;
        case keybinds.rotateRight:
          e.preventDefault();
          rotateSelectedRobot(15);
          break;
        case keybinds.intake:
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
        case keybinds.outtakeSingle:
          if (selectedRobotId) {
            handleRobotShoot(selectedRobotId, 'single');
          }
          break;
        case keybinds.outtakeAll:
          if (selectedRobotId) {
            handleRobotShoot(selectedRobotId, 'all');
          }
          break;
        case keybinds.cycle:
          if (selectedRobotId) {
            cycleRobotBalls(selectedRobotId);
          }
          break;
        case 'escape':
          setSelectedRobotId(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cycleRobotBalls, handleRobotShoot, isInputLocked, keybinds, rotateSelectedRobot, selectedRobotId, settingsOpen]);

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
    if (!selectedRobotId) {
      setRobotPanelOpen(false);
      setRobotDraft(null);
      setDraftRobotId(null);
      return;
    }

    if (!robotPanelOpen) return;
    if (selectedRobotId === draftRobotId) return;
    const robot = state.robots.find((item) => item.id === selectedRobotId);
    if (!robot) {
      setRobotPanelOpen(false);
      setRobotDraft(null);
      setDraftRobotId(null);
      return;
    }

    setRobotDraft({
      widthIn: robot.widthIn ?? 18,
      heightIn: robot.heightIn ?? 18,
      name: robot.name ?? '',
      imageDataUrl: robot.imageDataUrl ?? null,
    });
    setDraftRobotId(selectedRobotId);
  }, [draftRobotId, robotPanelOpen, selectedRobotId, state.robots]);

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

  const getRobotDimensions = useCallback(
    (robot: typeof state.robots[number]) => {
      const widthIn = Math.min(MAX_ROBOT_INCHES, Math.max(MIN_ROBOT_INCHES, robot.widthIn ?? 18));
      const heightIn = Math.min(MAX_ROBOT_INCHES, Math.max(MIN_ROBOT_INCHES, robot.heightIn ?? 18));
      return {
        width: widthIn * pixelsPerInch,
        height: heightIn * pixelsPerInch,
      };
    },
    [pixelsPerInch]
  );

  const getRobotRect = useCallback((x: number, y: number, width: number, height: number) => {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    return {
      left: x - halfWidth,
      right: x + halfWidth,
      top: y - halfHeight,
      bottom: y + halfHeight,
    };
  }, []);

  const isRobotTouchingLever = useCallback(
    (robot: typeof state.robots[number], lever: { x: number; y: number }) => {
      const { width, height } = getRobotDimensions(robot);
      const rect = getRobotRect(robot.position.x, robot.position.y, width, height);
      const closestX = Math.max(rect.left, Math.min(lever.x, rect.right));
      const closestY = Math.max(rect.top, Math.min(lever.y, rect.bottom));
      const dx = lever.x - closestX;
      const dy = lever.y - closestY;
      return dx * dx + dy * dy <= LEVER_RADIUS * LEVER_RADIUS;
    },
    [getRobotDimensions, getRobotRect]
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      (['blue', 'red'] as const).forEach((alliance) => {
        const lever = LEVER_POSITION[alliance];
        const touchingRobot = state.robots.find((robot) => isRobotTouchingLever(robot, lever));
        const isTouching = Boolean(touchingRobot);
        const isManual = manualClassifierEmptyingRef.current[alliance];
        setClassifierEmptying((prev) => {
          const next = isTouching || isManual;
          if (prev[alliance] === next) return prev;
          return { ...prev, [alliance]: next };
        });
        const now = Date.now();

        if (touchingRobot) {
          if (!leverContactRef.current[alliance]) {
            leverContactRef.current[alliance] = now;
            return;
          }
          if (now - leverContactRef.current[alliance] >= 1000) {
            emptyClassifier(alliance);
            leverContactRef.current[alliance] = null;
          }
          return;
        }

        leverContactRef.current[alliance] = null;
      });
    }, 200);

    return () => window.clearInterval(interval);
  }, [emptyClassifier, isRobotTouchingLever, state.robots]);

  const handleFieldClick = () => {
    if (isInputLocked) return;
    if (robotPanelOpen) return;
    if (settingsOpen) return;
    setSelectedRobotId(null);
  };

  const motifs = ['GPP', 'PGP', 'PPG'];
  const defaultNameMap = useMemo(() => {
    const map = new Map<string, string>();
    const blueRobots = state.robots.filter((robot) => robot.alliance === 'blue');
    const redRobots = state.robots.filter((robot) => robot.alliance === 'red');
    blueRobots.forEach((robot, index) => {
      if (!robot.name) {
        map.set(robot.id, `${index + 1}`);
      }
    });
    redRobots.forEach((robot, index) => {
      if (!robot.name) {
        map.set(robot.id, `${index + 3}`);
      }
    });
    return map;
  }, [state.robots]);

  const getRobotDisplayName = useCallback(
    (robot: typeof state.robots[number]) => robot.name?.trim() || defaultNameMap.get(robot.id) || '',
    [defaultNameMap]
  );

  const getDefaultNameForRobot = useCallback(
    (robot: typeof state.robots[number]) => {
      const allianceRobots = state.robots.filter((item) => item.alliance === robot.alliance);
      const index = allianceRobots.findIndex((item) => item.id === robot.id);
      if (index === -1) return '';
      return robot.alliance === 'blue' ? `${index + 1}` : `${index + 3}`;
    },
    [state.robots]
  );

  const rectsOverlap = useCallback(
    (a: ReturnType<typeof getRobotRect>, b: ReturnType<typeof getRobotRect>) => {
      return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    },
    [getRobotRect]
  );

  const isPointInBlueGoal = useCallback((x: number, y: number) => {
    const { width, height } = GOAL_ZONE.blue;
    return (
      x >= 0 &&
      y >= 0 &&
      x <= width &&
      y <= height &&
      x / width + y / height <= 1
    );
  }, []);

  const isPointInRedGoal = useCallback((x: number, y: number) => {
    const xFromRight = FIELD_SIZE - x;
    const { width, height } = GOAL_ZONE.red;
    return (
      xFromRight >= 0 &&
      y >= 0 &&
      xFromRight <= width &&
      y <= height &&
      xFromRight / width + y / height <= 1
    );
  }, []);

  const isRectInGoal = useCallback(
    (rect: ReturnType<typeof getRobotRect>) => {
      const corners = [
        { x: rect.left, y: rect.top },
        { x: rect.right, y: rect.top },
        { x: rect.left, y: rect.bottom },
        { x: rect.right, y: rect.bottom },
      ];
      return corners.some((corner) => isPointInBlueGoal(corner.x, corner.y) || isPointInRedGoal(corner.x, corner.y));
    },
    [isPointInBlueGoal, isPointInRedGoal, getRobotRect]
  );

  const isRectInClassifier = useCallback(
    (rect: ReturnType<typeof getRobotRect>) => {
      const blueZone = getRobotRect(
        CLASSIFIER_ZONE.blue.x + CLASSIFIER_ZONE.blue.width / 2,
        CLASSIFIER_ZONE.blue.y + CLASSIFIER_ZONE.blue.height / 2,
        CLASSIFIER_ZONE.blue.width,
        CLASSIFIER_ZONE.blue.height
      );
      const redZone = getRobotRect(
        CLASSIFIER_ZONE.red.x + CLASSIFIER_ZONE.red.width / 2,
        CLASSIFIER_ZONE.red.y + CLASSIFIER_ZONE.red.height / 2,
        CLASSIFIER_ZONE.red.width,
        CLASSIFIER_ZONE.red.height
      );
      const blueGoal = getRobotRect(
        GOAL_ZONE.blue.x + GOAL_ZONE.blue.width / 2,
        GOAL_ZONE.blue.y + GOAL_ZONE.blue.height / 2,
        GOAL_ZONE.blue.width,
        GOAL_ZONE.blue.height
      );
      const redGoal = getRobotRect(
        GOAL_ZONE.red.x + GOAL_ZONE.red.width / 2,
        GOAL_ZONE.red.y + GOAL_ZONE.red.height / 2,
        GOAL_ZONE.red.width,
        GOAL_ZONE.red.height
      );
      return rectsOverlap(rect, blueZone) || rectsOverlap(rect, redZone) || 
      rectsOverlap(rect, blueGoal) || rectsOverlap(rect, redGoal);
    },
    [getRobotRect, rectsOverlap]
  );

  const clampToField = useCallback(
    (pos: { x: number; y: number }, width: number, height: number) => {
      const halfWidth = width / 2;
      const halfHeight = height / 2;
      return {
        x: Math.max(halfWidth, Math.min(FIELD_SIZE - halfWidth, pos.x)),
        y: Math.max(halfHeight, Math.min(FIELD_SIZE - halfHeight, pos.y)),
      };
    },
    []
  );

  const resolveSolidOverlap = useCallback(
    (
      pos: { x: number; y: number },
      width: number,
      height: number,
      solids: Array<ReturnType<typeof getRobotRect>>
    ) => {
      let nextPos = pos;
      solids.forEach((solid) => {
        const rect = getRobotRect(nextPos.x, nextPos.y, width, height);
        if (!rectsOverlap(rect, solid)) return;

        const overlapX = Math.min(rect.right, solid.right) - Math.max(rect.left, solid.left);
        const overlapY = Math.min(rect.bottom, solid.bottom) - Math.max(rect.top, solid.top);
        if (overlapX <= 0 || overlapY <= 0) return;

        if (overlapX < overlapY) {
          const pushX = rect.right > solid.right ? overlapX : -overlapX;
          nextPos = { ...nextPos, x: nextPos.x + pushX };
        } else {
          const pushY = rect.bottom > solid.bottom ? overlapY : -overlapY;
          nextPos = { ...nextPos, y: nextPos.y + pushY };
        }
      });
      return nextPos;
    },
    [getRobotRect, rectsOverlap]
  );

  const resolveGoalTriangleOverlap = useCallback(
    (pos: { x: number; y: number }, width: number, height: number) => {
      let nextPos = pos;
      const goalWidth = GOAL_ZONE.blue.width;
      const goalHeight = GOAL_ZONE.blue.height;
      const invGoalWidth = 1 / goalWidth;
      const invGoalHeight = 1 / goalHeight;
      const normalScale = 1 / (invGoalWidth * invGoalWidth + invGoalHeight * invGoalHeight);

      const blueRect = getRobotRect(nextPos.x, nextPos.y, width, height);
      if (blueRect.left < goalWidth && blueRect.top < goalHeight) {
        const blueValue = blueRect.left * invGoalWidth + blueRect.top * invGoalHeight;
        if (blueValue < 1) {
          const offset = (1 - blueValue) * normalScale;
          nextPos = {
            x: nextPos.x + offset * invGoalWidth,
            y: nextPos.y + offset * invGoalHeight,
          };
        }
      }

      const redRect = getRobotRect(nextPos.x, nextPos.y, width, height);
      if (redRect.right > FIELD_SIZE - goalWidth && redRect.top < goalHeight) {
        const redValue =
          (FIELD_SIZE - redRect.right) * invGoalWidth + redRect.top * invGoalHeight;
        if (redValue < 1) {
          const offset = (1 - redValue) * normalScale;
          nextPos = {
            x: nextPos.x - offset * invGoalWidth,
            y: nextPos.y + offset * invGoalHeight,
          };
        }
      }

      return nextPos;
    },
    [getRobotRect]
  );

  const handleRandomizeMotif = () => {
    const next = motifs[Math.floor(Math.random() * motifs.length)];
    setMotif(next);
  };

  const handleSetupField = () => {
    clearBalls();
    setupFieldArtifacts();
    toast.success('Artifacts placed on spike marks.');
  };

  const handleSetupRobots = () => {
    const blueRobots = state.robots.filter((robot) => robot.alliance === 'blue');
    const redRobots = state.robots.filter((robot) => robot.alliance === 'red');

    const ensureRobot = (alliance: 'blue' | 'red', index: number, position: { x: number; y: number }) => {
      const robots = alliance === 'blue' ? blueRobots : redRobots;
      const existing = robots[index];
      if (!existing) {
        addRobot(alliance, position);
        return;
      }
      updateRobotPosition(existing.id, position);
    };

    const goalInset = 40;
    const tileOffset = DEFAULT_CONFIG.tileSize;
    const farInset = 60;
    ensureRobot('blue', 0, { x: goalInset + tileOffset, y: goalInset + tileOffset });
    ensureRobot('blue', 1, { x: farInset, y: FIELD_SIZE - farInset });
    ensureRobot('red', 0, { x: FIELD_SIZE - goalInset - tileOffset, y: goalInset + tileOffset });
    ensureRobot('red', 1, { x: FIELD_SIZE - farInset, y: FIELD_SIZE - farInset });
    toast.success('Sample robots positioned.');
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
    const { width, height } = GOAL_ZONE.blue;
    if (x >= 0 && y >= 0 && x <= width && y <= height && x / width + y / height <= 1) {
      return 'blue';
    }

    const xFromRight = FIELD_SIZE - x;
    if (
      xFromRight >= 0 &&
      y >= 0 &&
      xFromRight <= width &&
      y <= height &&
      xFromRight / width + y / height <= 1
    ) {
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
        const { width, height } = getRobotDimensions(robot);
        if (distance < Math.max(width, height) / 2 + 10) {
          if (robot.heldBalls.length < DEFAULT_CONFIG.maxBallsPerRobot) {
            return robot.id;
          }
        }
      }
      return null;
    },
    [getRobotDimensions, state.robots]
  );

  const getIntakeRobotForBall = useCallback(
    (x: number, y: number) => {
      for (const robot of state.robots) {
        const modes = robotModes[robot.id];
        if (!modes?.intake) continue;
        const dx = x - robot.position.x;
        const dy = y - robot.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const { width, height } = getRobotDimensions(robot);
        if (distance < Math.max(width, height) / 2 + 10 && robot.heldBalls.length < DEFAULT_CONFIG.maxBallsPerRobot) {
          return robot.id;
        }
      }
      return null;
    },
    [getRobotDimensions, robotModes, state.robots]
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
      const movingRobot = state.robots.find((item) => item.id === robotId);
      if (!movingRobot) return;
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

      const movingDimensions = getRobotDimensions(movingRobot);
      let candidate = clampToField({ x: nextX, y: nextY }, movingDimensions.width, movingDimensions.height);
      const solidRects = [
        getRobotRect(
          CLASSIFIER_ZONE.blue.x + CLASSIFIER_ZONE.blue.width / 2,
          CLASSIFIER_ZONE.blue.y + CLASSIFIER_ZONE.blue.height / 2,
          CLASSIFIER_ZONE.blue.width,
          CLASSIFIER_ZONE.blue.height
        ),
        getRobotRect(
          CLASSIFIER_ZONE.red.x + CLASSIFIER_ZONE.red.width / 2,
          CLASSIFIER_ZONE.red.y + CLASSIFIER_ZONE.red.height / 2,
          CLASSIFIER_ZONE.red.width,
          CLASSIFIER_ZONE.red.height
        ),
      ];
      candidate = resolveSolidOverlap(candidate, movingDimensions.width, movingDimensions.height, solidRects);
      candidate = resolveGoalTriangleOverlap(candidate, movingDimensions.width, movingDimensions.height);

      candidate = clampToField(candidate, movingDimensions.width, movingDimensions.height);
      updateRobotPosition(robotId, { x: candidate.x, y: candidate.y });

      const robot = movingRobot;
      const modes = robotModes[robotId];
      if (!robot || !modes) return;

      if (modes.intake) {
        const inRange = state.balls
          .map((ball) => {
            const dx = ball.position.x - candidate.x;
            const dy = ball.position.y - candidate.y;
            return { ball, distance: Math.sqrt(dx * dx + dy * dy) };
          })
          .filter(({ distance }) => {
            const { width, height } = getRobotDimensions(robot);
            return distance < Math.max(width, height) / 2 + 10;
          })
          .sort((a, b) => a.distance - b.distance)
          .map(({ ball }) => ball.id);

        if (inRange.length > 0) {
          robotCollectBalls(robotId, inRange);
        }
      }

      if (modes.outtake && robot.heldBalls.length > 0) {
        const goalTarget = getGoalTargetForPosition(candidate.x, candidate.y);
        if (goalTarget && goalTarget === robot.alliance) {
          handleRobotShoot(robotId, 'all');
        }
      }
    },
    [
      getGoalTargetForPosition,
      handleRobotShoot,
      isInputLocked,
      getRobotDimensions,
      clampToField,
      resolveSolidOverlap,
      resolveGoalTriangleOverlap,
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

  const handleRobotImageSelect = () => {
    robotImageInputRef.current?.click();
  };

  const handleRobotImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRobotDraft((prev) => (prev ? { ...prev, imageDataUrl: content } : prev));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRobotPanelOpen = useCallback(
    (robotId: string) => {
      const robot = state.robots.find((item) => item.id === robotId);
      if (!robot) return;
      setSelectedRobotId(robotId);
      setRobotDraft({
        widthIn: robot.widthIn ?? 18,
        heightIn: robot.heightIn ?? 18,
        name: robot.name ?? '',
        imageDataUrl: robot.imageDataUrl ?? null,
      });
      setRobotPanelOpen(true);
      setDraftRobotId(robotId);
    },
    [state.robots]
  );

  const handleRobotPanelClose = () => {
    setRobotPanelOpen(false);
    setRobotDraft(null);
    setDraftRobotId(null);
  };

  const handleClassifierEmpty = useCallback(
    (alliance: 'red' | 'blue') => {
      handleClassifierAction(alliance, () => emptyClassifier(alliance));
    },
    [emptyClassifier, handleClassifierAction]
  );

  const handleClassifierPop = useCallback(
    (alliance: 'red' | 'blue') => {
      handleClassifierAction(alliance, () => popClassifierBall(alliance));
    },
    [handleClassifierAction, popClassifierBall]
  );

  const handleRobotSave = () => {
    if (!selectedRobotId || !robotDraft) return;
    const name = robotDraft.name.trim();
    const isNameValid = name === '' || /^\d{1,5}$/.test(name);
    if (!isNameValid) {
      toast.error('Robot name must be 1-5 digits.');
      return;
    }

    const selected = state.robots.find((robot) => robot.id === selectedRobotId);
    const proposedName = name || (selected ? getDefaultNameForRobot(selected) : '');
    const takenNames = state.robots
      .filter((robot) => robot.id !== selectedRobotId)
      .map((robot) => getRobotDisplayName(robot));
    if (takenNames.includes(proposedName)) {
      toast.error('Robot names must be unique.');
      return;
    }

    updateRobotDetails(selectedRobotId, {
      widthIn: Math.min(MAX_ROBOT_INCHES, Math.max(MIN_ROBOT_INCHES, robotDraft.widthIn)),
      heightIn: Math.min(MAX_ROBOT_INCHES, Math.max(MIN_ROBOT_INCHES, robotDraft.heightIn)),
      name,
      imageDataUrl: robotDraft.imageDataUrl,
    });
    setRobotPanelOpen(false);
    setRobotDraft(null);
    setDraftRobotId(null);
    setSelectedRobotId(null);
  };

  const handleOpenSettings = () => {
    setDraftThemeMode(themeMode);
    setDraftKeybinds(keybinds);
    setSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setSettingsOpen(false);
  };

  const handleSaveSettings = () => {
    setThemeMode(draftThemeMode);
    setKeybinds(draftKeybinds);
    window.localStorage.setItem(THEME_STORAGE_KEY, draftThemeMode);
    window.localStorage.setItem(KEYBINDS_STORAGE_KEY, JSON.stringify(draftKeybinds));
    setSettingsOpen(false);
  };

  const selectedRobot = selectedRobotId
    ? state.robots.find((robot) => robot.id === selectedRobotId)
    : null;
  const draftName = robotDraft?.name.trim() ?? '';
  const nameIsValid = draftName === '' || /^\d{1,5}$/.test(draftName);
  const proposedName = draftName || (selectedRobot ? getDefaultNameForRobot(selectedRobot) : '');
  const nameIsUnique = selectedRobot
    ? !state.robots
        .filter((robot) => robot.id !== selectedRobot.id)
        .map((robot) => getRobotDisplayName(robot))
        .includes(proposedName)
    : true;
  const canSaveRobot = Boolean(robotDraft && nameIsValid && nameIsUnique);

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <button
        onClick={handleOpenSettings}
        className="tool-button fixed top-4 right-4 z-40 w-10 h-10"
        title="Settings"
        aria-label="Open settings"
      >
        <Settings className="w-4 h-4" />
      </button>
      {/* Left Panel */}
      <div className="w-64 p-4 border-r border-border flex-shrink-0 h-full overflow-y-auto">
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
          onSetupRobots={handleSetupRobots}
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
      <div className="flex-1 flex items-start justify-center p-8 pt-4 field-container">
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
          {classifierEmptying.blue && (
            <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-yellow-300 text-yellow-900 text-xs font-mono flex items-center justify-center border border-yellow-500 shadow">
              o
            </div>
          )}
          {classifierEmptying.red && (
            <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-yellow-300 text-yellow-900 text-xs font-mono flex items-center justify-center border border-yellow-500 shadow">
              o
            </div>
          )}

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
          {state.robots.map((robot) => {
            const dimensions = getRobotDimensions(robot);
            const displayName = getRobotDisplayName(robot);
            return (
              <RobotElement
                key={robot.id}
                robot={robot}
                dimensions={dimensions}
                displayName={displayName}
                isSelected={selectedRobotId === robot.id}
                onSelect={() => {
                  setSelectedRobotId(robot.id);
                }}
                onPositionChange={(x, y) => handleRobotMove(robot.id, x, y)}
                onRotate={(delta) => updateRobotRotation(robot.id, robot.rotation + delta)}
                onEdit={() => handleRobotPanelOpen(robot.id)}
                onRemove={() => {
                  removeRobot(robot.id);
                  setSelectedRobotId(null);
                  handleRobotPanelClose();
                }}
                onEjectSingle={() => handleRobotShoot(robot.id, 'single')}
                onEjectAll={() => handleRobotShoot(robot.id, 'all')}
                fieldBounds={{ width: FIELD_SIZE, height: FIELD_SIZE }}
                intakeActive={robotModes[robot.id]?.intake ?? false}
                onRemoveHeldBall={(ballId) => removeRobotBall(robot.id, ballId)}
                onCycleBalls={() => cycleRobotBalls(robot.id)}
                onToggleIntake={() =>
                  setRobotModes((prev) => ({
                    ...prev,
                    [robot.id]: {
                      intake: !prev[robot.id]?.intake,
                      outtake: prev[robot.id]?.outtake ?? false,
                    },
                  }))
                }
                isLocked={isInputLocked}
              />
            );
          })}
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-64 p-4 border-l border-border flex-shrink-0 h-full overflow-y-auto">
        <div className="mb-6">
          <h1 className="font-mono text-lg font-semibold text-primary mb-1">
            FTC DECODE
          </h1>
          <p className="text-xs text-muted-foreground">
            Strategy Planner 2025-26
          </p>
        </div>

        {robotPanelOpen && selectedRobot && robotDraft ? (
          <div
            className="space-y-4"
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              if (canSaveRobot) {
                handleRobotSave();
              }
            }}
          >
            <div className="panel">
              <div className="panel-header flex items-center justify-between">
                <span>Robot Settings</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleRobotPanelClose}
                    className="tool-button !p-1"
                    title="Close robot settings"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleRobotSave}
                    className="tool-button !p-1"
                    title="Save robot settings"
                    disabled={!canSaveRobot}
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-3 text-xs text-muted-foreground">
                <div>
                  <label className="block mb-1 text-xs text-foreground">Width (inches)</label>
                  <input
                    type="number"
                    min={MIN_ROBOT_INCHES}
                    max={MAX_ROBOT_INCHES}
                    step={0.5}
                    value={robotDraft.widthIn}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      if (Number.isNaN(next)) return;
                      setRobotDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              widthIn: Math.min(MAX_ROBOT_INCHES, Math.max(MIN_ROBOT_INCHES, next)),
                            }
                          : prev
                      );
                    }}
                    className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs text-foreground">Height (inches)</label>
                  <input
                    type="number"
                    min={MIN_ROBOT_INCHES}
                    max={MAX_ROBOT_INCHES}
                    step={0.5}
                    value={robotDraft.heightIn}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      if (Number.isNaN(next)) return;
                      setRobotDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              heightIn: Math.min(MAX_ROBOT_INCHES, Math.max(MIN_ROBOT_INCHES, next)),
                            }
                          : prev
                      );
                    }}
                    className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs text-foreground">Robot Name (1-5 digits)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\\d*"
                    value={robotDraft.name}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (next === '' || /^\d{0,5}$/.test(next)) {
                        setRobotDraft((prev) => (prev ? { ...prev, name: next } : prev));
                      }
                    }}
                    className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                  />
                  {!nameIsValid && (
                    <p className="mt-1 text-xs text-destructive">Name must be 1-5 digits.</p>
                  )}
                  {nameIsValid && !nameIsUnique && (
                    <p className="mt-1 text-xs text-destructive">Name must be unique.</p>
                  )}
                </div>
                <div>
                  <label className="block mb-1 text-xs text-foreground">Robot Image</label>
                  <button
                    onClick={handleRobotImageSelect}
                    className="tool-button w-full"
                    title="Import robot image"
                  >
                    {robotDraft.imageDataUrl ? 'Change Image' : 'Import Image'}
                  </button>
                  <input
                    ref={robotImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleRobotImageChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
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
                  onEmpty={() => handleClassifierEmpty('red')}
                  onPopSingle={() => handleClassifierPop('red')}
                  isEmptying={classifierEmptying.red}
                />
              </div>
              <div ref={blueClassifierRef}>
                <ClassifierDisplay
                  classifier={state.classifiers.blue}
                  motif={motif}
                  onEmpty={() => handleClassifierEmpty('blue')}
                  onPopSingle={() => handleClassifierPop('blue')}
                  isEmptying={classifierEmptying.blue}
                />
              </div>
            </div>

            <div className="mt-6 panel">
              <div className="panel-header">Instructions</div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>Drag robots & balls to position</li>
                <li>Drop balls on robots to collect</li>
                <li>Click robot for controls</li>
                <li>Arrow keys rotate selected robot</li>
                <li>I to toggle intake, K to shoot all balls</li>
                <li>O to shoot one ball</li>
                <li>L to cycle held balls</li>
                <li>Use pen to draw paths</li>
                <li>Export to save strategy</li>
              </ul>
            </div>
          </>
        )}
      </div>

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="panel w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
                Settings
              </h2>
              <button
                onClick={handleCloseSettings}
                className="tool-button !p-1"
                title="Close settings"
                aria-label="Close settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <div className="panel-header">Color Mode</div>
                <select
                  value={draftThemeMode}
                  onChange={(e) => setDraftThemeMode(e.target.value as ThemeMode)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="basic">Basic</option>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>

              <div>
                <div className="panel-header">Keybinds</div>
                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  {(
                    [
                      ['Select Tool', 'select'],
                      ['Pen Tool', 'pen'],
                      ['Dotted Tool', 'dotted'],
                      ['Arrow Tool', 'arrow'],
                      ['Eraser Tool', 'eraser'],
                      ['Intake Toggle', 'intake'],
                      ['Outtake Single', 'outtakeSingle'],
                      ['Outtake Rapid', 'outtakeAll'],
                      ['Cycle Held Balls', 'cycle'],
                      ['Rotate Left', 'rotateLeft'],
                      ['Rotate Right', 'rotateRight'],
                    ] as Array<[string, keyof Keybinds]>
                  ).map(([label, key]) => (
                    <label key={key} className="flex flex-col gap-1">
                      <span>{label}</span>
                      <input
                        type="text"
                        value={draftKeybinds[key]}
                        onChange={(e) =>
                          setDraftKeybinds((prev) => ({
                            ...prev,
                            [key]: normalizeKey(e.target.value),
                          }))
                        }
                        className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                        placeholder="Key"
                      />
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Use single keys or names like ArrowLeft/ArrowRight.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={handleCloseSettings}
                className="tool-button"
                title="Back"
              >
                Back
              </button>
              <button
                onClick={handleSaveSettings}
                className="tool-button active"
                title="Save settings"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
