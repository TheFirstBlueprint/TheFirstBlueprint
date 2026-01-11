import { useState, useCallback } from 'react';
import { Alliance, DrawingPath, Position } from '@/types/planner';
import { FrcFieldState, FrcRobot } from '@/types/frcPlanner';

let idCounter = 0;
const generateId = () => `frc-${++idCounter}-${Date.now()}`;

const createInitialState = (): FrcFieldState => ({
  robots: [],
  drawings: [],
});

const normalizeFrcFieldState = (parsed: FrcFieldState): FrcFieldState => ({
  robots: parsed.robots ?? [],
  drawings: parsed.drawings ?? [],
});

export const useFrcFieldState = (initialState?: FrcFieldState) => {
  const [state, setState] = useState<FrcFieldState>(
    () => (initialState ? normalizeFrcFieldState(initialState) : createInitialState())
  );

  const addRobot = useCallback((alliance: Alliance, position: Position, sizeFt?: { width: number; height: number }) => {
    const allianceCount = state.robots.filter((robot) => robot.alliance === alliance).length;
    if (state.robots.length >= 6 || allianceCount >= 3) {
      return null;
    }

    const robot: FrcRobot = {
      id: generateId(),
      position,
      rotation: 0,
      widthFt: sizeFt?.width ?? 3,
      heightFt: sizeFt?.height ?? 3,
      alliance,
      name: '',
      imageDataUrl: null,
    };

    setState((prev) => ({ ...prev, robots: [...prev.robots, robot] }));
    return robot.id;
  }, [state.robots]);

  const updateRobotPosition = useCallback((id: string, position: Position) => {
    setState((prev) => ({
      ...prev,
      robots: prev.robots.map((r) => (r.id === id ? { ...r, position } : r)),
    }));
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
      robots: prev.robots.map((r) => (r.id === id ? { ...r, ...updates } : r)),
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

  const clearRobots = useCallback(() => {
    setState((prev) => ({ ...prev, robots: [] }));
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
    addDrawing,
    removeDrawing,
    clearDrawings,
    clearRobots,
    resetField,
    exportState,
    importState,
  };
};
