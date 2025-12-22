import { Classifier } from '@/types/planner';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';

interface ClassifierDisplayProps {
  classifier: Classifier;
  onEmpty: () => void;
}

export const ClassifierDisplay = ({ classifier, onEmpty }: ClassifierDisplayProps) => {
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

  return (
    <div className="panel">
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            'panel-header mb-0',
            classifier.alliance === 'red' ? 'text-alliance-red' : 'text-alliance-blue'
          )}
        >
          {classifier.alliance.toUpperCase()} Classifier
        </span>
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

      <div className="grid grid-cols-3 gap-1">
        {slots.map((ball, index) => (
          <div
            key={index}
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
                {index + 1}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-2 text-xs font-mono text-muted-foreground text-center">
        {classifier.balls.length}/{classifier.maxCapacity}
      </div>
    </div>
  );
};
