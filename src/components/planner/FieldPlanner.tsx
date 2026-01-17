import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFieldState } from '@/hooks/useFieldState';
import { Tool, DEFAULT_CONFIG, Robot, Alliance, Classifier, FieldState, Ball } from '@/types/planner';
import fieldImageBasic from '@/assets/decode_field_B.png';
import fieldImageDark from '@/assets/decode_field_B.png';
import fieldImageLight from '@/assets/decode_field_L.png';
import { RobotElement } from './RobotElement';
import { BallElement } from './BallElement';
import { DrawingCanvas } from './DrawingCanvas';
import { ToolPanel } from './ToolPanel';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const FIELD_SIZE = 600; 
const FIELD_INCHES = 144;
const GOAL_WIDTH = 120;
const GOAL_HEIGHT = 156;
const AUTON_SECONDS = 30;
const TRANSITION_SECONDS = 7;
const TELEOP_SECONDS = 120;
const MAGNET_RADIUS = 10;
const CLASSIFIED_POINTS = 3;
const OVERFLOW_POINTS = 1;
const MOTIF_POINTS = 2;
const MAGNET_TARGETS = {
  blue: [{ x: 0.7275, y: 0.761 }],
  red: [{ x: 0.27, y: 0.761 }],
};
const SECRET_TUNNEL_ZONE_INSET = 0;
const CLASSIFIER_STACK_INSET = -4;
const CLASSIFIER_EXTENSION_INSET = -4;
const CLASSIFIER_STACK = {
  top: 126,
  sideInset: CLASSIFIER_STACK_INSET,
  slotSize: 14,
  gap: 4,
  padding: 6,
};
const CLASSIFIER_EXTENSION_OFFSET = 8;
const MAX_ROBOT_INCHES = 18;
const MIN_ROBOT_INCHES = 1;
const CLASSIFIER_ZONE = {
  blue: { x: SECRET_TUNNEL_ZONE_INSET, y: 126, width: 14, height: 162 },
  red: { x: FIELD_SIZE - SECRET_TUNNEL_ZONE_INSET - 14, y: 126, width: 14, height: 162 },
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
const FIELD_SCREEN_RATIO = 0.8;
const FIELD_SCALE_MULTIPLIER = 1.1;
const DEFAULT_KEYBINDS = {
  select: 's',
  pen: 'p',
  eraser: 'e',
  intake: 'i',
  outtakeSingle: 'o',
  outtakeAll: 'k',
  cycle: 'l',
  rotateLeft: 'arrowleft',
  rotateRight: 'arrowright',
};
const MIN_SEQUENCE = 10;
const MAX_SEQUENCE = 50;
type ThemeMode = 'base' | 'dark' | 'light' | 'sharkans';
type Keybinds = typeof DEFAULT_KEYBINDS;
type SequenceStep = {
  positions: Record<string, { x: number; y: number }>;
  rotations: Record<string, number>;
  ballState: {
    balls: Ball[];
    robotsHeldBalls: Record<string, Ball[]>;
    classifiers: {
      red: { balls: Ball[]; extensionBalls: Ball[] };
      blue: { balls: Ball[]; extensionBalls: Ball[] };
    };
    overflowCounts: { red: number; blue: number };
  };
  rawScores: { red: number; blue: number };
};

type PersistedFieldPlannerState = {
  version: 1;
  fieldState: FieldState;
  activeTool: Tool;
  penColor: string;
  selectedRobotId: string | null;
  motif: string;
  robotModes: Record<string, { intake: boolean; outtake: boolean }>;
  timerMode: 'full' | 'teleop' | 'auton';
  timerPhase: 'idle' | 'auton' | 'transition' | 'teleop';
  timeLeft: number;
  timerRunning: boolean;
  themeMode: ThemeMode;
  settingsOpen: boolean;
  instructionsOpen: boolean;
  fieldScale: number;
  sequenceSteps: Record<number, SequenceStep>;
  sequencePlaying: boolean;
  selectedSequenceStep: number | null;
  maxSequence: number;
  draftThemeMode: ThemeMode;
  keybinds: Keybinds;
  draftKeybinds: Keybinds;
  robotPanelOpen: boolean;
  rawScores: { red: number; blue: number };
  activeClassifierMenu: Alliance | null;
  robotDraft: {
    widthIn: number;
    heightIn: number;
    name: string;
    imageDataUrl: string | null;
  } | null;
  draftRobotId: string | null;
};

let persistedFtcPlannerState: PersistedFieldPlannerState | null = null;

const normalizeThemeMode = (value: string | null): ThemeMode => {
  if (value === 'base' || value === 'dark' || value === 'light' || value === 'sharkans') return value;
  if (value === 'basic') return 'base';
  return 'dark';
};

export const FieldPlanner = ({ className }: { className?: string }) => {
  const persistedState = useMemo(() => persistedFtcPlannerState, []);
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
    collectClassifierExtensionBalls,
    removeRobotBall,
    cycleRobotBalls,
    updateBallPosition,
    removeBall,
    scoreBallToClassifier,
    emptyClassifier,
    popClassifierBall,
    clearClassifierBalls,
    setupFieldArtifacts,
    addDrawing,
    removeDrawing,
    clearDrawings,
    clearBalls,
    clearRobots,
    resetField,
    restoreBallState,
    exportState,
    importState,
    addHumanPlayerBall,
    loadRobotBalls,
  } = useFieldState(persistedState?.fieldState);

  const [activeTool, setActiveTool] = useState<Tool>(persistedState?.activeTool ?? 'select');
  const [penColor, setPenColor] = useState(persistedState?.penColor ?? '#2b76d2');
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(persistedState?.selectedRobotId ?? null);
  const [motif, setMotif] = useState(persistedState?.motif ?? 'GPP');
  const [robotModes, setRobotModes] = useState<Record<string, { intake: boolean; outtake: boolean }>>(
    persistedState?.robotModes ?? {}
  );
  const [timerMode, setTimerMode] = useState<'full' | 'teleop' | 'auton'>(
    persistedState?.timerMode ?? 'full'
  );
  const [timerPhase, setTimerPhase] = useState<'idle' | 'auton' | 'transition' | 'teleop'>(
    persistedState?.timerPhase ?? 'auton'
  );
  const [timeLeft, setTimeLeft] = useState(persistedState?.timeLeft ?? AUTON_SECONDS);
  const [timerRunning, setTimerRunning] = useState(persistedState?.timerRunning ?? false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(persistedState?.themeMode ?? 'dark');
  const [settingsOpen, setSettingsOpen] = useState(persistedState?.settingsOpen ?? false);
  const [instructionsOpen, setInstructionsOpen] = useState(persistedState?.instructionsOpen ?? false);
  const [fieldScale, setFieldScale] = useState(persistedState?.fieldScale ?? 1);
  const [searchParams, setSearchParams] = useSearchParams();
  const [sequenceSteps, setSequenceSteps] = useState<Record<number, SequenceStep>>(
    persistedState?.sequenceSteps ?? {}
  );
  const [sequencePlaying, setSequencePlaying] = useState(persistedState?.sequencePlaying ?? false);
  const [selectedSequenceStep, setSelectedSequenceStep] = useState<number | null>(
    persistedState?.selectedSequenceStep ?? null
  );
  const [maxSequence, setMaxSequence] = useState(persistedState?.maxSequence ?? MIN_SEQUENCE);
  const [draftThemeMode, setDraftThemeMode] = useState<ThemeMode>(persistedState?.draftThemeMode ?? 'dark');
  const [keybinds, setKeybinds] = useState<Keybinds>(persistedState?.keybinds ?? DEFAULT_KEYBINDS);
  const [draftKeybinds, setDraftKeybinds] = useState<Keybinds>(
    persistedState?.draftKeybinds ?? DEFAULT_KEYBINDS
  );
  const [robotPanelOpen, setRobotPanelOpen] = useState(persistedState?.robotPanelOpen ?? false);
  const [classifierEmptying, setClassifierEmptying] = useState({ red: false, blue: false });
  const [rawScores, setRawScores] = useState(persistedState?.rawScores ?? { red: 0, blue: 0 });
  const [activeClassifierMenu, setActiveClassifierMenu] = useState<Alliance | null>(
    persistedState?.activeClassifierMenu ?? null
  );
  const [robotDraft, setRobotDraft] = useState<{
    widthIn: number;
    heightIn: number;
    name: string;
    imageDataUrl: string | null;
  } | null>(persistedState?.robotDraft ?? null);
  const [draftRobotId, setDraftRobotId] = useState<string | null>(persistedState?.draftRobotId ?? null);
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
  const fieldAreaRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const fieldFrameRef = useRef<HTMLDivElement>(null);
  const robotsRef = useRef<Robot[]>([]);
  const isApplyingSequenceRef = useRef(false);
  const redClassifierRef = useRef<HTMLDivElement>(null);
  const blueClassifierRef = useRef<HTMLDivElement>(null);
  const redClassifierFieldRef = useRef<HTMLDivElement>(null);
  const blueClassifierFieldRef = useRef<HTMLDivElement>(null);
  const redClassifierExtensionRef = useRef<HTMLDivElement>(null);
  const blueClassifierExtensionRef = useRef<HTMLDivElement>(null);
  const isInputLocked = timerRunning && timerPhase === 'transition';
  const pixelsPerInch = FIELD_SIZE / FIELD_INCHES;
  const classifierBallSize = CLASSIFIER_STACK.slotSize * 0.86;
  const classifierStackWidth = CLASSIFIER_STACK.slotSize + CLASSIFIER_STACK.padding * 2;
  const getClassifierStackHeight = useCallback((classifier: Classifier) => {
    const baseHeight =
      CLASSIFIER_STACK.padding * 2 +
      CLASSIFIER_STACK.slotSize * classifier.maxCapacity +
      CLASSIFIER_STACK.gap * (classifier.maxCapacity - 1);
    const extensionHeight =
      CLASSIFIER_STACK.padding * 2 +
      CLASSIFIER_STACK.slotSize * classifier.extensionCapacity +
      CLASSIFIER_STACK.gap * (classifier.extensionCapacity - 1);
    return baseHeight + CLASSIFIER_EXTENSION_OFFSET + extensionHeight;
  }, []);
  const classifierStackHeights = useMemo(() => ({
    red: getClassifierStackHeight(state.classifiers.red),
    blue: getClassifierStackHeight(state.classifiers.blue),
  }), [getClassifierStackHeight, state.classifiers]);
  const magnetTargetsPx = useMemo(
    () => ({
      red: MAGNET_TARGETS.red[0]
        ? { x: MAGNET_TARGETS.red[0].x * FIELD_SIZE, y: MAGNET_TARGETS.red[0].y * FIELD_SIZE }
        : null,
      blue: MAGNET_TARGETS.blue[0]
        ? { x: MAGNET_TARGETS.blue[0].x * FIELD_SIZE, y: MAGNET_TARGETS.blue[0].y * FIELD_SIZE }
        : null,
    }),
    []
  );
  const classifierBallIds = useMemo(() => {
    const ids = new Set<string>();
    state.classifiers.blue.balls.forEach((ball) => ids.add(ball.id));
    state.classifiers.red.balls.forEach((ball) => ids.add(ball.id));
    state.classifiers.blue.extensionBalls.forEach((ball) => ids.add(ball.id));
    state.classifiers.red.extensionBalls.forEach((ball) => ids.add(ball.id));
    return ids;
  }, [state.classifiers]);

  const getExtensionSlotPosition = useCallback(
    (alliance: 'red' | 'blue', index: number) => {
      const fieldRect = fieldRef.current?.getBoundingClientRect();
      const container =
        alliance === 'blue' ? blueClassifierExtensionRef.current : redClassifierExtensionRef.current;
      if (!fieldRect || !container) {
        const fallbackTop =
          CLASSIFIER_STACK.top +
          CLASSIFIER_STACK.padding * 2 +
          CLASSIFIER_STACK.slotSize * state.classifiers[alliance].maxCapacity +
          CLASSIFIER_STACK.gap * (state.classifiers[alliance].maxCapacity - 1) +
          CLASSIFIER_EXTENSION_OFFSET;
        const fallbackLeft =
          alliance === 'blue'
            ? CLASSIFIER_EXTENSION_INSET
            : FIELD_SIZE - CLASSIFIER_EXTENSION_INSET - CLASSIFIER_STACK.slotSize - CLASSIFIER_STACK.padding * 2;
        return {
          x: fallbackLeft + CLASSIFIER_STACK.padding + CLASSIFIER_STACK.slotSize / 2,
          y:
            fallbackTop +
            CLASSIFIER_STACK.padding +
            index * (CLASSIFIER_STACK.slotSize + CLASSIFIER_STACK.gap) +
            CLASSIFIER_STACK.slotSize / 2,
        };
      }

      const scale = fieldScale || 1;
      const containerRect = container.getBoundingClientRect();
      const width = containerRect.width / scale;
      const height = containerRect.height / scale;
      if (width === 0 || height === 0) {
        return { x: 0, y: 0 };
      }

      const totalWidth = CLASSIFIER_STACK.slotSize + CLASSIFIER_STACK.padding * 2;
      const totalHeight =
        CLASSIFIER_STACK.padding * 2 +
        CLASSIFIER_STACK.slotSize * state.classifiers[alliance].extensionCapacity +
        CLASSIFIER_STACK.gap * (state.classifiers[alliance].extensionCapacity - 1);
      const xPct = (CLASSIFIER_STACK.padding + CLASSIFIER_STACK.slotSize / 2) / totalWidth;
      const yPct =
        (CLASSIFIER_STACK.padding + CLASSIFIER_STACK.slotSize / 2 + index * (CLASSIFIER_STACK.slotSize + CLASSIFIER_STACK.gap)) /
        totalHeight;

      const left = (containerRect.left - fieldRect.left) / scale;
      const top = (containerRect.top - fieldRect.top) / scale;
      return {
        x: left + xPct * width,
        y: top + yPct * height,
      };
    },
    [fieldScale, state.classifiers]
  );
  const fieldImage = useMemo(() => {
    if (themeMode === 'light') return fieldImageLight;
    if (themeMode === 'dark') return fieldImageDark;
    if (themeMode === 'sharkans') return fieldImageBasic;
    return fieldImageBasic;
  }, [themeMode]);

  const normalizeKey = useCallback((value: string) => value.trim().toLowerCase(), []);

  useEffect(() => {
    persistedFtcPlannerState = {
      version: 1,
      fieldState: state,
      activeTool,
      penColor,
      selectedRobotId,
      motif,
      robotModes,
      timerMode,
      timerPhase,
      timeLeft,
      timerRunning,
      themeMode,
      settingsOpen,
      instructionsOpen,
      fieldScale,
      sequenceSteps,
      sequencePlaying,
      selectedSequenceStep,
      maxSequence,
      draftThemeMode,
      keybinds,
      draftKeybinds,
      robotPanelOpen,
      rawScores,
      activeClassifierMenu,
      robotDraft,
      draftRobotId,
    };
  }, [
    activeClassifierMenu,
    activeTool,
    draftKeybinds,
    draftRobotId,
    draftThemeMode,
    fieldScale,
    instructionsOpen,
    keybinds,
    maxSequence,
    motif,
    penColor,
    rawScores,
    robotDraft,
    robotModes,
    robotPanelOpen,
    selectedRobotId,
    selectedSequenceStep,
    sequencePlaying,
    sequenceSteps,
    settingsOpen,
    state,
    themeMode,
    timeLeft,
    timerMode,
    timerPhase,
    timerRunning,
  ]);

  useEffect(() => {
    const storedTheme = normalizeThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY));
    setThemeMode(storedTheme);
    setDraftThemeMode(storedTheme);

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
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.style.setProperty('--planner-zoom', String(fieldScale || 1));
    return () => {
      document.documentElement.style.removeProperty('--planner-zoom');
    };
  }, [fieldScale]);


  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);



  useEffect(() => {
    robotsRef.current = state.robots;
  }, [state.robots]);

  const updateFieldScale = useCallback(() => {
    const area = fieldAreaRef.current;
    if (!area) return;
    const styles = window.getComputedStyle(area);
    const paddingX = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
    const paddingY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const availableWidth = area.clientWidth - paddingX;
    const availableHeight = area.clientHeight - paddingY;
    if (availableWidth <= 0 || availableHeight <= 0) return;
    const targetSize = Math.min(availableWidth, availableHeight) * FIELD_SCREEN_RATIO;
    const nextScale = Math.max(0.1, (targetSize / FIELD_SIZE) * FIELD_SCALE_MULTIPLIER);
    setFieldScale((prev) => (Math.abs(prev - nextScale) > 0.01 ? nextScale : prev));
  }, []);

  const updatePlannerMetrics = useCallback(() => {
    const frame = fieldFrameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    document.documentElement.style.setProperty('--planner-field-width', `${rect.width}px`);
    document.documentElement.style.setProperty('--planner-field-left', `${rect.left}px`);
  }, []);

  useEffect(() => {
    updatePlannerMetrics();
  }, [fieldScale, updatePlannerMetrics]);

  const openSettings = useCallback(() => {
    setDraftThemeMode(themeMode);
    setDraftKeybinds(keybinds);
    setSettingsOpen(true);
  }, [keybinds, themeMode]);

  useEffect(() => {
    if (searchParams.get('settings') === '1' && !settingsOpen) {
      openSettings();
    }
  }, [openSettings, searchParams, settingsOpen]);

  useEffect(() => {
    if (searchParams.get('instructions') === '1' && !instructionsOpen) {
      setInstructionsOpen(true);
    }
  }, [instructionsOpen, searchParams]);

  useEffect(() => {
    updateFieldScale();
    updatePlannerMetrics();
    const area = fieldAreaRef.current;
    if (!area) return;
    const observer = new ResizeObserver(() => {
      updateFieldScale();
      updatePlannerMetrics();
    });
    observer.observe(area);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--planner-field-width');
      document.documentElement.style.removeProperty('--planner-field-left');
    };
  }, [updateFieldScale, updatePlannerMetrics]);

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

  const addRawScore = useCallback((alliance: Alliance, count: number) => {
    if (count <= 0) return;
    const classifier = state.classifiers[alliance];
    let baseLeft = classifier.maxCapacity - classifier.balls.length;
    let extensionLeft = classifier.extensionCapacity - classifier.extensionBalls.length;
    let points = 0;
    let remaining = count;
    while (remaining > 0) {
      if (baseLeft > 0) {
        points += CLASSIFIED_POINTS;
        baseLeft -= 1;
      } else if (extensionLeft > 0) {
        points += OVERFLOW_POINTS;
        extensionLeft -= 1;
      } else {
        break;
      }
      remaining -= 1;
    }
    if (points > 0) {
      setRawScores((prev) => ({ ...prev, [alliance]: prev[alliance] + points }));
    }
  }, [state.classifiers]);

  const handleRobotShoot = useCallback(
    (robotId: string, mode: 'single' | 'all') => {
      if (isInputLocked) return;
      const robot = state.robots.find((item) => item.id === robotId);
      if (!robot || robot.heldBalls.length === 0) return;
      const classifier = state.classifiers[robot.alliance];
      const baseLeft = classifier.maxCapacity - classifier.balls.length;
      const extensionLeft = classifier.extensionCapacity - classifier.extensionBalls.length;
      const capacityLeft = Math.max(0, baseLeft + extensionLeft);

      const originalRotation = robot.rotation;
      const targetRotation = getGoalRotation(robot);
      updateRobotRotation(robotId, targetRotation);

      if (mode === 'single') {
        addRawScore(robot.alliance, 1);
        robotEjectSingle(robotId);
      } else {
        const ballsToScore = Math.min(robot.heldBalls.length, capacityLeft);
        addRawScore(robot.alliance, ballsToScore);
        robotEjectAll(robotId);
      }

      window.setTimeout(() => {
        updateRobotRotation(robotId, originalRotation);
      }, 250);
    },
    [addRawScore, getGoalRotation, isInputLocked, robotEjectAll, robotEjectSingle, state.classifiers, state.robots, updateRobotRotation]
  );

  const handleScoreToClassifier = useCallback(
    (ballId: string, alliance: Alliance) => {
      addRawScore(alliance, 1);
      scoreBallToClassifier(ballId, alliance);
    },
    [addRawScore, scoreBallToClassifier]
  );

  const saveSequenceStep = useCallback(
    (index: number, robots: Robot[], silent = false) => {
      if (robots.length === 0) {
        if (!silent) {
          toast.error('Add robots before saving a sequence step.');
        }
        return;
      }
      const positions: Record<string, { x: number; y: number }> = {};
      const rotations: Record<string, number> = {};
      robots.forEach((robot) => {
        positions[robot.id] = { ...robot.position };
        rotations[robot.id] = robot.rotation;
      });
      const ballState = {
        balls: state.balls.map((ball) => ({ ...ball })),
        robotsHeldBalls: robots.reduce<Record<string, Ball[]>>((acc, robot) => {
          acc[robot.id] = robot.heldBalls.map((ball) => ({ ...ball }));
          return acc;
        }, {}),
        classifiers: {
          red: {
            balls: state.classifiers.red.balls.map((ball) => ({ ...ball })),
            extensionBalls: state.classifiers.red.extensionBalls.map((ball) => ({ ...ball })),
          },
          blue: {
            balls: state.classifiers.blue.balls.map((ball) => ({ ...ball })),
            extensionBalls: state.classifiers.blue.extensionBalls.map((ball) => ({ ...ball })),
          },
        },
        overflowCounts: { ...state.overflowCounts },
      };
      setSequenceSteps((prev) => ({
        ...prev,
        [index]: { positions, rotations, ballState, rawScores: { ...rawScores } },
      }));
      if (!silent) {
        toast.success(`Saved step ${index}.`);
      }
    },
    [rawScores, state.balls, state.classifiers.blue.balls, state.classifiers.blue.extensionBalls, state.classifiers.red.balls, state.classifiers.red.extensionBalls, state.overflowCounts]
  );

  useEffect(() => {
    if (!selectedSequenceStep || sequencePlaying || isApplyingSequenceRef.current) return;
    saveSequenceStep(selectedSequenceStep, state.robots, true);
  }, [saveSequenceStep, selectedSequenceStep, sequencePlaying, state.robots]);

  useEffect(() => {
    if (selectedSequenceStep && selectedSequenceStep > maxSequence) {
      setSelectedSequenceStep(maxSequence);
    }
  }, [maxSequence, selectedSequenceStep]);

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

  const isDoubleParked = useCallback(
    (alliance: 'red' | 'blue') => {
      const target = magnetTargetsPx[alliance];
      if (!target) return false;
      const robots = state.robots.filter((robot) => robot.alliance === alliance);
      if (robots.length < 2) return false;
      for (let i = 0; i < robots.length - 1; i++) {
        const a = robots[i];
        const aDx = a.position.x - target.x;
        const aDy = a.position.y - target.y;
        const aMagnetized = Math.sqrt(aDx * aDx + aDy * aDy) <= MAGNET_RADIUS;
        if (!aMagnetized) continue;
        const aDim = getRobotDimensions(a);
        const aRect = getRobotRect(a.position.x, a.position.y, aDim.width, aDim.height);
        for (let j = i + 1; j < robots.length; j++) {
          const b = robots[j];
          const bDx = b.position.x - target.x;
          const bDy = b.position.y - target.y;
          const bMagnetized = Math.sqrt(bDx * bDx + bDy * bDy) <= MAGNET_RADIUS;
          if (!bMagnetized) continue;
          const bDim = getRobotDimensions(b);
          const bRect = getRobotRect(b.position.x, b.position.y, bDim.width, bDim.height);
          const overlaps =
            aRect.left < bRect.right &&
            aRect.right > bRect.left &&
            aRect.top < bRect.bottom &&
            aRect.bottom > bRect.top;
          if (overlaps) return true;
        }
      }
      return false;
    },
    [getRobotDimensions, getRobotRect, magnetTargetsPx, state.robots]
  );

  const isRedDoubleParked = isDoubleParked('red');
  const isBlueDoubleParked = isDoubleParked('blue');

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
    if (settingsOpen || instructionsOpen) return;
    setActiveClassifierMenu(null);
    setSelectedRobotId(null);
  };

  const motifs = ['GPP', 'PGP', 'PPG'];

  const getMotifValidatedCount = useCallback((classifier: Classifier, motifValue: string) => {
    if (!motifValue) return 0;
    const motifTokens = motifValue.split('');
    return classifier.balls.reduce((total, ball, index) => {
      const expected = motifTokens[index % motifTokens.length];
      const actual = ball.color === 'green' ? 'G' : 'P';
      return total + (actual === expected ? 1 : 0);
    }, 0);
  }, []);

  const getClassifierHighlightGroups = useCallback((classifier: Classifier, motifValue: string) => {
    const motifTokens = motifValue.split('');
    const groupCount = Math.ceil(classifier.maxCapacity / 3);
    return Array.from({ length: groupCount }, (_, groupIndex) => {
      const slots = Array.from({ length: 3 }, (_, slotIndex) => {
        const index = groupIndex * 3 + slotIndex;
        return classifier.balls[index] ?? null;
      });
      const matches = slots.every((ball, slotIndex) => {
        if (!ball || motifTokens.length === 0) return false;
        const expected = motifTokens[slotIndex % motifTokens.length];
        const actual = ball.color === 'green' ? 'G' : 'P';
        return actual === expected;
      });
      return { slots, matches };
    });
  }, []);

  const classifierHighlightGroups = useMemo(() => ({
    red: getClassifierHighlightGroups(state.classifiers.red, motif),
    blue: getClassifierHighlightGroups(state.classifiers.blue, motif),
  }), [getClassifierHighlightGroups, motif, state.classifiers]);

  const motifCounts = useMemo(() => ({
    red: getMotifValidatedCount(state.classifiers.red, motif),
    blue: getMotifValidatedCount(state.classifiers.blue, motif),
  }), [getMotifValidatedCount, motif, state.classifiers]);

  const motifScores = useMemo(() => ({
    red: motifCounts.red * MOTIF_POINTS,
    blue: motifCounts.blue * MOTIF_POINTS,
  }), [motifCounts]);

  const overallScores = useMemo(() => ({
    red: rawScores.red + motifScores.red,
    blue: rawScores.blue + motifScores.blue,
  }), [motifScores, rawScores]);

  const handleScoreReset = useCallback(() => {
    setRawScores({ red: 0, blue: 0 });
  }, []);

  const applySequenceStep = useCallback(
    (index: number) => {
      const step = sequenceSteps[index];
      if (!step) return;
      isApplyingSequenceRef.current = true;
      robotsRef.current.forEach((robot) => {
        const position = step.positions[robot.id];
        const rotation = step.rotations[robot.id];
        if (position) {
          updateRobotPosition(robot.id, position);
        }
        if (rotation !== undefined) {
          updateRobotRotation(robot.id, rotation);
        }
      });
      if (step.ballState) {
        restoreBallState(step.ballState);
      }
      if (step.rawScores) {
        setRawScores(step.rawScores);
      }
      window.setTimeout(() => {
        isApplyingSequenceRef.current = false;
      }, 0);
    },
    [restoreBallState, sequenceSteps, updateRobotPosition, updateRobotRotation]
  );

  const handleSelectSequenceStep = useCallback(
    (index: number) => {
      setSelectedSequenceStep(index);
      if (sequenceSteps[index]) {
        applySequenceStep(index);
        return;
      }
      saveSequenceStep(index, robotsRef.current, true);
    },
    [applySequenceStep, saveSequenceStep, sequenceSteps]
  );

  const handleSequenceDeleteAll = useCallback(() => {
    setSequenceSteps({});
    setSelectedSequenceStep(null);
    toast.success('Sequence cleared.');
  }, []);

  const handleSequenceDeleteSelected = useCallback(() => {
    if (!selectedSequenceStep || !sequenceSteps[selectedSequenceStep]) return;
    setSequenceSteps((prev) => {
      const next = { ...prev };
      delete next[selectedSequenceStep];
      return next;
    });
    setSelectedSequenceStep(null);
    toast.success(`Deleted step ${selectedSequenceStep}.`);
  }, [selectedSequenceStep, sequenceSteps]);

  const handleSequenceLengthChange = useCallback((delta: number) => {
    setMaxSequence((prev) => {
      const next = Math.max(MIN_SEQUENCE, Math.min(MAX_SEQUENCE, prev + delta));
      return next;
    });
  }, []);

  const handleSequenceStepChange = useCallback(
    (direction: -1 | 1) => {
      if (sequencePlaying) return;
      const current = selectedSequenceStep ?? (direction === 1 ? 0 : maxSequence + 1);
      const next = ((current - 1 + direction + maxSequence) % maxSequence) + 1;
      handleSelectSequenceStep(next);
    },
    [handleSelectSequenceStep, maxSequence, selectedSequenceStep, sequencePlaying]
  );

  const playSequence = useCallback(async () => {
    if (sequencePlaying) return;
    if (Object.keys(sequenceSteps).length === 0) {
      toast.error('Save at least one step to play the sequence.');
      return;
    }
    setSequencePlaying(true);
    for (let i = 1; i <= maxSequence; i++) {
      const step = sequenceSteps[i];
      if (!step) continue;
      if (step.ballState) {
        restoreBallState(step.ballState);
      }
      if (step.rawScores) {
        setRawScores(step.rawScores);
      }
      const startRobots = robotsRef.current.map((robot) => ({
        id: robot.id,
        position: { ...robot.position },
        rotation: robot.rotation,
      }));
      isApplyingSequenceRef.current = true;
      await new Promise<void>((resolve) => {
        const startTime = window.performance.now();
        const duration = 650;
        const tick = (now: number) => {
          const t = Math.min(1, (now - startTime) / duration);
          startRobots.forEach((robot) => {
            const target = step.positions[robot.id] ?? robot.position;
            const startRot = robot.rotation;
            const targetRot = step.rotations[robot.id] ?? startRot;
            updateRobotPosition(robot.id, {
              x: robot.position.x + (target.x - robot.position.x) * t,
              y: robot.position.y + (target.y - robot.position.y) * t,
            });
            updateRobotRotation(robot.id, startRot + (targetRot - startRot) * t);
          });
          if (t < 1) {
            window.requestAnimationFrame(tick);
          } else {
            resolve();
          }
        };
        window.requestAnimationFrame(tick);
      });
      isApplyingSequenceRef.current = false;
      await new Promise((resolve) => setTimeout(resolve, 650));
    }
    setSequencePlaying(false);
  }, [maxSequence, restoreBallState, sequencePlaying, sequenceSteps, updateRobotPosition, updateRobotRotation]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.target instanceof HTMLTextAreaElement) return;
      if (isInputLocked) return;
      if (settingsOpen || instructionsOpen) return;

      const key = e.key.toLowerCase();
      switch (key) {
        case keybinds.select:
          setActiveTool('select');
          break;
        case keybinds.pen:
          setActiveTool('pen');
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
        case 'a':
          handleSequenceStepChange(-1);
          break;
        case 'd':
          handleSequenceStepChange(1);
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
  }, [
    cycleRobotBalls,
    handleRobotShoot,
    handleSequenceStepChange,
    isInputLocked,
    keybinds,
    rotateSelectedRobot,
    selectedRobotId,
    settingsOpen,
  ]);
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
    handleSetupRobots();
    toast.success('Field setup complete.');
  };

  const handleSetupRobots = () => {
    const blueRobots = state.robots.filter((robot) => robot.alliance === 'blue');
    const redRobots = state.robots.filter((robot) => robot.alliance === 'red');

    const ensureRobot = (alliance: 'blue' | 'red', index: number, position: { x: number; y: number }) => {
      const robots = alliance === 'blue' ? blueRobots : redRobots;
      const existing = robots[index];
      if (!existing) {
        return addRobot(alliance, position);
      }
      updateRobotPosition(existing.id, position);
      return existing.id;
    };

    const goalInset = 40;
    const tileOffset = DEFAULT_CONFIG.tileSize;
    const triangleTopY = FIELD_SIZE - DEFAULT_CONFIG.tileSize;
    const triangleBottomY = FIELD_SIZE;
    const centerX = FIELD_SIZE / 2;
    const leftMid = {
      x: centerX - DEFAULT_CONFIG.tileSize / 2,
      y: (triangleTopY + triangleBottomY) / 2,
    };
    const rightMid = {
      x: centerX + DEFAULT_CONFIG.tileSize / 2,
      y: (triangleTopY + triangleBottomY) / 2,
    };

    const blueTopId = ensureRobot('blue', 0, { x: goalInset + tileOffset, y: goalInset + tileOffset });
    const redTopId = ensureRobot('red', 0, { x: FIELD_SIZE - goalInset - tileOffset, y: goalInset + tileOffset });
    const blueBottomId = ensureRobot('blue', 1, leftMid);
    const redBottomId = ensureRobot('red', 1, rightMid);

    const loadout = ['purple', 'purple', 'green'] as const;
    if (blueTopId) loadRobotBalls(blueTopId, [...loadout]);
    if (redTopId) loadRobotBalls(redTopId, [...loadout]);
    if (blueBottomId) loadRobotBalls(blueBottomId, []);
    if (redBottomId) loadRobotBalls(redBottomId, []);
    return;
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

  const handleAddHumanPlayerBall = (alliance: 'red' | 'blue', color: 'green' | 'purple') => {
    const placed = addHumanPlayerBall(alliance, color);
    if (!placed) {
      toast.error('Human player zone is full.');
    }
  };

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

    const scale = fieldScale || 1;
    const x = (clientX - rect.left) / scale;
    const y = (clientY - rect.top) / scale;
    if (x < 0 || y < 0 || x > FIELD_SIZE || y > FIELD_SIZE) return null;

    return getGoalTargetForPosition(x, y);
  }, [fieldScale, getGoalTargetForPosition]);

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
      const magnetTargets = MAGNET_TARGETS[movingRobot.alliance] ?? [];
      for (const target of magnetTargets) {
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

        const { width, height } = getRobotDimensions(robot);
        const robotRect = getRobotRect(candidate.x, candidate.y, width, height);
        const extensionSlotRadius = CLASSIFIER_STACK.slotSize / 2;
        const extensionCandidates = (['blue', 'red'] as const).flatMap((alliance) =>
          state.classifiers[alliance].extensionBalls.map((ball, index) => {
            const pos = getExtensionSlotPosition(alliance, index);
            const dx = pos.x - candidate.x;
            const dy = pos.y - candidate.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return { alliance, ball, distance, pos };
          })
        );
        const extensionInRange = extensionCandidates
          .filter(({ pos }) => {
            const withinX = pos.x >= robotRect.left - extensionSlotRadius && pos.x <= robotRect.right + extensionSlotRadius;
            const withinY = pos.y >= robotRect.top - extensionSlotRadius && pos.y <= robotRect.bottom + extensionSlotRadius;
            return withinX && withinY;
          })
          .sort((a, b) => a.distance - b.distance);

        if (extensionInRange.length > 0) {
          const maxToCollect = DEFAULT_CONFIG.maxBallsPerRobot - robot.heldBalls.length;
          const selected = extensionInRange.slice(0, Math.max(0, maxToCollect));
          const grouped = selected.reduce<Record<'red' | 'blue', string[]>>(
            (acc, item) => {
              acc[item.alliance].push(item.ball.id);
              return acc;
            },
            { red: [], blue: [] }
          );
          if (grouped.red.length) {
            collectClassifierExtensionBalls(robotId, 'red', grouped.red);
          }
          if (grouped.blue.length) {
            collectClassifierExtensionBalls(robotId, 'blue', grouped.blue);
          }
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
      collectClassifierExtensionBalls,
      getExtensionSlotPosition,
      robotCollectBalls,
      robotModes,
      state.balls,
      state.classifiers,
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

  const handleClassifierDeleteAll = useCallback(
    (alliance: 'red' | 'blue') => {
      clearClassifierBalls(alliance);
    },
    [clearClassifierBalls]
  );

  const handleClassifierMenuAction = useCallback((action: () => void) => {
    action();
    setActiveClassifierMenu(null);
  }, []);

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

  const clearSettingsParam = useCallback(() => {
    if (!searchParams.has('settings')) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('settings');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const clearInstructionsParam = useCallback(() => {
    if (!searchParams.has('instructions')) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('instructions');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleCloseSettings = () => {
    setSettingsOpen(false);
    clearSettingsParam();
  };

  const handleCloseInstructions = () => {
    setInstructionsOpen(false);
    clearInstructionsParam();
  };

  const handleSaveSettings = () => {
    setThemeMode(draftThemeMode);
    setKeybinds(draftKeybinds);
    window.localStorage.setItem(THEME_STORAGE_KEY, draftThemeMode);
    window.localStorage.setItem(KEYBINDS_STORAGE_KEY, JSON.stringify(draftKeybinds));
    setSettingsOpen(false);
    clearSettingsParam();
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
    <div className={`h-[100dvh] bg-background flex planner-shell ${className ?? ''}`}>
      {/* Left Panel */}
      <div className="panel-left w-64 flex-shrink-0 h-full min-h-0 flex flex-col overflow-y-auto overscroll-contain">
        <div className="h-full overflow-y-auto overscroll-contain p-5 pb-24">
          <ToolPanel
            activeTool={activeTool}
            onToolChange={setActiveTool}
            penColor={penColor}
            onPenColorChange={setPenColor}
            motif={motif}
            motifs={motifs}
            onMotifChange={setMotif}
            onMotifRandomize={handleRandomizeMotif}
            onAddHumanPlayerBall={addHumanPlayerBall}
            onAddRobot={addRobot}
            canAddRedRobot={canAddRedRobot}
            canAddBlueRobot={canAddBlueRobot}
            isRedDoubleParked={isRedDoubleParked}
            isBlueDoubleParked={isBlueDoubleParked}
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
      </div>

      {/* Field Area */}
      <div
        ref={fieldAreaRef}
        className="flex-1 flex items-start justify-center p-8 pt-6 field-container"
      >
        <div
          ref={fieldFrameRef}
          className="relative z-10"
          style={{ width: FIELD_SIZE * fieldScale, height: FIELD_SIZE * fieldScale }}
        >
          <div
            className="relative field-surface"
            style={{
              width: FIELD_SIZE,
              height: FIELD_SIZE,
              transform: `scale(${fieldScale})`,
              transformOrigin: 'top left',
            }}
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
            <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-warning/20 text-warning-foreground text-xs font-mono flex items-center justify-center border border-warning/50 shadow">
              o
            </div>
          )}
          {classifierEmptying.red && (
            <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-warning/20 text-warning-foreground text-xs font-mono flex items-center justify-center border border-warning/50 shadow">
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
            scale={fieldScale}
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
              onScoreToClassifier={handleScoreToClassifier}
              isLocked={isInputLocked}
              scale={fieldScale}
              isGhost={classifierBallIds.has(ball.id)}
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
              {classifierHighlightGroups.blue.map((group, groupIndex) => (
                <div
                  key={`blue-group-${groupIndex}`}
                  className={`flex flex-col-reverse rounded-md ${group.matches ? 'classifier-highlight classifier-highlight-blue' : ''}`}
                  style={{ gap: CLASSIFIER_STACK.gap }}
                >
                  {group.slots.map((ball, slotIndex) => {
                    const index = groupIndex * 3 + slotIndex;
                    return (
                      <div
                        key={`blue-slot-${index}`}
                        className="flex items-center justify-center rounded-md border border-transparent bg-transparent"
                        style={{
                          width: CLASSIFIER_STACK.slotSize,
                          height: CLASSIFIER_STACK.slotSize,
                        }}
                      >
                        {ball && (
                          <div
                            className={`rounded-full border border-border/40 ${
                              ball.color === 'green' ? 'bg-ball-green' : 'bg-ball-purple'
                            }`}
                            style={{
                              width: classifierBallSize,
                              height: classifierBallSize,
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div
            ref={blueClassifierExtensionRef}
            className="absolute z-10 pointer-events-none"
            style={{
              top:
                CLASSIFIER_STACK.top +
                CLASSIFIER_STACK.padding * 2 +
                CLASSIFIER_STACK.slotSize * state.classifiers.blue.maxCapacity +
                CLASSIFIER_STACK.gap * (state.classifiers.blue.maxCapacity - 1) +
                CLASSIFIER_EXTENSION_OFFSET,
              left: CLASSIFIER_EXTENSION_INSET,
              padding: CLASSIFIER_STACK.padding,
            }}
          >
            <div
              className="flex flex-col rounded-md bg-background/0 border border-border/0 p-1"
              style={{ gap: CLASSIFIER_STACK.gap }}
            >
              {Array.from({ length: state.classifiers.blue.extensionCapacity }, (_, index) => {
                const ball = state.classifiers.blue.extensionBalls[index];
                return (
                    <div
                      key={`blue-extension-${index}`}
                      className="flex items-center justify-center rounded-md border border-transparent bg-transparent"
                    style={{
                      width: CLASSIFIER_STACK.slotSize,
                      height: CLASSIFIER_STACK.slotSize,
                    }}
                  >
                    {ball && (
                      <div
                        className={`rounded-full border border-border/40 ${
                          ball.color === 'green' ? 'bg-ball-green' : 'bg-ball-purple'
                        }`}
                        style={{
                          width: classifierBallSize,
                          height: classifierBallSize,
                        }}
                      />
                    )}
                  </div>
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
              {classifierHighlightGroups.red.map((group, groupIndex) => (
                <div
                  key={`red-group-${groupIndex}`}
                  className={`flex flex-col-reverse rounded-md ${group.matches ? 'classifier-highlight classifier-highlight-red' : ''}`}
                  style={{ gap: CLASSIFIER_STACK.gap }}
                >
                  {group.slots.map((ball, slotIndex) => {
                    const index = groupIndex * 3 + slotIndex;
                    return (
                      <div
                        key={`red-slot-${index}`}
                        className="flex items-center justify-center rounded-md border border-transparent bg-transparent"
                        style={{
                          width: CLASSIFIER_STACK.slotSize,
                          height: CLASSIFIER_STACK.slotSize,
                        }}
                      >
                        {ball && (
                          <div
                            className={`rounded-full border border-border/40 ${
                              ball.color === 'green' ? 'bg-ball-green' : 'bg-ball-purple'
                            }`}
                            style={{
                              width: classifierBallSize,
                              height: classifierBallSize,
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div
            ref={redClassifierExtensionRef}
            className="absolute z-10 pointer-events-none"
            style={{
              top:
                CLASSIFIER_STACK.top +
                CLASSIFIER_STACK.padding * 2 +
                CLASSIFIER_STACK.slotSize * state.classifiers.red.maxCapacity +
                CLASSIFIER_STACK.gap * (state.classifiers.red.maxCapacity - 1) +
                CLASSIFIER_EXTENSION_OFFSET,
              right: CLASSIFIER_EXTENSION_INSET,
              padding: CLASSIFIER_STACK.padding,
            }}
          >
            <div
              className="flex flex-col rounded-md bg-background/0 border border-border/0 p-1"
              style={{ gap: CLASSIFIER_STACK.gap }}
            >
              {Array.from({ length: state.classifiers.red.extensionCapacity }, (_, index) => {
                const ball = state.classifiers.red.extensionBalls[index];
                return (
                    <div
                      key={`red-extension-${index}`}
                      className="flex items-center justify-center rounded-md border border-transparent bg-transparent"
                    style={{
                      width: CLASSIFIER_STACK.slotSize,
                      height: CLASSIFIER_STACK.slotSize,
                    }}
                  >
                    {ball && (
                      <div
                        className={`rounded-full border border-border/30 ${
                          ball.color === 'green' ? 'bg-ball-green' : 'bg-ball-purple'
                        }`}
                        style={{
                          width: classifierBallSize,
                          height: classifierBallSize,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div
            ref={blueClassifierRef}
            className="absolute z-20 cursor-pointer"
            style={{
              top: CLASSIFIER_STACK.top,
              left: CLASSIFIER_STACK.sideInset,
              width: classifierStackWidth,
              height: classifierStackHeights.blue,
            }}
            onClick={(event) => {
              event.stopPropagation();
              setActiveClassifierMenu('blue');
            }}
          />
          <div
            ref={redClassifierRef}
            className="absolute z-20 cursor-pointer"
            style={{
              top: CLASSIFIER_STACK.top,
              right: CLASSIFIER_STACK.sideInset,
              width: classifierStackWidth,
              height: classifierStackHeights.red,
            }}
            onClick={(event) => {
              event.stopPropagation();
              setActiveClassifierMenu('red');
            }}
          />

          {activeClassifierMenu === 'blue' && (
            <div
              className="absolute z-30"
              style={{
                top: CLASSIFIER_STACK.top,
                left: CLASSIFIER_STACK.sideInset + classifierStackWidth + 12,
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="panel w-40 space-y-2">
                <div className="panel-header">Classifier</div>
                <button
                  onClick={() => handleClassifierMenuAction(() => handleClassifierEmpty('blue'))}
                  className="tool-button w-full"
                  title="Empty classifier"
                >
                  Empty
                </button>
                <button
                  onClick={() => handleClassifierMenuAction(() => handleClassifierDeleteAll('blue'))}
                  className="tool-button w-full"
                  title="Delete all balls"
                >
                  Delete All
                </button>
                <button
                  onClick={() => handleClassifierMenuAction(() => handleClassifierPop('blue'))}
                  className="tool-button w-full"
                  title="Remove one ball"
                >
                  Remove One
                </button>
              </div>
            </div>
          )}

          {activeClassifierMenu === 'red' && (
            <div
              className="absolute z-30"
              style={{
                top: CLASSIFIER_STACK.top,
                left: FIELD_SIZE - CLASSIFIER_STACK.sideInset - classifierStackWidth - 12,
                transform: 'translateX(-100%)',
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="panel w-40 space-y-2">
                <div className="panel-header">Classifier</div>
                <button
                  onClick={() => handleClassifierMenuAction(() => handleClassifierEmpty('red'))}
                  className="tool-button w-full"
                  title="Empty classifier"
                >
                  Empty
                </button>
                <button
                  onClick={() => handleClassifierMenuAction(() => handleClassifierDeleteAll('red'))}
                  className="tool-button w-full"
                  title="Delete all balls"
                >
                  Delete All
                </button>
                <button
                  onClick={() => handleClassifierMenuAction(() => handleClassifierPop('red'))}
                  className="tool-button w-full"
                  title="Remove one ball"
                >
                  Remove One
                </button>
              </div>
            </div>
          )}

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
                scale={fieldScale}
              />
            );
          })}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="panel-right w-64 flex-shrink-0 h-full min-h-0 flex flex-col overflow-y-auto overscroll-contain">
        <div className="h-full overflow-y-auto overscroll-contain p-5 pb-24">
          <div className="mb-6">
            <h1 className="font-title text-xl uppercase tracking-[0.2em] text-primary mb-1">
              FTC DECODE
            </h1>
            <p className="font-display text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
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
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      close
                    </span>
                  </button>
                  <button
                    onClick={handleRobotSave}
                    className="tool-button !p-1"
                    title="Save robot settings"
                    disabled={!canSaveRobot}
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      save
                    </span>
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
                    className="w-full rounded-md border border-border/60 bg-background/70 px-2 py-1 text-sm text-foreground shadow-inner shadow-black/20"
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
                    className="w-full rounded-md border border-border/60 bg-background/70 px-2 py-1 text-sm text-foreground shadow-inner shadow-black/20"
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
                    className="w-full rounded-md border border-border/60 bg-background/70 px-2 py-1 text-sm text-foreground shadow-inner shadow-black/20"
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
            <div className="flex flex-col gap-4">
              <div className="panel">
                <div className="panel-header">Points</div>
                <div className="space-y-3 text-xs text-muted-foreground">
                  {(['red', 'blue'] as const).map((alliance) => (
                    <div
                      key={alliance}
                      className="rounded-md border border-border/60 bg-background/40 px-3 py-2"
                    >
                      <div
                        className={`text-[11px] font-mono uppercase tracking-[0.24em] ${
                          alliance === 'red' ? 'text-alliance-red' : 'text-alliance-blue'
                        }`}
                      >
                        {alliance === 'red' ? 'Red' : 'Blue'} Alliance
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span>Overall Score</span>
                          <span className="font-mono text-foreground">{overallScores[alliance]}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Raw Score</span>
                          <span className="font-mono text-foreground">{rawScores[alliance]}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Motif Score</span>
                          <span className="font-mono text-foreground">{motifScores[alliance]}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleScoreReset}
                  className="tool-button mt-3 w-full"
                  title="Reset scores"
                >
                  Reset
                </button>
              </div>
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
                <div className="panel-header flex items-center justify-between">
                  <span>Sequence</span>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="tool-button !p-1 -ml-1"
                          aria-label="Sequence help"
                          title="Sequence help"
                        >
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                          info
                        </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs text-xs">
                        Press D or A to move forward/backward. Use this tool to create sequences and plan out movements with animation. 
                        Click on a number to activate that step, make all movements (movements save automatically to the selected slot). 
                        To set a new position, click on the desired step and start moving the bots. Play sequence when done.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: maxSequence }, (_, index) => {
                    const step = index + 1;
                    const isSaved = Boolean(sequenceSteps[step]);
                    const isSelected = selectedSequenceStep === step;
                    return (
                      <button
                        key={step}
                        onClick={() => handleSelectSequenceStep(step)}
                        className={`tool-button text-xs font-mono ${isSelected ? 'active' : ''} ${isSaved && !isSelected ? 'bg-muted/40' : ''}`}
                        title={isSaved ? `Step ${step}` : `Create step ${step}`}
                      >
                        {step}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={playSequence}
                  className="tool-button mt-2 w-full"
                  title="Play sequence"
                  disabled={sequencePlaying}
                >
                  {sequencePlaying ? 'Playing...' : 'Play Sequence'}
                </button>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="tool-button w-full"
                    onClick={() => handleSequenceLengthChange(-5)}
                    title="Remove sequence steps"
                    aria-label="Remove sequence steps"
                    disabled={maxSequence <= MIN_SEQUENCE}
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      remove
                    </span>
                  </button>
                  <button
                    type="button"
                    className="tool-button w-full"
                    onClick={() => handleSequenceLengthChange(5)}
                    title="Add sequence steps"
                    aria-label="Add sequence steps"
                    disabled={maxSequence >= MAX_SEQUENCE}
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      add
                    </span>
                  </button>
                </div>
              </div>
              <div className="panel">
                <div className="panel-header flex items-center justify-between">
                  <span>Delete</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="tool-button !p-1"
                        aria-label="Delete help"
                        title="Delete help"
                      >
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                          info
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs text-xs">
                      Clear the entire sequence or remove the currently selected step.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={handleSequenceDeleteAll}
                    className="tool-button w-full"
                    title="Clear all sequence steps"
                  >
                    Everything
                  </button>
                  <button
                    onClick={handleSequenceDeleteSelected}
                    className="tool-button w-full"
                    title="Delete selected step"
                    disabled={!selectedSequenceStep || !sequenceSteps[selectedSequenceStep]}
                  >
                    {selectedSequenceStep ? `Sequence Step ${selectedSequenceStep}` : 'Sequence Step'}
                  </button>
                </div>
              </div>
            </div>

          </>
        )}
      </div>

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overlay-scrim backdrop-blur-sm px-4 py-6">
          <div className="panel w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Settings
              </h2>
              <button
                onClick={handleCloseSettings}
                className="tool-button !p-1"
                title="Close settings"
                aria-label="Close settings"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  close
                </span>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <div className="panel-header">Color Mode</div>
                <select
                  value={draftThemeMode}
                  onChange={(e) => setDraftThemeMode(e.target.value as ThemeMode)}
                  className="w-full rounded-md border border-border/60 bg-background/70 px-3 py-2 text-sm text-foreground shadow-inner shadow-black/20"
                >
                  <option value="base">Base</option>
                  <option value="dark">Dark Tactical</option>
                  <option value="light">Light</option>
                  <option value="sharkans">Sharkans</option>
                </select>
              </div>

              <div>
                <div className="panel-header">Keybinds</div>
                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  {(
                    [
                      ['Select Tool', 'select'],
                      ['Pen Tool', 'pen'],
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
                        className="rounded-md border border-border/60 bg-background/70 px-2 py-1 text-sm text-foreground shadow-inner shadow-black/20"
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
      {instructionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overlay-scrim backdrop-blur-sm px-4 py-6">
          <div className="panel w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Info
              </h2>
              <button
                onClick={handleCloseInstructions}
                className="tool-button !p-1"
                title="Close info"
                aria-label="Close info"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  close
                </span>
              </button>
            </div>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p className="text-foreground">
                Welcome to Thefirstblueprint 2025-2026 for FTC! Here are some basic controls to get started:
              </p>
              <div className="grid gap-1 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                <span>I - intake</span>
                <span>K - shoot all</span>
                <span>L - cycle balls within bot</span>
                <span>O - shoots one ball</span>
                <span>A - cycle sequencer left one step</span>
                <span>D - cycle sequencer right one step</span>
              </div>
              <div className="space-y-3">
                <p className="text-foreground">How to get started:</p>
                <p>
                  Start by clicking the "setup field" button on the left hand side. This sets up bots in a close + far zone configuration with preloads. To interact, simply click and drag on the robots. On the left hand panel are many tools to interact with the field itself, including adding balls, drawing tools, motif controls and save/load.
                </p>
                <p className="text-foreground">Here are some of the functions:</p>
                <p>
                  Draw tools essentially treat the field as a whiteboard, allowing you to use thefirstblueprint just like a usual whiteboard planning strategy.
                </p>
                <p>
                  Adding balls will add balls to the left or right human player zones up to the maximum decode ball count.
                </p>
                <p>
                  Motif can be controlled to affect the point interface (shown on the right hand side), which will update upon proper motif selection.
                </p>
                <p>
                  The point interface works in a way where the points continue to accumulate throughout the game, and fully reset when clicking the "reset" button. The motif is continuously scored, but does not accumulate the score - it is only added based on current motif state.
                </p>
                <p>
                  For usage of sequencer, refer to the info hover (the "i" icon) on the sequencer panel.
                </p>
                <p>
                  Once you are happy with your sequences or strategy plan, scroll down on the left panel and click "export." This will save a json file that has the full configuration for that specific field instance, which can then be distributed or reuploaded via "import" to load a position.
                </p>
                <p className="text-foreground">Happy strategizing!</p>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
