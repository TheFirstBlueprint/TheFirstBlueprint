import { Classifier } from '@/types/planner';
import { cn } from '@/lib/utils';

interface ClassifierDisplayProps {
  classifier: Classifier;
  onEmpty: () => void;
  onPopSingle: () => void;
  isEmptying: boolean;
}

export const ClassifierDisplay = ({
  classifier,
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

  const rowsView = Array.from({ length: rows }, (_, rowIndex) => {
    const start = rowIndex * columns;
    return slots.slice(start, start + columns);
  });

  return (
    <div className={cn('panel', isEmptying && 'bg-warning/10 border border-warning/40')}>
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
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              delete
            </span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {rowsView.map((row, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="grid grid-cols-3 gap-1 rounded-md p-1"
          >
            {row.map((ball, index) => {
              const slotIndex = (rows - 1 - rowIndex) * columns + index;
              return (
                <div
                  key={slotIndex}
                  className={cn(
                    'w-6 h-6 rounded-md border border-border/60 flex items-center justify-center',
                    'transition-all duration-200',
                    ball ? 'bg-muted/30' : 'bg-muted/20'
                  )}
                >
                  {ball && (
                    <div
                      className={cn(
                        'h-[20px] w-[20px] rounded-full border border-border/40 flex items-center justify-center',
                        ball.color === 'green' ? 'bg-ball-green' : 'bg-ball-purple'
                      )}
                    >
                      <span className="text-[7px] font-mono text-foreground/85">
                        {slotIndex + 1}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

    </div>
  );
};
