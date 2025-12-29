import { Classifier } from '@/types/planner';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';

interface ClassifierDisplayProps {
  classifier: Classifier;
  motif: string;
  onEmpty: () => void;
  onPopSingle: () => void;
  isEmptying: boolean;
}

const motifToColor = (motif: string) => {
  return motif.split('').map((token) => (token === 'G' ? 'green' : 'purple'));
};

export const ClassifierDisplay = ({
  classifier,
  motif,
  onEmpty,
  onPopSingle,
  isEmptying,
}: ClassifierDisplayProps) => {
  const columns = 3;
  const rows = Math.ceil(classifier.maxCapacity / columns);
  const slots = Array.from({ length: classifier.maxCapacity }, () => null as Classifier['balls'][number] | null);

  classifier.balls.forEach((ball, index) => {
    const targetRow = rows - 1 - Math.floor(index / columns);
    const targetCol = index % columns;
    const visualIndex = targetRow * columns + targetCol;
    if (visualIndex >= 0 && visualIndex < slots.length) {
      slots[visualIndex] = ball;
    }
  });

  const motifColors = motifToColor(motif);
  const rowMatchesBottom = Array.from({ length: rows }, (_, rowIndex) => {
    const start = rowIndex * columns;
    const rowBalls = classifier.balls.slice(start, start + columns);
    if (rowBalls.length < columns) return false;
    return rowBalls.every((ball, idx) => ball.color === motifColors[idx]);
  });
  const rowMatchesTop = rowMatchesBottom.slice().reverse();
  const rowsView = Array.from({ length: rows }, (_, rowIndex) => {
    const start = rowIndex * columns;
    return slots.slice(start, start + columns);
  });

  return (
    <div className={cn('panel', isEmptying && 'bg-yellow-100/60 border border-yellow-200')}>
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            'panel-header mb-0',
            classifier.alliance === 'red' ? 'text-alliance-red' : 'text-alliance-blue'
          )}
        >
          {classifier.alliance.toUpperCase()} Classifier
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onPopSingle}
            disabled={classifier.balls.length === 0}
            className={cn(
              'tool-button !p-1',
              classifier.balls.length === 0 && 'opacity-50 cursor-not-allowed'
            )}
            title="Pop one ball"
          >
            1
          </button>
          <button
            onClick={onEmpty}
            disabled={classifier.balls.length === 0}
            className={cn(
              'tool-button !p-1',
              classifier.balls.length === 0 && 'opacity-50 cursor-not-allowed'
            )}
            title="Empty classifier"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {rowsView.map((row, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className={cn(
              'grid grid-cols-3 gap-1 rounded-md p-1',
              rowMatchesTop[rowIndex] && 'bg-white/20'
            )}
          >
            {row.map((ball, index) => {
              const slotIndex = rowIndex * columns + index;
              return (
                <div
                  key={slotIndex}
                  className={cn(
                    'w-6 h-6 rounded-full border border-border flex items-center justify-center',
                    'transition-all duration-200',
                    ball
                      ? ball.color === 'green'
                        ? 'bg-ball-green'
                        : 'bg-ball-purple'
                      : 'bg-muted/30'
                  )}
                >
                  {ball && (
                    <span className="text-[8px] font-mono text-foreground/80">
                      {slotIndex + 1}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-2 text-xs font-mono text-muted-foreground text-center">
        {classifier.balls.length}/{classifier.maxCapacity}
      </div>
    </div>
  );
};
