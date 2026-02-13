const FIELD_SIZE = 600;
const FIELD_INCHES = 144;
const PIXELS_PER_INCH = FIELD_SIZE / FIELD_INCHES;

type PedroHeadingMode = 'linear' | 'tangential';

type PedroPoint = {
  x: number;
  y: number;
};

type PedroHeadingPoint = PedroPoint & {
  heading?: PedroHeadingMode;
  startDeg?: number;
  endDeg?: number;
  reverse?: boolean;
};

type PedroLine = {
  id: string;
  name?: string;
  endPoint: PedroHeadingPoint;
  waitBeforeMs?: number;
  waitAfterMs?: number;
};

type PedroSequenceItem = {
  kind: 'path';
  lineId: string;
};

export type PedroPP = {
  startPoint: PedroHeadingPoint;
  lines: PedroLine[];
  sequence: PedroSequenceItem[];
};

export type TFBPSequencerStep = {
  x: number;
  y: number;
  heading: number;
  waitBeforeMs: number;
  waitAfterMs: number;
  lineId: string | null;
  name?: string;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const normalizeHeading = (value: number) => {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

const pedroToPlannerHeading = (value: number) => normalizeHeading(180 - value);

const toPlannerDegrees = (from: PedroPoint, to: PedroPoint) => {
  const radians = Math.atan2(to.y - from.y, to.x - from.x);
  return pedroToPlannerHeading((radians * 180) / Math.PI + 90);
};

const flipYInches = (y: number) => FIELD_INCHES - y;

const isHeadingMode = (value: unknown): value is PedroHeadingMode =>
  value === 'linear' || value === 'tangential';

const validatePoint = (value: unknown, label: string): PedroPoint => {
  if (!value || typeof value !== 'object') {
    throw new Error(`Invalid ${label}`);
  }
  const point = value as Partial<PedroPoint>;
  if (!isFiniteNumber(point.x) || !isFiniteNumber(point.y)) {
    throw new Error(`Invalid ${label} coordinates`);
  }
  return { x: point.x, y: point.y };
};

export const parsePedroPP = (text: string): PedroPP => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid .pp JSON');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid .pp file structure');
  }

  const candidate = parsed as {
    startPoint?: unknown;
    lines?: unknown;
    sequence?: unknown;
  };

  const startPointRaw = validatePoint(candidate.startPoint, 'startPoint');
  const startHeadingSource = (candidate.startPoint ?? {}) as Partial<PedroHeadingPoint>;
  const startPoint: PedroHeadingPoint = {
    ...startPointRaw,
    heading: isHeadingMode(startHeadingSource.heading) ? startHeadingSource.heading : undefined,
    startDeg: isFiniteNumber(startHeadingSource.startDeg) ? startHeadingSource.startDeg : undefined,
    endDeg: isFiniteNumber(startHeadingSource.endDeg) ? startHeadingSource.endDeg : undefined,
    reverse: Boolean(startHeadingSource.reverse),
  };

  if (!Array.isArray(candidate.lines) || candidate.lines.length === 0) {
    throw new Error('Missing .pp lines');
  }
  const lines: PedroLine[] = candidate.lines.map((line, index) => {
    if (!line || typeof line !== 'object') {
      throw new Error(`Invalid line at index ${index}`);
    }
    const raw = line as {
      id?: unknown;
      name?: unknown;
      endPoint?: unknown;
      waitBeforeMs?: unknown;
      waitAfterMs?: unknown;
    };
    if (typeof raw.id !== 'string' || raw.id.trim().length === 0) {
      throw new Error(`Missing line id at index ${index}`);
    }
    const endPointBase = validatePoint(raw.endPoint, `line endPoint (${raw.id})`);
    const endHeadingSource = (raw.endPoint ?? {}) as Partial<PedroHeadingPoint>;
    return {
      id: raw.id,
      name: typeof raw.name === 'string' ? raw.name : undefined,
      endPoint: {
        ...endPointBase,
        heading: isHeadingMode(endHeadingSource.heading) ? endHeadingSource.heading : undefined,
        startDeg: isFiniteNumber(endHeadingSource.startDeg) ? endHeadingSource.startDeg : undefined,
        endDeg: isFiniteNumber(endHeadingSource.endDeg) ? endHeadingSource.endDeg : undefined,
        reverse: Boolean(endHeadingSource.reverse),
      },
      waitBeforeMs: isFiniteNumber(raw.waitBeforeMs) ? raw.waitBeforeMs : 0,
      waitAfterMs: isFiniteNumber(raw.waitAfterMs) ? raw.waitAfterMs : 0,
    };
  });

  if (!Array.isArray(candidate.sequence) || candidate.sequence.length === 0) {
    throw new Error('Missing .pp sequence');
  }
  const sequence: PedroSequenceItem[] = candidate.sequence.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Invalid sequence item at index ${index}`);
    }
    const raw = item as { kind?: unknown; lineId?: unknown };
    if (raw.kind !== 'path' || typeof raw.lineId !== 'string' || raw.lineId.trim().length === 0) {
      throw new Error(`Invalid sequence item at index ${index}`);
    }
    return { kind: 'path', lineId: raw.lineId };
  });

  return { startPoint, lines, sequence };
};

const resolveHeading = (
  current: PedroPoint,
  next: PedroHeadingPoint,
  fallbackHeading: number
) => {
  if (isFiniteNumber(next.endDeg)) {
    return pedroToPlannerHeading(next.endDeg);
  }
  if (isFiniteNumber(next.startDeg)) {
    return pedroToPlannerHeading(next.startDeg);
  }
  const tangential = toPlannerDegrees(current, next);
  if (next.heading === 'tangential') {
    return normalizeHeading(next.reverse ? tangential + 180 : tangential);
  }
  return tangential || fallbackHeading;
};

export const convertPedroPPToSequencer = (pp: PedroPP): TFBPSequencerStep[] => {
  const linesById = new Map(pp.lines.map((line) => [line.id, line] as const));
  const steps: TFBPSequencerStep[] = [];

  const startHeading = isFiniteNumber(pp.startPoint.endDeg)
    ? pedroToPlannerHeading(pp.startPoint.endDeg)
    : isFiniteNumber(pp.startPoint.startDeg)
      ? pedroToPlannerHeading(pp.startPoint.startDeg)
      : 0;

  steps.push({
    x: pp.startPoint.x * PIXELS_PER_INCH,
    y: flipYInches(pp.startPoint.y) * PIXELS_PER_INCH,
    heading: startHeading,
    waitBeforeMs: 0,
    waitAfterMs: 0,
    lineId: null,
    name: 'Start',
  });

  let currentPoint: PedroPoint = { x: pp.startPoint.x, y: pp.startPoint.y };
  let currentHeading = startHeading;

  pp.sequence.forEach((sequenceItem, index) => {
    const line = linesById.get(sequenceItem.lineId);
    if (!line) {
      throw new Error(`Missing line for sequence item ${index + 1}`);
    }
    const heading = resolveHeading(currentPoint, line.endPoint, currentHeading);
    currentHeading = heading;
    steps.push({
      x: line.endPoint.x * PIXELS_PER_INCH,
      y: flipYInches(line.endPoint.y) * PIXELS_PER_INCH,
      heading,
      waitBeforeMs: line.waitBeforeMs ?? 0,
      waitAfterMs: line.waitAfterMs ?? 0,
      lineId: line.id,
      name: line.name,
    });
    currentPoint = { x: line.endPoint.x, y: line.endPoint.y };
  });

  return steps;
};
