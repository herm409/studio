
import type { FunnelStageType } from '@/types';
import { FunnelStages } from '@/types';
import { CheckCircle, Circle, Milestone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FunnelProgressProps {
  currentStage: FunnelStageType;
  className?: string;
}

export function FunnelProgress({ currentStage, className }: FunnelProgressProps) {
  const currentStageIndex = FunnelStages.indexOf(currentStage);

  const stagesRow1 = FunnelStages.slice(0, 2);
  const stagesRow2 = FunnelStages.slice(2, 4);

  const renderStage = (stage: FunnelStageType, indexInFullArray: number) => {
    const isActive = indexInFullArray === currentStageIndex;
    const isCompleted = indexInFullArray < currentStageIndex;
    const Icon = isCompleted ? CheckCircle : (isActive ? Milestone : Circle);
    
    return (
      <div key={stage} className="flex flex-col items-center text-center min-w-[100px] sm:min-w-[120px] px-1">
        <div
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full border-2 mb-1 transition-colors duration-300",
            isActive ? "bg-primary border-primary text-primary-foreground" : 
            isCompleted ? "bg-accent border-accent text-accent-foreground" : 
            "bg-secondary border-secondary-foreground/50 text-secondary-foreground/70"
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
        <p
          className={cn(
            "text-xs font-medium transition-colors duration-300 leading-tight",
            isActive ? "text-primary" : isCompleted ? "text-accent" : "text-muted-foreground"
          )}
        >
          {stage.replace('/', '/\u200B')} {/* Allow break at slash */}
        </p>
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col items-center space-y-2 py-2", className)}>
      <div className="flex justify-around w-full">
        {stagesRow1.map((stage) => renderStage(stage, FunnelStages.indexOf(stage)))}
      </div>
      <div className="flex justify-around w-full">
        {stagesRow2.map((stage) => renderStage(stage, FunnelStages.indexOf(stage)))}
      </div>
    </div>
  );
}
