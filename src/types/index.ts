
export type FunnelStageType = "Prospect" | "Viewed Media/Presentation" | "Spoke with Third-Party" | "Close";

export const FunnelStages: FunnelStageType[] = ["Prospect", "Viewed Media/Presentation", "Spoke with Third-Party", "Close"];

export interface Interaction {
  id: string;
  userId: string; // Added for Firebase
  prospectId: string; // Ensure prospectId is here for querying
  date: string; // ISO string
  type: 'Email' | 'Call' | 'Meeting' | 'Note' | 'Text Message';
  summary: string;
  outcome?: string;
}

export interface FollowUp {
  id: string;
  userId: string; // Added for Firebase
  prospectId: string;
  date: string; // ISO string "YYYY-MM-DD"
  time: string; // HH:MM
  method: 'Email' | 'Call' | 'In-Person';
  notes: string;
  status: 'Pending' | 'Completed' | 'Missed';
  aiSuggestedTone?: string;
  aiSuggestedContent?: string;
  aiSuggestedTool?: string;
  createdAt?: string; // ISO string, made optional
  updatedAt?: string; // ISO string, to track when it was last modified (e.g., completed)
}

export interface Prospect {
  id: string;
  userId: string; // Added for Firebase
  name: string;
  email?: string;
  phone?: string;
  initialData: string; // Notes, background, interests
  currentFunnelStage: FunnelStageType;
  colorCode?: string; // Hex color code from GenAI
  colorCodeReasoning?: string;
  lastContactedDate?: string; // ISO string
  nextFollowUpDate?: string; // ISO string "YYYY-MM-DD"
  followUpStageNumber: number; // 1-12 for color coding
  interactionHistory: Interaction[]; 
  isArchived?: boolean; // Added for archiving closed prospects
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  avatarUrl?: string; // URL for placeholder or actual image
}

export interface GamificationStats {
  // userId will be the document ID in Firestore
  dailyProspectsAdded: number;
  lastProspectAddedDate: string | null; // YYYY-MM-DD
  followUpStreak: number;
  totalOnTimeFollowUps: number;
  totalMissedFollowUps: number;
  lastFollowUpActivityDate: string | null; // YYYY-MM-DD, to help with streak logic
}

export interface AccountabilitySummaryData {
  newProspectsLast14Days: number;
  followUpsCompletedLast14Days: number;
  interactionsLoggedLast14Days: number;
  currentFollowUpStreak: number;
}
