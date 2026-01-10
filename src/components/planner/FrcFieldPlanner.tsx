import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useFrcFieldState } from '@/hooks/useFrcFieldState';
import { Tool, Alliance } from '@/types/planner';
import { FrcRobot } from '@/types/frcPlanner';
import { FrcRobotElement } from './FrcRobotElement';
import { DrawingCanvas } from './DrawingCanvas';
import { FrcToolPanel } from './FrcToolPanel';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const FIELD_FEET_WIDTH = 54;
const FIELD_FEET_HEIGHT = 27;
const FIELD_UNITS_PER_FOOT = 10;
const FIELD_WIDTH = FIELD_FEET_WIDTH * FIELD_UNITS_PER_FOOT;
const FIELD_HEIGHT = FIELD_FEET_HEIGHT * FIELD_UNITS_PER_FOOT;
const FIELD_SCREEN_RATIO = 0.8;
const FIELD_SCALE_MULTIPLIER = 1.1;
const AUTON_SECONDS = 30;
const TRANSITION_SECONDS = 7;
const TELEOP_SECONDS = 120;
const ROBOT_MIN_FT = 1;
const ROBOT_MAX_FT = 6;
const DEFAULT_ROBOT_FT = 3;
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

type ThemeMode = 'base' | 'dark' | 'light' | 'sharkans';
type Keybinds = typeof DEFAULT_KEYBINDS;
type SequenceStep = {
  positions: Record<string, { x: number; y: number }>;
  rotations: Record<string, number>;
};

const normalizeThemeMode = (value: string | null): ThemeMode => {
  if (value === 'base' || value === 'dark' || value === 'light' || value === 'sharkans') return value;
  if (value === 'basic') return 'base';
  return 'dark';
};

export const FrcFieldPlanner = ({ className }: { className?: string }) => {
  const {
    state,
    addRobot,
    updateRobotPosition,
    updateRobotRotation,
    updateRobotDetails,
    removeRobot,
    addDrawing,
    removeDrawing,
    clearDrawings,
    clearRobots,
    resetField,
    exportState,
    importState,
  } = useFrcFieldState();

  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [penColor, setPenColor] = useState('#2b76d2');
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);
  const [timerMode, setTimerMode] = useState<'full' | 'teleop' | 'auton'>('full');
  const [timerPhase, setTimerPhase] = useState<'idle' | 'auton' | 'transition' | 'teleop'>('auton');
  const [timeLeft, setTimeLeft] = useState(AUTON_SECONDS);
  const [timerRunning, setTimerRunning] = useState(false);
  const [fieldScale, setFieldScale] = useState(1);
  const [sequenceSteps, setSequenceSteps] = useState<Record<number, SequenceStep>>({});
  const [sequencePlaying, setSequencePlaying] = useState(false);
  const [selectedSequenceStep, setSelectedSequenceStep] = useState<number | null>(null);
  const [maxSequence, setMaxSequence] = useState(MIN_SEQUENCE);
  const [keybinds, setKeybinds] = useState<Keybinds>(DEFAULT_KEYBINDS);
  const [robotPanelOpen, setRobotPanelOpen] = useState(false);
  const [robotDraft, setRobotDraft] = useState<{
    widthFt: number;
    heightFt: number;
    name: string;
    imageDataUrl: string | null;
  } | null>(null);
  const [draftRobotId, setDraftRobotId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const robotImageInputRef = useRef<HTMLInputElement>(null);
  const fieldAreaRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const fieldFrameRef = useRef<HTMLDivElement>(null);
  const robotsRef = useRef<FrcRobot[]>([]);
  const isApplyingSequenceRef = useRef(false);
  const isInputLocked = timerRunning && timerPhase === 'transition';

  useEffect(() => {
    const storedTheme = normalizeThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY));
    document.documentElement.setAttribute('data-theme', storedTheme);

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
      heightFt: robot.heightFt ?? DEFAULT_ROBOT_FT,
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
    const heightFt = Math.min(ROBOT_MAX_FT, Math.max(ROBOT_MIN_FT, robot.heightFt ?? DEFAULT_ROBOT_FT));
    return {
      width: widthFt * FIELD_UNITS_PER_FOOT,
      height: heightFt * FIELD_UNITS_PER_FOOT,
    };
  }, []);

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
      setSequenceSteps((prev) => ({
        ...prev,
        [index]: { positions, rotations },
      }));
      if (!silent) {
        toast.success(`Saved step ${index}.`);
      }
    },
    []
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
          updateRobotPosition(robot.id, position);
        }
        if (rotation !== undefined) {
          updateRobotRotation(robot.id, rotation);
        }
      });
      window.setTimeout(() => {
        isApplyingSequenceRef.current = false;
      }, 0);
    },
    [sequenceSteps, updateRobotPosition, updateRobotRotation]
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
    }
    setSequencePlaying(false);
  }, [maxSequence, sequencePlaying, sequenceSteps, updateRobotPosition, updateRobotRotation]);

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
  }, [handleSequenceStepChange, isInputLocked, keybinds, rotateSelectedRobot]);

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
        heightFt: robot.heightFt ?? DEFAULT_ROBOT_FT,
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
      heightFt: Math.min(ROBOT_MAX_FT, Math.max(ROBOT_MIN_FT, robotDraft.heightFt)),
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

  const handleSetupField = () => {
    const blueTargets = [
      { x: FIELD_WIDTH * 0.15, y: FIELD_HEIGHT * 0.2 },
      { x: FIELD_WIDTH * 0.15, y: FIELD_HEIGHT * 0.5 },
      { x: FIELD_WIDTH * 0.15, y: FIELD_HEIGHT * 0.8 },
    ];
    const redTargets = [
      { x: FIELD_WIDTH * 0.85, y: FIELD_HEIGHT * 0.2 },
      { x: FIELD_WIDTH * 0.85, y: FIELD_HEIGHT * 0.5 },
      { x: FIELD_WIDTH * 0.85, y: FIELD_HEIGHT * 0.8 },
    ];

    const blueRobots = state.robots.filter((robot) => robot.alliance === 'blue');
    const redRobots = state.robots.filter((robot) => robot.alliance === 'red');

    const ensureRobot = (alliance: Alliance, index: number, position: { x: number; y: number }) => {
      const robots = alliance === 'blue' ? blueRobots : redRobots;
      const existing = robots[index];
      if (!existing) {
        return addRobot(alliance, position, { width: DEFAULT_ROBOT_FT, height: DEFAULT_ROBOT_FT });
      }
      updateRobotPosition(existing.id, position);
      return existing.id;
    };

    blueTargets.forEach((target, index) => ensureRobot('blue', index, target));
    redTargets.forEach((target, index) => ensureRobot('red', index, target));
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
            onAddRobot={(alliance) =>
              addRobot(alliance, { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT / 2 }, { width: DEFAULT_ROBOT_FT, height: DEFAULT_ROBOT_FT })
            }
            canAddRedRobot={canAddRedRobot}
            canAddBlueRobot={canAddBlueRobot}
            onClearDrawings={clearDrawings}
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
            className="relative field-surface bg-black"
            style={{
              width: FIELD_WIDTH,
              height: FIELD_HEIGHT,
              transform: `scale(${fieldScale})`,
              transformOrigin: 'top left',
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
                  onPositionChange={(x, y) => updateRobotPosition(robot.id, { x, y })}
                  onRotate={(delta) => updateRobotRotation(robot.id, robot.rotation + delta)}
                  onEdit={() => handleRobotPanelOpen(robot.id)}
                  onRemove={() => {
                    removeRobot(robot.id);
                    setSelectedRobotId(null);
                    handleRobotPanelClose();
                  }}
                  fieldBounds={{ width: FIELD_WIDTH, height: FIELD_HEIGHT }}
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
                              }
                            : prev
                        );
                      }}
                      className="w-full rounded-md border border-border/60 bg-background/70 px-2 py-1 text-sm text-foreground shadow-inner shadow-black/20"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-xs text-foreground">Height (feet)</label>
                    <input
                      type="number"
                      min={ROBOT_MIN_FT}
                      max={ROBOT_MAX_FT}
                      step={0.5}
                      value={robotDraft.heightFt}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        if (Number.isNaN(next)) return;
                        setRobotDraft((prev) =>
                          prev
                            ? {
                                ...prev,
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
      </div>
    </div>
  );
};
