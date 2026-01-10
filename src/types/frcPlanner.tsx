import { Alliance, DrawingPath, Position } from '@/types/planner';

export interface FrcRobot {
  id: string;
  position: Position;
  rotation: number;
  widthFt: number;
  heightFt: number;
  alliance: Alliance;
  name?: string;
  imageDataUrl?: string | null;
}

export interface FrcFieldState {
  robots: FrcRobot[];
  drawings: DrawingPath[];
}
