import { Alliance, DrawingPath, Position, TextBox } from '@/types/planner';

export type GoalActivationMode = 'both' | 'blue' | 'red' | 'randomized';

export interface FrcFuel {
  id: string;
  position: Position;
}

export interface FrcRobot {
  id: string;
  position: Position;
  rotation: number;
  widthFt: number;
  heightFt: number;
  alliance: Alliance;
  fuelCount: number;
  name?: string;
  imageDataUrl?: string | null;
}

export interface FrcFieldState {
  robots: FrcRobot[];
  drawings: DrawingPath[];
  fuel: FrcFuel[];
  goalMode: GoalActivationMode;
  randomizedGoal: Alliance | null;
  textBoxes: TextBox[];
}
