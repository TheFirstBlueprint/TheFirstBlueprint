import { useState, useCallback } from 'react';
import { Alliance, DrawingPath, Position } from '@/types/planner';
import { FrcFieldState, FrcFuel, FrcRobot, GoalActivationMode } from '@/types/frcPlanner';

let idCounter = 0;
const generateId = () => `frc-${++idCounter}-${Date.now()}`;
const INCHES_PER_FOOT = 12;
const FUEL_RADIUS_IN = 2.955;
const MAX_FUEL_CAPACITY = 100;
const STARTING_FUEL = 8;

const createInitialState = (): FrcFieldState => ({
  robots: [],
  drawings: [],
  fuel: [],
  goalMode: 'both',
  randomizedGoal: null,
});

const normalizeFrcFieldState = (parsed: FrcFieldState): FrcFieldState => ({
  robots: (parsed.robots ?? []).map((robot) => {
    const widthFt = robot.widthFt ?? 3;
    const sizeFt = widthFt;
    return {
      ...robot,
      widthFt: sizeFt,
      heightFt: sizeFt,
      fuelCount: Math.max(0, Math.min(MAX_FUEL_CAPACITY, robot.fuelCount ?? STARTING_FUEL)),
    };
  }),
  drawings: parsed.drawings ?? [],
  fuel: parsed.fuel ?? [],
  goalMode: parsed.goalMode ?? 'both',
  randomizedGoal: parsed.randomizedGoal ?? null,
});

export const useFrcFieldState = (initialState?: FrcFieldState) => {
  const [state, setState] = useState<FrcFieldState>(
    () => (initialState ? normalizeFrcFieldState(initialState) : createInitialState())
  );

  const addRobot = useCallback((alliance: Alliance, position: Position, size?: { width: number; height: number }) => {
    const allianceCount = state.robots.filter((robot) => robot.alliance === alliance).length;
    if (state.robots.length >= 6 || allianceCount >= 3) {
      return null;
    }

    const sizeFt = size?.width ?? 3;
    const robot: FrcRobot = {
      id: generateId(),
      position,
      rotation: 0,
      widthFt: sizeFt,
      heightFt: sizeFt,
      alliance,
      fuelCount: STARTING_FUEL,
      name: '',
      imageDataUrl: null,
    };

    setState((prev) => ({ ...prev, robots: [...prev.robots, robot] }));
    return robot.id;
  }, [state.robots]);

  const seedRobots = useCallback(
    (robots: Array<{ alliance: Alliance; position: Position; sizeFt?: number }>) => {
      setState((prev) => ({
        ...prev,
        robots: robots.map((item) => {
          const sizeFt = item.sizeFt ?? 3;
          return {
            id: generateId(),
            position: item.position,
            rotation: 0,
            widthFt: sizeFt,
            heightFt: sizeFt,
            alliance: item.alliance,
            fuelCount: STARTING_FUEL,
            name: '',
            imageDataUrl: null,
          };
        }),
      }));
    },
    []
  );

  const updateRobotPosition = useCallback((id: string, position: Position) => {
    setState((prev) => {
      let collected = 0;
      const nextRobots = prev.robots.map((robot) => {
        if (robot.id !== id) return robot;
        const sizeFt = robot.widthFt ?? 3;
        const sizeIn = sizeFt * INCHES_PER_FOOT;
        const halfSize = sizeIn / 2;
        const capacityLeft = MAX_FUEL_CAPACITY - (robot.fuelCount ?? STARTING_FUEL);
        if (capacityLeft <= 0) {
          return { ...robot, position };
        }

        prev.fuel.forEach((fuel) => {
          if (collected >= capacityLeft) return;
          const withinX =
            fuel.position.x >= position.x - halfSize - FUEL_RADIUS_IN &&
            fuel.position.x <= position.x + halfSize + FUEL_RADIUS_IN;
          const withinY =
            fuel.position.y >= position.y - halfSize - FUEL_RADIUS_IN &&
            fuel.position.y <= position.y + halfSize + FUEL_RADIUS_IN;
          if (withinX && withinY) {
            collected += 1;
          }
        });

        const nextFuelCount = Math.max(
          0,
          Math.min(MAX_FUEL_CAPACITY, (robot.fuelCount ?? STARTING_FUEL) + collected)
        );
        return {
          ...robot,
          position,
          fuelCount: nextFuelCount,
        };
      });

      if (collected === 0) {
        return {
          ...prev,
          robots: nextRobots,
        };
      }

      let remainingToCollect = collected;
      const nextFuel = prev.fuel.filter((fuel) => {
        if (remainingToCollect <= 0) return true;
        const robot = nextRobots.find((r) => r.id === id);
        if (!robot) return true;
        const sizeFt = robot.widthFt ?? 3;
        const sizeIn = sizeFt * INCHES_PER_FOOT;
        const halfSize = sizeIn / 2;
        const withinX =
          fuel.position.x >= position.x - halfSize - FUEL_RADIUS_IN &&
          fuel.position.x <= position.x + halfSize + FUEL_RADIUS_IN;
        const withinY =
          fuel.position.y >= position.y - halfSize - FUEL_RADIUS_IN &&
          fuel.position.y <= position.y + halfSize + FUEL_RADIUS_IN;
        if (withinX && withinY) {
          remainingToCollect -= 1;
          return false;
        }
        return true;
      });

      return {
        ...prev,
        robots: nextRobots,
        fuel: nextFuel,
      };
    });
  }, []);

  const updateRobotRotation = useCallback((id: string, rotation: number) => {
    setState((prev) => ({
      ...prev,
      robots: prev.robots.map((r) => (r.id === id ? { ...r, rotation: rotation % 360 } : r)),
    }));
  }, []);

  const updateRobotDetails = useCallback((id: string, updates: Partial<FrcRobot>) => {
    setState((prev) => ({
      ...prev,
      robots: prev.robots.map((robot) => {
        if (robot.id !== id) return robot;
        const nextWidth = updates.widthFt ?? robot.widthFt;
        const sizeFt = nextWidth ?? 3;
        const nextFuel =
          updates.fuelCount === undefined
            ? robot.fuelCount
            : Math.max(0, Math.min(MAX_FUEL_CAPACITY, updates.fuelCount));
        return {
          ...robot,
          ...updates,
          widthFt: sizeFt,
          heightFt: sizeFt,
          fuelCount: nextFuel ?? STARTING_FUEL,
        };
      }),
    }));
  }, []);

  const setFuel = useCallback((fuel: FrcFuel[]) => {
    setState((prev) => ({ ...prev, fuel }));
  }, []);

  const updateFuelPosition = useCallback((id: string, position: Position) => {
    setState((prev) => ({
      ...prev,
      fuel: prev.fuel.map((item) => (item.id === id ? { ...item, position } : item)),
    }));
  }, []);

  const removeFuel = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      fuel: prev.fuel.filter((item) => item.id !== id),
    }));
  }, []);

  const removeRobot = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      robots: prev.robots.filter((r) => r.id !== id),
    }));
  }, []);

  const addDrawing = useCallback((path: DrawingPath) => {
    setState((prev) => ({ ...prev, drawings: [...prev.drawings, path] }));
  }, []);

  const removeDrawing = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      drawings: prev.drawings.filter((d) => d.id !== id),
    }));
  }, []);

  const clearDrawings = useCallback(() => {
    setState((prev) => ({ ...prev, drawings: [] }));
  }, []);

  const clearFuel = useCallback(() => {
    setState((prev) => ({ ...prev, fuel: [] }));
  }, []);

  const clearRobots = useCallback(() => {
    setState((prev) => ({ ...prev, robots: [] }));
  }, []);

  const setGoalMode = useCallback((mode: GoalActivationMode, randomizedGoal: Alliance | null = null) => {
    setState((prev) => ({
      ...prev,
      goalMode: mode,
      randomizedGoal: mode === 'randomized' ? randomizedGoal : null,
    }));
  }, []);

  const resetField = useCallback(() => {
    setState(createInitialState());
    idCounter = 0;
  }, []);

  const exportState = useCallback(() => JSON.stringify(state, null, 2), [state]);

  const importState = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json) as FrcFieldState;
      setState(normalizeFrcFieldState(parsed));
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
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
    resetField,
    exportState,
    importState,
  };
};
