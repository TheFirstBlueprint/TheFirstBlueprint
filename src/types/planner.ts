export type BallColor = 'green' | 'purple';
export type Alliance = 'red' | 'blue';
export type Tool = 'select' | 'pen' | 'dotted' | 'arrow' | 'eraser';
export type DrawingStyle = 'solid' | 'dotted' | 'arrow';

export interface Position {
  x: number;
  y: number;
}

export interface Robot {
  id: string;
  position: Position;
  rotation: number; // degrees
  size: number; // pixels (field scale)
  alliance: Alliance;
  heldBalls: Ball[];
}

export interface Ball {
  id: string;
  color: BallColor;
  position: Position;
  isScored: boolean;
  heldByRobotId: string | null;
}

export interface Classifier {
  alliance: Alliance;
  balls: Ball[];
  maxCapacity: number;
}

export interface DrawingPath {
  id: string;
  points: Position[];
  color: string;
  width: number;
  style: DrawingStyle;
}

export interface FieldState {
  robots: Robot[];
  balls: Ball[];
  classifiers: {
    red: Classifier;
    blue: Classifier;
  };
  drawings: DrawingPath[];
}

export interface PlannerConfig {
  fieldWidth: number;
  fieldHeight: number;
  tileSize: number;
  maxRobots: number;
  maxRobotsPerAlliance: number;
  maxBallsPerRobot: number;
  classifierCapacity: number;
}

export const DEFAULT_CONFIG: PlannerConfig = {
  fieldWidth: 600,
  fieldHeight: 600,
  tileSize: 100, // Field is 6x6 tiles
  maxRobots: 4,
  maxRobotsPerAlliance: 2,
  maxBallsPerRobot: 3,
  classifierCapacity: 9,
};

export const createInitialState = (): FieldState => ({
  robots: [],
  balls: [],
  classifiers: {
    red: { alliance: 'red', balls: [], maxCapacity: 9 },
    blue: { alliance: 'blue', balls: [], maxCapacity: 9 },
  },
  drawings: [],
});
