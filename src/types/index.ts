
export type FunnelStageType = "Prospect" | "Viewed Media/Presentation" | "Spoke with Third-Party" | "Close";

export const FunnelStages: FunnelStageType[] = ["Prospect", "Viewed Media/Presentation", "Spoke with Third-Party", "Close"];

export interface Interaction {
  id: string;
  date: string; // ISO string
  type: 'Email' | 'Call' | 'Meeting' | 'Note';
  summary: string;
  outcome?: string;
}

export interface FollowUp {
  id: string;
  prospectId: string;
  date: string; // ISO string
  time: string; // HH:MM
  method: 'Email' | 'Call' | 'In-Person';
  notes: string;
  status: 'Pending' | 'Completed' | 'Missed';
  aiSuggestedTone?: string;
  aiSuggestedContent?: string;
  aiSuggestedTool?: string;
  createdAt: string; // ISO string
}

export interface Prospect {
  id: string;
  name: string;
  email: string;
  phone?: string;
  initialData: string; // Notes, background, interests
  currentFunnelStage: FunnelStageType;
  colorCode?: string; // Hex color code from GenAI
  colorCodeReasoning?: string;
  lastContactedDate?: string; // ISO string
  nextFollowUpDate?: string; // ISO string
  followUpStageNumber: number; // 1-12 for color coding
  interactionHistory: Interaction[];
  scheduledFollowUps: FollowUp[];
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  avatarUrl?: string; // URL for placeholder or actual image
}

export interface GamificationStats {
  dailyProspectsAdded: number;
  lastProspectAddedDate?: string; // YYYY-MM-DD
  followUpStreak: number;
  totalOnTimeFollowUps: number;
  totalMissedFollowUps: number;
}
