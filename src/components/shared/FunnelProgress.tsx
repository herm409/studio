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

  return (
    <div className={cn("flex items-center space-x-2 md:space-x-4 overflow-x-auto py-2", className)}>
      {FunnelStages.map((stage, index) => {
        const isActive = index === currentStageIndex;
        const isCompleted = index < currentStageIndex;
        const Icon = isCompleted ? CheckCircle : (isActive ? Milestone : Circle);
        
        return (
          <div key={stage} className="flex flex-col items-center text-center min-w-[100px]">
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
                "text-xs font-medium transition-colors duration-300",
                isActive ? "text-primary" : isCompleted ? "text-accent" : "text-muted-foreground"
              )}
            >
              {stage}
            </p>
          </div>
        );
      })}
    </div>
  );
}
