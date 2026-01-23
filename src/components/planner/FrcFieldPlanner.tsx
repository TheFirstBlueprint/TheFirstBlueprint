import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useFrcFieldState } from '@/hooks/useFrcFieldState';
import { Tool, Alliance, Position } from '@/types/planner';
import { FrcFieldState, FrcFuel, FrcRobot, GoalActivationMode } from '@/types/frcPlanner';
import fieldImageBasic from '@/assets/basic_rebuilt_field.png';
import fieldImageDark from '@/assets/black_rebuilt_field.png';
import fieldImageLight from '@/assets/white_rebuilt_field.png';
import { FrcRobotElement } from './FrcRobotElement';
import { FrcFuelElement } from './FrcFuelElement';
import { DrawingCanvas } from './DrawingCanvas';
import { FrcToolPanel } from './FrcToolPanel';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const FIELD_FEET_WIDTH = 54;
const FIELD_FEET_HEIGHT = 27;
const FIELD_UNITS_PER_FOOT = 12;
const FIELD_WIDTH_IN = FIELD_FEET_WIDTH * FIELD_UNITS_PER_FOOT;
const FIELD_HEIGHT_IN = FIELD_FEET_HEIGHT * FIELD_UNITS_PER_FOOT;
const FIELD_WIDTH = FIELD_WIDTH_IN;
const FIELD_HEIGHT = FIELD_HEIGHT_IN;
const FIELD_SCREEN_RATIO = 0.9;
const FIELD_SCALE_MULTIPLIER = 1.1;
const AUTON_SECONDS = 20;
const TRANSITION_SECONDS = 7;
const TELEOP_SECONDS = 140;
const ROBOT_MIN_FT = 1;
const ROBOT_MAX_FT = 2.5;
const DEFAULT_ROBOT_FT = 2.5;
const STARTING_FUEL = 8;
const MAX_FUEL_CAPACITY = 100;
const FUEL_DIAMETER_IN = 5.91;
const FUEL_RADIUS_IN = 2.955;
const FUEL_PER_DEPOT = 24;
const FUEL_PER_OUTPOST = 24;
const FUEL_PER_NEUTRAL_BOX = 180;
const NEUTRAL_ZONE_WIDTH_IN = 206;
const NEUTRAL_ZONE_HEIGHT_IN = 72;
const NEUTRAL_ZONE_GAP_IN = 2;
const DEPOT_ZONE_IN = { x: 28.2, y: 77.0, width: 36, height: 30 };
const OUTPOST_ZONE_IN = {
  x: 597.6,
  y: 216.6,
  width: 36,
  height: 30,
};
const GOAL_ZONE_BASE_IN = {
  blue: { x: 432.1, y: 143.1, width: 36.6, height: 35.0 },
  red: { x: 193.5, y: 143.1, width: 36.6, height: 35.4 },
};
const GOAL_ZONE_X_OFFSET_IN = FIELD_WIDTH_IN * 0.01;
const GOAL_ZONES_IN = {
  blue: { ...GOAL_ZONE_BASE_IN.blue, x: GOAL_ZONE_BASE_IN.blue.x + GOAL_ZONE_X_OFFSET_IN },
  red: { ...GOAL_ZONE_BASE_IN.red, x: GOAL_ZONE_BASE_IN.red.x - GOAL_ZONE_X_OFFSET_IN },
};
const THEME_STORAGE_KEY = 'planner-theme-mode';
const KEYBINDS_STORAGE_KEY = 'planner-keybinds';
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
const MAX_BOUNDARY_STEP = 4;
const PERIMETER_BG_THRESHOLD = 10;
const PERIMETER_INSET = 10;

type ThemeMode = 'base' | 'dark' | 'light' | 'sharkans';
type Keybinds = typeof DEFAULT_KEYBINDS;
type SequenceStep = {
  positions: Record<string, { x: number; y: number }>;
  rotations: Record<string, number>;
  fuelState: {
    fuel: FrcFuel[];
    robotFuelCounts: Record<string, number>;
  };
};

type ShotFuel = {
  id: string;
  start: Position;
  target: Position;
};

type Point = {
  x: number;
  y: number;
};

type SolidRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

type PersistedFrcPlannerState = {
  version: 1;
  fieldState: FrcFieldState;
  activeTool: Tool;
  penColor: string;
  selectedRobotId: string | null;
  timerMode: 'full' | 'teleop' | 'auton';
  timerPhase: 'idle' | 'auton' | 'transition' | 'teleop';
  timeLeft: number;
  timerRunning: boolean;
  themeMode: ThemeMode;
  fieldScale: number;
  sequenceSteps: Record<number, SequenceStep>;
  sequencePlaying: boolean;
  selectedSequenceStep: number | null;
  maxSequence: number;
  keybinds: Keybinds;
  robotPanelOpen: boolean;
  robotDraft: {
    widthFt: number;
    heightFt: number;
    name: string;
    imageDataUrl: string | null;
  } | null;
  draftRobotId: string | null;
  hasFuelSetup: boolean;
};

let persistedFrcPlannerState: PersistedFrcPlannerState | null = null;

const normalizeThemeMode = (value: string | null): ThemeMode => {
  if (value === 'base' || value === 'dark' || value === 'light' || value === 'sharkans') return value;
  if (value === 'darkTactical') return 'dark';
  if (value === 'basic') return 'base';
  return 'dark';
};

const simplifyPolyline = (points: Point[], epsilon: number): Point[] => {
  if (points.length < 3) return points;
  const distanceToSegment = (point: Point, a: Point, b: Point) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 0 && dy === 0) {
      return Math.hypot(point.x - a.x, point.y - a.y);
    }
    const t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy);
    const clamped = Math.max(0, Math.min(1, t));
    const proj = { x: a.x + clamped * dx, y: a.y + clamped * dy };
    return Math.hypot(point.x - proj.x, point.y - proj.y);
  };

  const simplifySegment = (pts: Point[], start: number, end: number, epsilonValue: number, keep: boolean[]) => {
    let maxDistance = 0;
    let index = -1;
    const a = pts[start];
    const b = pts[end];
    for (let i = start + 1; i < end; i += 1) {
      const dist = distanceToSegment(pts[i], a, b);
      if (dist > maxDistance) {
        maxDistance = dist;
        index = i;
      }
    }
    if (maxDistance > epsilonValue && index !== -1) {
      keep[index] = true;
      simplifySegment(pts, start, index, epsilonValue, keep);
      simplifySegment(pts, index, end, epsilonValue, keep);
    }
  };

  const keep = new Array(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  simplifySegment(points, 0, points.length - 1, epsilon, keep);
  return points.filter((_, idx) => keep[idx]);
};

const insetPolygon = (points: Point[], inset: number): Point[] => {
  if (points.length === 0) return points;
  const centroid = points.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 }
  );
  centroid.x /= points.length;
  centroid.y /= points.length;
  return points.map((point) => {
    const dx = centroid.x - point.x;
    const dy = centroid.y - point.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return point;
    const scale = inset / dist;
    return { x: point.x + dx * scale, y: point.y + dy * scale };
  });
};

const buildPerimeterFromImage = (image: HTMLImageElement): Point[] => {
  const canvas = document.createElement('canvas');
  canvas.width = FIELD_WIDTH;
  canvas.height = FIELD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const scale = Math.max(FIELD_WIDTH / image.width, FIELD_HEIGHT / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const dx = (FIELD_WIDTH - drawWidth) / 2;
  const dy = (FIELD_HEIGHT - drawHeight) / 2;
  ctx.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
  ctx.drawImage(image, dx, dy, drawWidth, drawHeight);

  const { data } = ctx.getImageData(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
  const bg = [data[0], data[1], data[2]];
  const inside = new Array(FIELD_WIDTH * FIELD_HEIGHT).fill(false);
  for (let y = 0; y < FIELD_HEIGHT; y += 1) {
    for (let x = 0; x < FIELD_WIDTH; x += 1) {
      const idx = (y * FIELD_WIDTH + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const isBackground =
        Math.abs(r - bg[0]) <= PERIMETER_BG_THRESHOLD &&
        Math.abs(g - bg[1]) <= PERIMETER_BG_THRESHOLD &&
        Math.abs(b - bg[2]) <= PERIMETER_BG_THRESHOLD;
      inside[y * FIELD_WIDTH + x] = !isBackground;
    }
  }

  const isInside = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= FIELD_WIDTH || y >= FIELD_HEIGHT) return false;
    return inside[y * FIELD_WIDTH + x];
  };

  let start: Point | null = null;
  for (let y = 0; y < FIELD_HEIGHT && !start; y += 1) {
    for (let x = 0; x < FIELD_WIDTH; x += 1) {
      if (!isInside(x, y)) continue;
      if (!isInside(x - 1, y) || !isInside(x + 1, y) || !isInside(x, y - 1) || !isInside(x, y + 1)) {
        start = { x, y };
        break;
      }
    }
  }
  if (!start) return [];

  const neighbors = [
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
    { x: -1, y: 1 },
    { x: -1, y: 0 },
    { x: -1, y: -1 },
    { x: 0, y: -1 },
    { x: 1, y: -1 },
  ];

  const contour: Point[] = [];
  let current = start;
  let backtrack = { x: start.x - 1, y: start.y };
  const startBacktrack = { ...backtrack };
  const maxIterations = FIELD_WIDTH * FIELD_HEIGHT * 4;

  for (let iter = 0; iter < maxIterations; iter += 1) {
    contour.push({ ...current });
    const dx = backtrack.x - current.x;
    const dy = backtrack.y - current.y;
    let startIndex = neighbors.findIndex((n) => n.x === dx && n.y === dy);
    if (startIndex === -1) startIndex = 4;

    let next: Point | null = null;
    let nextBacktrack: Point | null = null;
    for (let i = 0; i < 8; i += 1) {
      const idx = (startIndex + 1 + i) % 8;
      const candidate = { x: current.x + neighbors[idx].x, y: current.y + neighbors[idx].y };
      if (isInside(candidate.x, candidate.y)) {
        next = candidate;
        const backIdx = (idx + 7) % 8;
        nextBacktrack = { x: current.x + neighbors[backIdx].x, y: current.y + neighbors[backIdx].y };
        break;
      }
    }
    if (!next || !nextBacktrack) break;
    current = next;
    backtrack = nextBacktrack;
    if (current.x === start.x && current.y === start.y && backtrack.x === startBacktrack.x && backtrack.y === startBacktrack.y) {
      break;
    }
  }

  if (contour.length < 3) return [];
  const simplified = simplifyPolyline(contour, 1.25);
  return insetPolygon(simplified, PERIMETER_INSET);
};

const ShotFuelElement = ({
  shot,
  radius,
  onComplete,
}: {
  shot: ShotFuel;
  radius: number;
  onComplete: (id: string) => void;
}) => {
  const [position, setPosition] = useState(shot.start);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      setPosition(shot.target);
    });
    const timeout = window.setTimeout(() => onComplete(shot.id), 450);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, [onComplete, shot.id, shot.target]);

  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: position.x - radius,
        top: position.y - radius,
        width: radius * 2,
        height: radius * 2,
        background: 'radial-gradient(circle at 30% 30%, #ffe4a3 0%, #f59e0b 55%, #b45309 100%)',
        boxShadow: '0 0 6px rgba(0,0,0,0.25)',
        transition: 'left 420ms linear, top 420ms linear',
        zIndex: 16,
      }}
    />
  );
};

export const FrcFieldPlanner = ({ className }: { className?: string }) => {
  const persistedState = useMemo(() => persistedFrcPlannerState, []);
  const {
    state,
    addRobot,
    updateRobotPosition,
    updateRobotRotation,
    updateRobotDetails,
    removeRobot,
    seedRobots,
    setFuel,
    updateFuelPosition,
    removeFuel,
    addDrawing,
    removeDrawing,
    clearDrawings,
    clearFuel,
    clearRobots,
    setGoalMode,
    restoreFuelState,
    exportState,
    importState,
  } = useFrcFieldState(persistedState?.fieldState);

  const [activeTool, setActiveTool] = useState<Tool>(persistedState?.activeTool ?? 'select');
  const [penColor, setPenColor] = useState(persistedState?.penColor ?? '#2b76d2');
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(persistedState?.selectedRobotId ?? null);
  const [timerMode, setTimerMode] = useState<'full' | 'teleop' | 'auton'>(
    persistedState?.timerMode ?? 'full'
  );
  const [timerPhase, setTimerPhase] = useState<'idle' | 'auton' | 'transition' | 'teleop'>(
    persistedState?.timerPhase ?? 'auton'
  );
  const [timeLeft, setTimeLeft] = useState(persistedState?.timeLeft ?? AUTON_SECONDS);
  const [timerRunning, setTimerRunning] = useState(persistedState?.timerRunning ?? false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(persistedState?.themeMode ?? 'dark');
  const [fieldScale, setFieldScale] = useState(persistedState?.fieldScale ?? 1);
  const [sequenceSteps, setSequenceSteps] = useState<Record<number, SequenceStep>>(
    persistedState?.sequenceSteps ?? {}
  );
  const [sequencePlaying, setSequencePlaying] = useState(persistedState?.sequencePlaying ?? false);
  const [selectedSequenceStep, setSelectedSequenceStep] = useState<number | null>(
    persistedState?.selectedSequenceStep ?? null
  );
  const [maxSequence, setMaxSequence] = useState(persistedState?.maxSequence ?? MIN_SEQUENCE);
  const [keybinds, setKeybinds] = useState<Keybinds>(persistedState?.keybinds ?? DEFAULT_KEYBINDS);
  const [robotPanelOpen, setRobotPanelOpen] = useState(persistedState?.robotPanelOpen ?? false);
  const [robotDraft, setRobotDraft] = useState<{
    widthFt: number;
    heightFt: number;
    name: string;
    imageDataUrl: string | null;
  } | null>(persistedState?.robotDraft ?? null);
  const [draftRobotId, setDraftRobotId] = useState<string | null>(persistedState?.draftRobotId ?? null);
  const [hasFuelSetup, setHasFuelSetup] = useState(persistedState?.hasFuelSetup ?? false);
  const [shotFuel, setShotFuel] = useState<ShotFuel[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const robotImageInputRef = useRef<HTMLInputElement>(null);
  const fieldAreaRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const fieldFrameRef = useRef<HTMLDivElement>(null);
  const robotsRef = useRef<FrcRobot[]>([]);
  const isApplyingSequenceRef = useRef(false);
  const fieldPerimeterRef = useRef<Point[] | null>(null);
  const lastBoundaryWarningRef = useRef(0);
  const isInputLocked = timerRunning && timerPhase === 'transition';
  const isDev = import.meta.env?.DEV ?? false;

  useEffect(() => {
    persistedFrcPlannerState = {
      version: 1,
      fieldState: state,
      activeTool,
      penColor,
      selectedRobotId,
      timerMode,
      timerPhase,
      timeLeft,
      timerRunning,
      themeMode,
      fieldScale,
      sequenceSteps,
      sequencePlaying,
      selectedSequenceStep,
      maxSequence,
      keybinds,
      robotPanelOpen,
      robotDraft,
      draftRobotId,
      hasFuelSetup,
    };
  }, [
    activeTool,
    draftRobotId,
    fieldScale,
    hasFuelSetup,
    keybinds,
    maxSequence,
    penColor,
    robotDraft,
    robotPanelOpen,
    selectedRobotId,
    selectedSequenceStep,
    sequencePlaying,
    sequenceSteps,
    state,
    themeMode,
    timeLeft,
    timerMode,
    timerPhase,
    timerRunning,
  ]);

  useEffect(() => {
    const storedTheme = normalizeThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY));
    document.documentElement.setAttribute('data-theme', storedTheme);
    setThemeMode(storedTheme);

    const storedKeybinds = window.localStorage.getItem(KEYBINDS_STORAGE_KEY);
    if (storedKeybinds) {
      try {
        const parsed = JSON.parse(storedKeybinds) as Partial<Keybinds>;
        setKeybinds({ ...DEFAULT_KEYBINDS, ...parsed });
      } catch {
        setKeybinds(DEFAULT_KEYBINDS);
      }
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => {
      const attrTheme = root.getAttribute('data-theme');
      const nextTheme = normalizeThemeMode(attrTheme ?? window.localStorage.getItem(THEME_STORAGE_KEY));
      setThemeMode(nextTheme);
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let canceled = false;
    const image = new Image();
    image.src = fieldImageBasic;
    image.onload = () => {
      if (canceled) return;
      const perimeter = buildPerimeterFromImage(image);
      fieldPerimeterRef.current = perimeter;
    };
    return () => {
      canceled = true;
    };
  }, []);

  const handleThemeModeChange = useCallback((nextMode: ThemeMode) => {
    setThemeMode(nextMode);
    document.documentElement.setAttribute('data-theme', nextMode);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextMode);
  }, []);

  const fieldImage = useMemo(() => {
    if (themeMode === 'light') return fieldImageLight;
    if (themeMode === 'dark') return fieldImageDark;
    if (themeMode === 'sharkans') return fieldImageBasic;
    return fieldImageBasic;
  }, [themeMode]);

  const pxPerIn = useMemo(
    () => Math.min((FIELD_WIDTH * fieldScale) / FIELD_WIDTH_IN, (FIELD_HEIGHT * fieldScale) / FIELD_HEIGHT_IN),
    [fieldScale]
  );
  const fuelRadius = useMemo(() => {
    const fuelRadiusPx = FUEL_RADIUS_IN * pxPerIn;
    return fuelRadiusPx / (fieldScale || 1);
  }, [fieldScale, pxPerIn]);
  const goalZonesIn = useMemo(() => GOAL_ZONES_IN, []);
  const fuelZonesIn = useMemo(() => {
    const centerX = FIELD_WIDTH_IN / 2;
    const centerY = FIELD_HEIGHT_IN / 2;
    const upper = {
      x: centerX - NEUTRAL_ZONE_WIDTH_IN / 2,
      y: centerY - NEUTRAL_ZONE_GAP_IN / 2 - NEUTRAL_ZONE_HEIGHT_IN,
      width: NEUTRAL_ZONE_WIDTH_IN,
      height: NEUTRAL_ZONE_HEIGHT_IN,
    };
    const lower = {
      x: centerX - NEUTRAL_ZONE_WIDTH_IN / 2,
      y: centerY + NEUTRAL_ZONE_GAP_IN / 2,
      width: NEUTRAL_ZONE_WIDTH_IN,
      height: NEUTRAL_ZONE_HEIGHT_IN,
    };
    return {
      depot: DEPOT_ZONE_IN,
      outpost: OUTPOST_ZONE_IN,
      neutralUpper: upper,
      neutralLower: lower,
    };
  }, []);

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

  useEffect(() => {
    if (!hasFuelSetup && state.fuel.length > 0) {
      setHasFuelSetup(true);
    }
  }, [hasFuelSetup, state.fuel.length]);

  const updateFieldScale = useCallback(() => {
    const area = fieldAreaRef.current;
    if (!area) return;
    const styles = window.getComputedStyle(area);
    const paddingX = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
    const paddingY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const availableWidth = area.clientWidth - paddingX;
    const availableHeight = area.clientHeight - paddingY;
    if (availableWidth <= 0 || availableHeight <= 0) return;
    const targetWidth = availableWidth * FIELD_SCREEN_RATIO;
    const targetHeight = availableHeight * FIELD_SCREEN_RATIO;
    const nextScale = Math.max(
      0.1,
      Math.min(targetWidth / FIELD_WIDTH, targetHeight / FIELD_HEIGHT) * FIELD_SCALE_MULTIPLIER
    );
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
      widthFt: robot.widthFt ?? DEFAULT_ROBOT_FT,
      heightFt: robot.widthFt ?? DEFAULT_ROBOT_FT,
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
            setTimerPhase('idle');
            setTimerRunning(false);
            return 0;
          }
        } else {
          setTimerRunning(false);
        }

        return 0;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timerMode, timerPhase, timerRunning]);

  const handleTimerModeChange = (mode: 'full' | 'teleop' | 'auton') => {
    setTimerMode(mode);
    setTimerRunning(false);
    if (mode === 'full') {
      setTimerPhase('auton');
      setTimeLeft(AUTON_SECONDS);
    } else if (mode === 'auton') {
      setTimerPhase('auton');
      setTimeLeft(AUTON_SECONDS);
    } else {
      setTimerPhase('teleop');
      setTimeLeft(TELEOP_SECONDS);
    }
  };

  const handleTimerToggle = () => {
    if (timerRunning) {
      setTimerRunning(false);
      return;
    }
    if (timeLeft <= 0) {
      if (timerMode === 'full' || timerMode === 'auton') {
        setTimerPhase('auton');
        setTimeLeft(AUTON_SECONDS);
      } else {
        setTimerPhase('teleop');
        setTimeLeft(TELEOP_SECONDS);
      }
    }
    setTimerRunning(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRobotDimensions = useCallback((robot: FrcRobot) => {
    const widthFt = Math.min(ROBOT_MAX_FT, Math.max(ROBOT_MIN_FT, robot.widthFt ?? DEFAULT_ROBOT_FT));
    const sizeIn = widthFt * FIELD_UNITS_PER_FOOT;
    return {
      width: sizeIn,
      height: sizeIn,
    };
  }, []);

  const clampToField = useCallback(
    (pos: { x: number; y: number }, width: number, height: number) => {
      const halfWidth = width / 2;
      const halfHeight = height / 2;
      return {
        x: Math.max(halfWidth, Math.min(FIELD_WIDTH_IN - halfWidth, pos.x)),
        y: Math.max(halfHeight, Math.min(FIELD_HEIGHT_IN - halfHeight, pos.y)),
      };
    },
    []
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

  const fallbackPerimeter = useMemo<Point[]>(() => (
    insetPolygon([
      { x: 0, y: 0 },
      { x: FIELD_WIDTH, y: 0 },
      { x: FIELD_WIDTH, y: FIELD_HEIGHT },
      { x: 0, y: FIELD_HEIGHT },
    ], PERIMETER_INSET)
  ), []);

  const getPerimeter = useCallback(() => fieldPerimeterRef.current ?? fallbackPerimeter, [fallbackPerimeter]);

  const isPointOnSegment = useCallback((point: Point, a: Point, b: Point, tolerance = 0.5) => {
    const cross = (point.y - a.y) * (b.x - a.x) - (point.x - a.x) * (b.y - a.y);
    if (Math.abs(cross) > tolerance) return false;
    const dot = (point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y);
    if (dot < 0) return false;
    const lenSq = (b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y);
    if (dot > lenSq) return false;
    return true;
  }, []);

  const isPointInsidePolygon = useCallback((point: Point, polygon: Point[]) => {
    if (polygon.length < 3) return false;
    for (let i = 0; i < polygon.length; i += 1) {
      const a = polygon[i];
      const b = polygon[(i + 1) % polygon.length];
      if (isPointOnSegment(point, a, b)) return true;
    }
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;
      const intersects = yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
      if (intersects) inside = !inside;
    }
    return inside;
  }, [isPointOnSegment]);

  const segmentsIntersect = useCallback((p1: Point, p2: Point, q1: Point, q2: Point) => {
    const orientation = (a: Point, b: Point, c: Point) => {
      const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
      if (Math.abs(value) < 1e-6) return 0;
      return value > 0 ? 1 : 2;
    };
    const onSegment = (a: Point, b: Point, c: Point) =>
      Math.min(a.x, c.x) <= b.x && b.x <= Math.max(a.x, c.x) &&
      Math.min(a.y, c.y) <= b.y && b.y <= Math.max(a.y, c.y);

    const o1 = orientation(p1, p2, q1);
    const o2 = orientation(p1, p2, q2);
    const o3 = orientation(q1, q2, p1);
    const o4 = orientation(q1, q2, p2);

    if (o1 !== o2 && o3 !== o4) return true;
    if (o1 === 0 && onSegment(p1, q1, p2)) return true;
    if (o2 === 0 && onSegment(p1, q2, p2)) return true;
    if (o3 === 0 && onSegment(q1, p1, q2)) return true;
    if (o4 === 0 && onSegment(q1, p2, q2)) return true;
    return false;
  }, []);

  const doesSegmentIntersectPolygon = useCallback((a: Point, b: Point, polygon: Point[]) => {
    for (let i = 0; i < polygon.length; i += 1) {
      const p1 = polygon[i];
      const p2 = polygon[(i + 1) % polygon.length];
      if (segmentsIntersect(a, b, p1, p2)) return true;
    }
    return false;
  }, [segmentsIntersect]);

  const getRobotCorners = useCallback((position: { x: number; y: number }, rotation: number, dimensions: { width: number; height: number }) => {
    const halfW = dimensions.width / 2;
    const halfH = dimensions.height / 2;
    const radians = (rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const offsets = [
      { x: -halfW, y: -halfH },
      { x: halfW, y: -halfH },
      { x: halfW, y: halfH },
      { x: -halfW, y: halfH },
    ];
    return offsets.map((offset) => ({
      x: position.x + offset.x * cos - offset.y * sin,
      y: position.y + offset.x * sin + offset.y * cos,
    }));
  }, []);

  const isRobotFootprintInside = useCallback(
    (position: { x: number; y: number }, rotation: number, dimensions: { width: number; height: number }) => {
      const perimeter = getPerimeter();
      const corners = getRobotCorners(position, rotation, dimensions);
      if (!corners.every((corner) => isPointInsidePolygon(corner, perimeter))) return false;
      for (let i = 0; i < corners.length; i += 1) {
        const a = corners[i];
        const b = corners[(i + 1) % corners.length];
        if (doesSegmentIntersectPolygon(a, b, perimeter)) return false;
      }
      return true;
    },
    [doesSegmentIntersectPolygon, getPerimeter, getRobotCorners, isPointInsidePolygon]
  );

  const rectsOverlap = useCallback((a: SolidRect, b: SolidRect) => {
    if (a.right <= b.left || a.left >= b.right) return false;
    if (a.bottom <= b.top || a.top >= b.bottom) return false;
    return true;
  }, []);

  const resolveSolidOverlap = useCallback(
    (pos: { x: number; y: number }, width: number, height: number, solids: SolidRect[]) => {
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

  const goalSolidRects = useMemo(
    () => [
      {
        left: goalZonesIn.blue.x,
        right: goalZonesIn.blue.x + goalZonesIn.blue.width,
        top: goalZonesIn.blue.y,
        bottom: goalZonesIn.blue.y + goalZonesIn.blue.height,
      },
      {
        left: goalZonesIn.red.x,
        right: goalZonesIn.red.x + goalZonesIn.red.width,
        top: goalZonesIn.red.y,
        bottom: goalZonesIn.red.y + goalZonesIn.red.height,
      },
    ],
    [goalZonesIn]
  );

  const resolvePositionWithSolids = useCallback(
    (pos: { x: number; y: number }, width: number, height: number, solids: SolidRect[]) => {
      let next = clampToField(pos, width, height);
      if (solids.length > 0) {
        next = resolveSolidOverlap(next, width, height, solids);
        next = clampToField(next, width, height);
      }
      return next;
    },
    [clampToField, resolveSolidOverlap]
  );

  const clampRobotPositionToBoundary = useCallback(
    (position: { x: number; y: number }, rotation: number, dimensions: { width: number; height: number }) => {
      if (isRobotFootprintInside(position, rotation, dimensions)) return position;
      const center = { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT / 2 };
      const dx = center.x - position.x;
      const dy = center.y - position.y;
      const distance = Math.hypot(dx, dy);
      if (distance === 0) return position;
      const steps = Math.max(1, Math.ceil(distance / MAX_BOUNDARY_STEP));
      for (let i = 1; i <= steps; i += 1) {
        const t = i / steps;
        const candidate = { x: position.x + dx * t, y: position.y + dy * t };
        if (isRobotFootprintInside(candidate, rotation, dimensions)) {
          return candidate;
        }
      }
      return position;
    },
    [isRobotFootprintInside]
  );

  const applyConstrainedRobotPosition = useCallback(
    (robotId: string, target: { x: number; y: number }, rotationOverride?: number) => {
      const robot = state.robots.find((item) => item.id === robotId);
      if (!robot) return;
      const dimensions = getRobotDimensions(robot);
      const rotation = rotationOverride ?? robot.rotation;
      const start = robot.position;
      const dx = target.x - start.x;
      const dy = target.y - start.y;
      const distance = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.ceil(distance / MAX_BOUNDARY_STEP));
      let last = start;
      for (let i = 1; i <= steps; i += 1) {
        const t = i / steps;
        const candidate = { x: start.x + dx * t, y: start.y + dy * t };
        if (isRobotFootprintInside(candidate, rotation, dimensions)) {
          last = candidate;
        } else {
          break;
        }
      }
      updateRobotPosition(robotId, last);
      if (isDev && (last.x !== target.x || last.y !== target.y)) {
        const now = Date.now();
        if (now - lastBoundaryWarningRef.current > 300) {
          console.warn('[FRC boundary] clamped robot position', { robotId, target, clamped: last });
          lastBoundaryWarningRef.current = now;
        }
      }
    },
    [getRobotDimensions, isRobotFootprintInside, state.robots, updateRobotPosition]
  );

  useEffect(() => {
    const shouldLog = isDev;
    const now = Date.now();
    state.robots.forEach((robot) => {
      const dimensions = getRobotDimensions(robot);
      if (!isRobotFootprintInside(robot.position, robot.rotation, dimensions)) {
        const clamped = clampRobotPositionToBoundary(robot.position, robot.rotation, dimensions);
        if (clamped.x !== robot.position.x || clamped.y !== robot.position.y) {
          updateRobotPosition(robot.id, clamped);
        }
        if (shouldLog && now - lastBoundaryWarningRef.current > 300) {
          console.warn('[FRC boundary] robot outside perimeter', {
            robotId: robot.id,
            position: robot.position,
            rotation: robot.rotation,
          });
          lastBoundaryWarningRef.current = now;
        }
      }
    });
  }, [clampRobotPositionToBoundary, getRobotDimensions, isRobotFootprintInside, isDev, state.robots, updateRobotPosition]);

  const clampFuelPosition = useCallback(
    (x: number, y: number) => resolvePositionWithSolids({ x, y }, FUEL_DIAMETER_IN, FUEL_DIAMETER_IN, []),
    [resolvePositionWithSolids]
  );

  const handleRobotMove = useCallback(
    (robotId: string, x: number, y: number) => {
      if (isInputLocked) return;
      const movingRobot = state.robots.find((item) => item.id === robotId);
      if (!movingRobot) return;
      const dimensions = getRobotDimensions(movingRobot);
      const candidate = resolvePositionWithSolids(
        { x, y },
        dimensions.width,
        dimensions.height,
        goalSolidRects
      );
      applyConstrainedRobotPosition(robotId, candidate, movingRobot.rotation);
    },
    [applyConstrainedRobotPosition, getRobotDimensions, goalSolidRects, isInputLocked, resolvePositionWithSolids, state.robots]
  );

  const handleFuelMove = useCallback(
    (fuelId: string, x: number, y: number) => {
      if (isInputLocked) return;
      updateFuelPosition(fuelId, { x, y });
    },
    [isInputLocked, updateFuelPosition]
  );

  const randomizeGoal = useCallback((): Alliance => (Math.random() < 0.5 ? 'blue' : 'red'), []);

  useEffect(() => {
    if (state.goalMode === 'randomized' && !state.randomizedGoal) {
      setGoalMode('randomized', randomizeGoal());
    }
  }, [randomizeGoal, setGoalMode, state.goalMode, state.randomizedGoal]);

  const activeGoals = useMemo(() => {
    if (state.goalMode === 'both') return { blue: true, red: true };
    if (state.goalMode === 'blue') return { blue: true, red: false };
    if (state.goalMode === 'red') return { blue: false, red: true };
    if (state.goalMode === 'randomized') {
      const goal = state.randomizedGoal ?? 'blue';
      return { blue: goal === 'blue', red: goal === 'red' };
    }
    return { blue: true, red: true };
  }, [state.goalMode, state.randomizedGoal]);

  const resolveGoalTarget = useCallback(
    (robot: FrcRobot) => {
      if (state.goalMode === 'both') return robot.alliance;
      if (state.goalMode === 'blue') return 'blue';
      if (state.goalMode === 'red') return 'red';
      return state.randomizedGoal ?? 'blue';
    },
    [state.goalMode, state.randomizedGoal]
  );

  const buildFuelGrid = useCallback(
    (
      zone: { x: number; y: number; width: number; height: number },
      count: number,
      options: { rotate?: boolean; spacingMultiplier?: number; minCols?: number; maxCols?: number } = {}
    ) => {
      const rotate = options.rotate ?? false;
      const spacingMultiplier = options.spacingMultiplier ?? 1.04;
      const minCols = options.minCols ?? 1;
      const maxCols = options.maxCols ?? Number.POSITIVE_INFINITY;
      const desiredSpacing = FUEL_DIAMETER_IN * spacingMultiplier;
      const minSpacing = FUEL_DIAMETER_IN;
      const usableWidth = Math.max(0, zone.width - FUEL_RADIUS_IN * 2);
      const usableHeight = Math.max(0, zone.height - FUEL_RADIUS_IN * 2);

      const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

      const buildGrid = (spacing: number) => {
        const widthForCols = rotate ? usableHeight : usableWidth;
        const heightForRows = rotate ? usableWidth : usableHeight;
        const maxColumnsByWidth = Math.max(1, Math.floor(widthForCols / spacing) + 1);
        const maxRowsByHeight = Math.max(1, Math.floor(heightForRows / spacing) + 1);
        const boundedMaxCols = Math.max(1, Math.min(maxColumnsByWidth, maxCols));
        const boundedMinCols = Math.max(1, Math.min(minCols, boundedMaxCols));
        let columns = clamp(Math.ceil(Math.sqrt(count)), boundedMinCols, boundedMaxCols);
        let rows = Math.ceil(count / columns);
        if (rows > maxRowsByHeight) {
          const neededCols = Math.ceil(count / maxRowsByHeight);
          columns = clamp(neededCols, boundedMinCols, boundedMaxCols);
          rows = Math.ceil(count / columns);
        }
        const total = Math.min(count, columns * rows);
        const offsetX = (usableWidth - (rotate ? rows - 1 : columns - 1) * spacing) / 2;
        const offsetY = (usableHeight - (rotate ? columns - 1 : rows - 1) * spacing) / 2;
        return { columns, rows, total, spacing, offsetX, offsetY, maxRowsByHeight };
      };

      let grid = buildGrid(desiredSpacing);
      if (grid.rows > grid.maxRowsByHeight && desiredSpacing > minSpacing) {
        grid = buildGrid(minSpacing);
      }

      const startX = zone.x + FUEL_RADIUS_IN + grid.offsetX;
      const startY = zone.y + FUEL_RADIUS_IN + grid.offsetY;

      const positions: Position[] = [];
      for (let i = 0; i < grid.total; i += 1) {
        const row = Math.floor(i / grid.columns);
        const col = i % grid.columns;
        positions.push({
          x: startX + (rotate ? row : col) * grid.spacing,
          y: startY + (rotate ? col : row) * grid.spacing,
        });
      }
      return positions;
    },
    []
  );

  const createFuelLayout = useCallback(() => {
    let fuelIndex = 0;
    const stamp = Date.now();
    const nextFuelId = () => `frc-fuel-${stamp}-${++fuelIndex}`;
    const depotPositions = buildFuelGrid(fuelZonesIn.depot, FUEL_PER_DEPOT, { rotate: true });
    const outpostPositions = buildFuelGrid(fuelZonesIn.outpost, FUEL_PER_OUTPOST, { rotate: true });
    const neutralUpperPositions = buildFuelGrid(fuelZonesIn.neutralUpper, FUEL_PER_NEUTRAL_BOX, {
      spacingMultiplier: 1.05,
      minCols: 14,
      maxCols: 22,
    });
    const neutralLowerPositions = buildFuelGrid(fuelZonesIn.neutralLower, FUEL_PER_NEUTRAL_BOX, {
      spacingMultiplier: 1.05,
      minCols: 14,
      maxCols: 22,
    });

    return [...depotPositions, ...outpostPositions, ...neutralUpperPositions, ...neutralLowerPositions].map(
      (position) => ({
      id: nextFuelId(),
      position,
    })
    );
  }, [buildFuelGrid, fuelZonesIn.depot, fuelZonesIn.neutralLower, fuelZonesIn.neutralUpper, fuelZonesIn.outpost]);

  const goalCenters = useMemo(
    () => ({
      blue: {
        x: goalZonesIn.blue.x + goalZonesIn.blue.width / 2,
        y: goalZonesIn.blue.y + goalZonesIn.blue.height / 2,
      },
      red: {
        x: goalZonesIn.red.x + goalZonesIn.red.width / 2,
        y: goalZonesIn.red.y + goalZonesIn.red.height / 2,
      },
    }),
    [goalZonesIn]
  );

  const defaultRobotSpawns = useMemo(
    () => [
      { alliance: 'blue' as Alliance, position: { x: FIELD_WIDTH * 0.753, y: FIELD_HEIGHT * 0.2 } },
      { alliance: 'blue' as Alliance, position: { x: FIELD_WIDTH * 0.753, y: FIELD_HEIGHT * 0.5 } },
      { alliance: 'blue' as Alliance, position: { x: FIELD_WIDTH * 0.753, y: FIELD_HEIGHT * 0.8 } },
      { alliance: 'red' as Alliance, position: { x: FIELD_WIDTH * 0.265, y: FIELD_HEIGHT * 0.2 } },
      { alliance: 'red' as Alliance, position: { x: FIELD_WIDTH * 0.265, y: FIELD_HEIGHT * 0.5 } },
      { alliance: 'red' as Alliance, position: { x: FIELD_WIDTH * 0.265, y: FIELD_HEIGHT * 0.8 } },
    ],
    []
  );

  const handleGoalModeChange = useCallback(
    (mode: GoalActivationMode) => {
      if (mode === 'randomized') {
        setGoalMode('randomized', randomizeGoal());
      } else {
        setGoalMode(mode, null);
      }
    },
    [randomizeGoal, setGoalMode]
  );

  const handleShoot = useCallback(() => {
    if (!selectedRobotId) return;
    const robot = state.robots.find((item) => item.id === selectedRobotId);
    if (!robot) return;

    const availableFuel = robot.fuelCount ?? STARTING_FUEL;
    if (availableFuel <= 0) return;
    const shotCount = availableFuel >= 2 ? 2 : 1;
    const targetGoal = resolveGoalTarget(robot);
    const target = goalCenters[targetGoal];
    const nextFuelCount = Math.max(0, availableFuel - shotCount);
    updateRobotDetails(robot.id, { fuelCount: nextFuelCount });

    setShotFuel((prev) => {
      const next = [...prev];
      for (let i = 0; i < shotCount; i += 1) {
        const offset = (i === 0 ? -1 : 1) * (FUEL_RADIUS_IN * 0.65);
        next.push({
          id: `shot-${robot.id}-${Date.now()}-${i}`,
          start: { x: robot.position.x + offset, y: robot.position.y },
          target,
        });
      }
      return next;
    });
  }, [goalCenters, resolveGoalTarget, selectedRobotId, state.robots, updateRobotDetails]);

  const rotateSelectedRobot = useCallback(
    (delta: number) => {
      if (!selectedRobotId) return;
      const robot = state.robots.find((item) => item.id === selectedRobotId);
      if (!robot) return;
      updateRobotRotation(selectedRobotId, robot.rotation + delta);
    },
    [selectedRobotId, state.robots, updateRobotRotation]
  );

  const handleFieldClick = () => {
    if (isInputLocked) return;
    if (robotPanelOpen) return;
    setSelectedRobotId(null);
  };

  const saveSequenceStep = useCallback(
    (index: number, robots: FrcRobot[], silent = false) => {
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
      const fuelState = {
        fuel: state.fuel.map((item) => ({ ...item })),
        robotFuelCounts: robots.reduce<Record<string, number>>((acc, robot) => {
          acc[robot.id] = robot.fuelCount ?? STARTING_FUEL;
          return acc;
        }, {}),
      };
      setSequenceSteps((prev) => ({
        ...prev,
        [index]: { positions, rotations, fuelState },
      }));
      if (!silent) {
        toast.success(`Saved step ${index}.`);
      }
    },
    [state.fuel]
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

  const applySequenceStep = useCallback(
    (index: number) => {
      const step = sequenceSteps[index];
      if (!step) return;
      isApplyingSequenceRef.current = true;
      robotsRef.current.forEach((robot) => {
        const position = step.positions[robot.id];
        const rotation = step.rotations[robot.id];
        if (position) {
          applyConstrainedRobotPosition(robot.id, position, rotation ?? robot.rotation);
        }
        if (rotation !== undefined) {
          updateRobotRotation(robot.id, rotation);
        }
      });
      if (step.fuelState) {
        restoreFuelState(step.fuelState);
      }
      window.setTimeout(() => {
        isApplyingSequenceRef.current = false;
      }, 0);
    },
    [applyConstrainedRobotPosition, restoreFuelState, sequenceSteps, updateRobotRotation]
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
      if (next === prev) return prev;
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
            const nextPosition = {
              x: robot.position.x + (target.x - robot.position.x) * t,
              y: robot.position.y + (target.y - robot.position.y) * t,
            };
            const nextRotation = startRot + (targetRot - startRot) * t;
            applyConstrainedRobotPosition(robot.id, nextPosition, nextRotation);
            updateRobotRotation(robot.id, nextRotation);
          });
          if (t < 1) {
            window.requestAnimationFrame(tick);
          } else {
            resolve();
          }
        };
        window.requestAnimationFrame(tick);
      });
      if (step.fuelState) {
        restoreFuelState(step.fuelState);
      }
      isApplyingSequenceRef.current = false;
    }
    setSequencePlaying(false);
  }, [applyConstrainedRobotPosition, maxSequence, restoreFuelState, sequencePlaying, sequenceSteps, updateRobotRotation]);

  useEffect(() => {
    if (sequenceSteps[selectedSequenceStep ?? -1]) {
      saveSequenceStep(selectedSequenceStep ?? 1, robotsRef.current, true);
    }
  }, [saveSequenceStep, selectedSequenceStep]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.target instanceof HTMLTextAreaElement) return;
      if (isInputLocked) return;

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
        case keybinds.outtakeSingle:
        case keybinds.outtakeAll:
          e.preventDefault();
          handleShoot();
          break;
        case 'a':
          handleSequenceStepChange(-1);
          break;
        case 'd':
          handleSequenceStepChange(1);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSequenceStepChange, handleShoot, isInputLocked, keybinds, rotateSelectedRobot]);

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
        map.set(robot.id, `${index + 4}`);
      }
    });
    return map;
  }, [state.robots]);

  const getRobotDisplayName = useCallback(
    (robot: FrcRobot) => robot.name?.trim() || defaultNameMap.get(robot.id) || '',
    [defaultNameMap]
  );

  const getDefaultNameForRobot = useCallback(
    (robot: FrcRobot) => {
      const allianceRobots = state.robots.filter((item) => item.alliance === robot.alliance);
      const index = allianceRobots.findIndex((item) => item.id === robot.id);
      if (index === -1) return '';
      return robot.alliance === 'blue' ? `${index + 1}` : `${index + 4}`;
    },
    [state.robots]
  );

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
        widthFt: robot.widthFt ?? DEFAULT_ROBOT_FT,
        heightFt: robot.widthFt ?? DEFAULT_ROBOT_FT,
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

  const handleRobotSave = () => {
    if (!selectedRobotId || !robotDraft) return;
    const name = robotDraft.name.trim();
    if (name && !/^\d{1,5}$/.test(name)) {
      toast.error('Robot name must be 1-5 digits.');
      return;
    }
    const selected = state.robots.find((robot) => robot.id === selectedRobotId);
    const proposedName = name || (selected ? getDefaultNameForRobot(selected) : '');
    const takenNames = state.robots
      .filter((robot) => robot.id !== selectedRobotId)
      .map((robot) => getRobotDisplayName(robot));
    if (proposedName && takenNames.includes(proposedName)) {
      toast.error('Robot names must be unique.');
      return;
    }
    updateRobotDetails(selectedRobotId, {
      widthFt: Math.min(ROBOT_MAX_FT, Math.max(ROBOT_MIN_FT, robotDraft.widthFt)),
      heightFt: Math.min(ROBOT_MAX_FT, Math.max(ROBOT_MIN_FT, robotDraft.widthFt)),
      name,
      imageDataUrl: robotDraft.imageDataUrl,
    });
    setRobotPanelOpen(false);
    setRobotDraft(null);
    setDraftRobotId(null);
    setSelectedRobotId(null);
  };

  const handleExport = () => {
    const data = exportState();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `frc-strategy-${Date.now()}.json`;
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

  const checkRobotCollision = useCallback(
    (x: number, y: number) => {
      for (const robot of state.robots) {
        const sizeFt = robot.widthFt ?? DEFAULT_ROBOT_FT;
        const sizeIn = sizeFt * FIELD_UNITS_PER_FOOT;
        const halfSize = sizeIn / 2;
        const withinX =
          x >= robot.position.x - halfSize - FUEL_RADIUS_IN &&
          x <= robot.position.x + halfSize + FUEL_RADIUS_IN;
        const withinY =
          y >= robot.position.y - halfSize - FUEL_RADIUS_IN &&
          y <= robot.position.y + halfSize + FUEL_RADIUS_IN;
        if (withinX && withinY && (robot.fuelCount ?? 0) < MAX_FUEL_CAPACITY) {
          return robot.id;
        }
      }
      return null;
    },
    [state.robots]
  );

  const collectFuelForRobot = useCallback(
    (robotId: string, fuelId: string) => {
      const robot = state.robots.find((item) => item.id === robotId);
      if (!robot) return;
      if ((robot.fuelCount ?? 0) >= MAX_FUEL_CAPACITY) return;
      updateRobotDetails(robotId, { fuelCount: (robot.fuelCount ?? STARTING_FUEL) + 1 });
      removeFuel(fuelId);
    },
    [removeFuel, state.robots, updateRobotDetails]
  );

  const setupRobots = useCallback(() => {
    const blueRobots = state.robots.filter((robot) => robot.alliance === 'blue');
    const redRobots = state.robots.filter((robot) => robot.alliance === 'red');

    const ensureRobot = (alliance: Alliance, index: number, position: { x: number; y: number }) => {
      const robots = alliance === 'blue' ? blueRobots : redRobots;
      const existing = robots[index];
      if (!existing) {
        const sizeIn = DEFAULT_ROBOT_FT * FIELD_UNITS_PER_FOOT;
        const constrained = clampRobotPositionToBoundary(position, 0, { width: sizeIn, height: sizeIn });
        return addRobot(alliance, constrained, { width: DEFAULT_ROBOT_FT, height: DEFAULT_ROBOT_FT });
      }
      applyConstrainedRobotPosition(existing.id, position, existing.rotation);
      return existing.id;
    };

    defaultRobotSpawns.forEach((spawn, index) => {
      ensureRobot(spawn.alliance, index % 3, spawn.position);
    });
  }, [addRobot, applyConstrainedRobotPosition, clampRobotPositionToBoundary, defaultRobotSpawns, state.robots]);

  const handleSetupField = () => {
    setupRobots();
    setFuel(createFuelLayout());
    setHasFuelSetup(true);
    if (state.goalMode === 'randomized') {
      setGoalMode('randomized', randomizeGoal());
    }
  };

  const handleClearFuel = () => {
    clearFuel();
  };

  const handleClearRobots = () => {
    clearRobots();
    setSelectedRobotId(null);
    setRobotPanelOpen(false);
    setRobotDraft(null);
    setDraftRobotId(null);
  };

  const handleResetField = () => {
    clearDrawings();
    clearFuel();
    setShotFuel([]);
    const sizeIn = DEFAULT_ROBOT_FT * FIELD_UNITS_PER_FOOT;
    seedRobots(defaultRobotSpawns.map((spawn) => ({
      alliance: spawn.alliance,
      position: clampRobotPositionToBoundary(spawn.position, 0, { width: sizeIn, height: sizeIn }),
      sizeFt: DEFAULT_ROBOT_FT,
    })));
    if (hasFuelSetup) {
      setFuel(createFuelLayout());
    }
    if (state.goalMode === 'randomized') {
      setGoalMode('randomized', randomizeGoal());
    }
    setSelectedRobotId(null);
    setRobotPanelOpen(false);
    setRobotDraft(null);
    setDraftRobotId(null);
  };

  const redRobotCount = state.robots.filter((robot) => robot.alliance === 'red').length;
  const blueRobotCount = state.robots.filter((robot) => robot.alliance === 'blue').length;
  const canAddRedRobot = redRobotCount < 3;
  const canAddBlueRobot = blueRobotCount < 3;

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
      <div className="panel-left w-64 flex-shrink-0 h-full min-h-0 flex flex-col overflow-y-auto overscroll-contain">
        <div className="h-full overflow-y-auto overscroll-contain p-5 pb-24">
          <FrcToolPanel
            activeTool={activeTool}
            onToolChange={setActiveTool}
            penColor={penColor}
            onPenColorChange={setPenColor}
            themeMode={themeMode}
            onThemeModeChange={handleThemeModeChange}
            onAddRobot={(alliance) => {
              const sizeIn = DEFAULT_ROBOT_FT * FIELD_UNITS_PER_FOOT;
              const start = clampRobotPositionToBoundary(
                { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT / 2 },
                0,
                { width: sizeIn, height: sizeIn }
              );
              addRobot(alliance, start, { width: DEFAULT_ROBOT_FT, height: DEFAULT_ROBOT_FT });
            }}
            canAddRedRobot={canAddRedRobot}
            canAddBlueRobot={canAddBlueRobot}
            onClearDrawings={clearDrawings}
            onClearFuel={handleClearFuel}
            onClearRobots={handleClearRobots}
            onResetField={handleResetField}
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
      </div>

      <div
        ref={fieldAreaRef}
        className="flex-1 flex items-start justify-center p-8 pt-6 field-container"
      >
        <div
          ref={fieldFrameRef}
          className="relative z-10"
          style={{ width: FIELD_WIDTH * fieldScale, height: FIELD_HEIGHT * fieldScale }}
        >
          <div
            className="relative field-surface"
            style={{
              width: FIELD_WIDTH,
              height: FIELD_HEIGHT,
              transform: `scale(${fieldScale})`,
              transformOrigin: 'top left',
              backgroundColor: 'transparent',
              backgroundImage: `url(${fieldImage})`,
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'cover',
            }}
            onClick={handleFieldClick}
            ref={fieldRef}
          >
            <DrawingCanvas
              width={FIELD_WIDTH}
              height={FIELD_HEIGHT}
              drawings={state.drawings}
              activeTool={activeTool}
              penColor={penColor}
              penWidth={2}
              onAddDrawing={addDrawing}
              onRemoveDrawing={removeDrawing}
              isLocked={isInputLocked}
              scale={fieldScale}
            />

            <div
              className={`absolute frc-goal-zone ${activeGoals.blue ? 'frc-goal-zone-active' : ''} frc-goal-zone-blue`}
              style={{
                left: goalZonesIn.blue.x,
                top: goalZonesIn.blue.y,
                width: goalZonesIn.blue.width,
                height: goalZonesIn.blue.height,
              }}
            />
            <div
              className={`absolute frc-goal-zone ${activeGoals.red ? 'frc-goal-zone-active' : ''} frc-goal-zone-red`}
              style={{
                left: goalZonesIn.red.x,
                top: goalZonesIn.red.y,
                width: goalZonesIn.red.width,
                height: goalZonesIn.red.height,
              }}
            />

            {state.fuel.map((fuel) => (
              <FrcFuelElement
                key={fuel.id}
                id={fuel.id}
                position={fuel.position}
                radius={fuelRadius}
                onPositionChange={(x, y) => handleFuelMove(fuel.id, x, y)}
                onCollectByRobot={(robotId) => collectFuelForRobot(robotId, fuel.id)}
                checkRobotCollision={checkRobotCollision}
                clampPosition={clampFuelPosition}
                isLocked={isInputLocked}
                scale={fieldScale}
              />
            ))}

            {shotFuel.map((shot) => (
              <ShotFuelElement
                key={shot.id}
                shot={shot}
                radius={fuelRadius}
                onComplete={(id) =>
                  setShotFuel((prev) => prev.filter((item) => item.id !== id))
                }
              />
            ))}

            {state.robots.map((robot) => {
              const dimensions = getRobotDimensions(robot);
              const displayName = getRobotDisplayName(robot);
              return (
                <FrcRobotElement
                  key={robot.id}
                  robot={robot}
                  dimensions={dimensions}
                  displayName={displayName}
                  isSelected={selectedRobotId === robot.id}
                  onSelect={() => setSelectedRobotId(robot.id)}
                  onPositionChange={(x, y) => handleRobotMove(robot.id, x, y)}
                  onRotate={(delta) => updateRobotRotation(robot.id, robot.rotation + delta)}
                  onEdit={() => handleRobotPanelOpen(robot.id)}
                  onRemove={() => {
                    removeRobot(robot.id);
                    setSelectedRobotId(null);
                    handleRobotPanelClose();
                  }}
                  isLocked={isInputLocked}
                  scale={fieldScale}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="panel-right w-64 flex-shrink-0 h-full min-h-0 flex flex-col overflow-y-auto overscroll-contain">
        <div className="h-full overflow-y-auto overscroll-contain p-5 pb-24">
          <div className="mb-6">
            <h1 className="font-title text-xl uppercase tracking-[0.2em] text-primary mb-1">
              FRC Strategy
            </h1>
            <p className="font-display text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              Field Planner
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
                    <label className="block mb-1 text-xs text-foreground">Width (feet)</label>
                    <input
                      type="number"
                      min={ROBOT_MIN_FT}
                      max={ROBOT_MAX_FT}
                      step={0.5}
                      value={robotDraft.widthFt}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        if (Number.isNaN(next)) return;
                        setRobotDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                widthFt: Math.min(ROBOT_MAX_FT, Math.max(ROBOT_MIN_FT, next)),
                                heightFt: Math.min(ROBOT_MAX_FT, Math.max(ROBOT_MIN_FT, next)),
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
                        if (next === '' || /^\\d{0,5}$/.test(next)) {
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
                  <div className="panel-header">Goal Activation</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleGoalModeChange('both')}
                      className={`tool-button text-xs ${state.goalMode === 'both' ? 'active' : ''}`}
                      title="Both goals active"
                    >
                      Both Active
                    </button>
                    <button
                      onClick={() => handleGoalModeChange('blue')}
                      className={`tool-button text-xs ${state.goalMode === 'blue' ? 'active' : ''}`}
                      title="Blue goal active"
                    >
                      Blue Active
                    </button>
                    <button
                      onClick={() => handleGoalModeChange('red')}
                      className={`tool-button text-xs ${state.goalMode === 'red' ? 'active' : ''}`}
                      title="Red goal active"
                    >
                      Red Active
                    </button>
                    <button
                      onClick={() => handleGoalModeChange('randomized')}
                      className={`tool-button text-xs ${state.goalMode === 'randomized' ? 'active' : ''}`}
                      title="Randomized goal"
                    >
                      Randomized
                    </button>
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    {state.goalMode === 'both' && 'Both goals are active.'}
                    {state.goalMode === 'blue' && 'All robots shoot the blue goal.'}
                    {state.goalMode === 'red' && 'All robots shoot the red goal.'}
                    {state.goalMode === 'randomized' &&
                      `Active goal: ${(state.randomizedGoal ?? 'blue').toUpperCase()}`}
                  </div>
                </div>
                <div className="panel mobile-hide">
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
                      <span className="material-symbols-outlined text-[18px] mobile-only-flex" aria-hidden="true">
                        delete
                      </span>
                      <span className="mobile-hide">Everything</span>
                    </button>
                    <button
                      onClick={handleSequenceDeleteSelected}
                      className="tool-button w-full"
                      title="Delete selected step"
                      disabled={!selectedSequenceStep || !sequenceSteps[selectedSequenceStep]}
                    >
                      <span className="material-symbols-outlined text-[18px] mobile-only-flex" aria-hidden="true">
                        delete_forever
                      </span>
                      <span className="mobile-hide">
                        {selectedSequenceStep ? `Sequence Step ${selectedSequenceStep}` : 'Sequence Step'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
