
import type { Prospect, FollowUp, Interaction, FunnelStageType, GamificationStats } from '@/types';
import { colorCodeProspect as genAIColorCodeProspect } from '@/ai/flows/color-code-prospect';

let prospects: Prospect[] = [
  {
    id: '1',
    name: 'Alice Wonderland',
    email: 'alice@example.com',
    phone: '555-1234',
    initialData: 'Interested in AI solutions for retail. Met at TechCon 2024.',
    currentFunnelStage: 'Viewed Media/Presentation',
    followUpStageNumber: 3,
    interactionHistory: [
      { id: 'int1', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), type: 'Email', summary: 'Sent initial brochure.', outcome: 'Opened email.' },
      { id: 'int2', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), type: 'Call', summary: 'Brief discussion about needs.', outcome: 'Scheduled demo.' },
    ],
    scheduledFollowUps: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    avatarUrl: 'https://placehold.co/100x100.png',
    lastContactedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    // colorCode and nextFollowUpDate will be set by ensureProspectDetails
  },
  {
    id: '2',
    name: 'Bob The Builder',
    email: 'bob@example.com',
    initialData: 'Looking for project management tools. Referral from John Doe.',
    currentFunnelStage: 'Prospect',
    followUpStageNumber: 1,
    interactionHistory: [],
    scheduledFollowUps: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    avatarUrl: 'https://placehold.co/100x100.png',
    // colorCode and nextFollowUpDate will be set by ensureProspectDetails
  },
  {
    id: '3',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    phone: '555-5678',
    initialData: 'Needs help with team collaboration software. Small startup.',
    currentFunnelStage: 'Spoke with Third-Party',
    followUpStageNumber: 8,
    interactionHistory: [
      { id: 'int3', date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), type: 'Meeting', summary: 'Initial discovery meeting.' },
      { id: 'int4', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), type: 'Email', summary: 'Followed up with proposal.' },
      { id: 'int5', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), type: 'Call', summary: 'Discussed proposal with expert.', outcome: 'Positive feedback.' },
    ],
    scheduledFollowUps: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    avatarUrl: 'https://placehold.co/100x100.png',
    lastContactedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    // colorCode and nextFollowUpDate will be set by ensureProspectDetails
  },
];

let followUps: FollowUp[] = [
    {
      id: 'fu1',
      prospectId: '1',
      date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      time: '10:00',
      method: 'Email',
      notes: 'Follow up on demo, gather feedback.',
      status: 'Pending',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'fu2',
      prospectId: '2',
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      time: '14:30',
      method: 'Call',
      notes: 'Initial outreach call.',
      status: 'Pending',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'fu3',
      prospectId: '3',
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      time: '11:00',
      method: 'Email',
      notes: 'Send case study relevant to their industry.',
      status: 'Pending',
      createdAt: new Date().toISOString(),
    },
     {
      id: 'fu4',
      prospectId: '1',
      date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(), 
      time: '15:00',
      method: 'Call',
      notes: 'Check in before end of quarter.',
      status: 'Pending',
      createdAt: new Date().toISOString(),
    }
];

async function ensureProspectDetails(prospect: Prospect): Promise<void> {
  // Calculate nextFollowUpDate
  const prospectFollowUps = followUps.filter(fu => fu.prospectId === prospect.id && fu.status === 'Pending')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (prospectFollowUps.length > 0) {
    prospect.nextFollowUpDate = prospectFollowUps[0].date;
  } else {
    prospect.nextFollowUpDate = undefined;
  }

  // Ensure color code is set, fetching from AI if necessary
  if (!prospect.colorCode || prospect.colorCode === '#CCCCCC' || !prospect.colorCodeReasoning) {
    try {
      const colorResult = await genAIColorCodeProspect({ stage: prospect.followUpStageNumber, prospectName: prospect.name });
      prospect.colorCode = colorResult.colorCode;
      prospect.colorCodeReasoning = colorResult.reasoning;
    } catch (error) {
      console.error(`Error generating color code for prospect ${prospect.name}:`, error);
      prospect.colorCode = '#DDDDDD'; // Fallback color on error
      prospect.colorCodeReasoning = 'Failed to generate color code.';
    }
  }
}

export async function getProspects(): Promise<Prospect[]> {
  await Promise.all(prospects.map(p => ensureProspectDetails(p)));
  return JSON.parse(JSON.stringify(prospects));
}

export async function getProspectById(id: string): Promise<Prospect | undefined> {
  const prospect = prospects.find(p => p.id === id);
  if (prospect) {
    await ensureProspectDetails(prospect);
    return JSON.parse(JSON.stringify(prospect));
  }
  return undefined;
}

export async function addProspect(prospectData: Omit<Prospect, 'id' | 'createdAt' | 'updatedAt' | 'interactionHistory' | 'scheduledFollowUps' | 'colorCode' | 'colorCodeReasoning' | 'nextFollowUpDate'>): Promise<Prospect> {
  const newId = String(prospects.length + 1 + Date.now());
  const now = new Date().toISOString();
  
  let colorCode = '#CCCCCC';
  let colorCodeReasoning = 'Default color code.';
  try {
    const colorResult = await genAIColorCodeProspect({ stage: prospectData.followUpStageNumber, prospectName: prospectData.name });
    colorCode = colorResult.colorCode;
    colorCodeReasoning = colorResult.reasoning;
  } catch (error) {
    console.error("Error generating color code for new prospect:", prospectData.name, error);
    colorCode = '#DDDDDD'; // Fallback color on error
    colorCodeReasoning = 'Failed to generate color code.';
  }

  const newProspect: Prospect = {
    ...prospectData,
    id: newId,
    interactionHistory: [],
    scheduledFollowUps: [],
    createdAt: now,
    updatedAt: now,
    colorCode,
    colorCodeReasoning,
    avatarUrl: prospectData.avatarUrl || `https://placehold.co/100x100.png?text=${prospectData.name.charAt(0)}`
    // nextFollowUpDate will be undefined initially, set by ensureProspectDetails when fetched or by addFollowUp
  };
  prospects.push(newProspect);
  updateGamificationOnAddProspect();
  return JSON.parse(JSON.stringify(newProspect));
}

export async function updateProspect(id: string, updates: Partial<Omit<Prospect, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Prospect | undefined> {
  const prospectIndex = prospects.findIndex(p => p.id === id);
  if (prospectIndex === -1) return undefined;

  const originalProspect = prospects[prospectIndex];
  const updatedProspect = { ...originalProspect, ...updates, updatedAt: new Date().toISOString() };

  if (updates.followUpStageNumber && updates.followUpStageNumber !== originalProspect.followUpStageNumber) {
     try {
      const colorResult = await genAIColorCodeProspect({ stage: updatedProspect.followUpStageNumber, prospectName: updatedProspect.name });
      updatedProspect.colorCode = colorResult.colorCode;
      updatedProspect.colorCodeReasoning = colorResult.reasoning;
    } catch (error) {
      console.error("Error updating color code for prospect:", updatedProspect.name, error);
      // Keep existing or set a default if it was never set
      updatedProspect.colorCode = originalProspect.colorCode || '#DDDDDD';
      updatedProspect.colorCodeReasoning = originalProspect.colorCodeReasoning || 'Failed to update color code.';
    }
  }
  
  prospects[prospectIndex] = updatedProspect;
  // Re-ensure all details, including nextFollowUpDate, after update
  await ensureProspectDetails(prospects[prospectIndex]);
  return JSON.parse(JSON.stringify(prospects[prospectIndex]));
}

export async function getFollowUpsForProspect(prospectId: string): Promise<FollowUp[]> {
  return JSON.parse(JSON.stringify(followUps.filter(fu => fu.prospectId === prospectId)));
}

export async function getUpcomingFollowUps(days: number = 7): Promise<FollowUp[]> {
  const today = new Date();
  const upcomingDateLimit = new Date();
  upcomingDateLimit.setDate(today.getDate() + days);

  return JSON.parse(JSON.stringify(followUps.filter(fu => {
    const followUpDate = new Date(fu.date);
    return fu.status === 'Pending' && followUpDate >= today && followUpDate <= upcomingDateLimit;
  }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())));
}

export async function addFollowUp(followUpData: Omit<FollowUp, 'id' | 'createdAt'>): Promise<FollowUp> {
  const newId = String(followUps.length + 1 + Date.now());
  const newFollowUp: FollowUp = {
    ...followUpData,
    id: newId,
    createdAt: new Date().toISOString(),
  };
  followUps.push(newFollowUp);
  
  const prospect = prospects.find(p => p.id === followUpData.prospectId);
  if (prospect) {
    await ensureProspectDetails(prospect); // This will update nextFollowUpDate
  }
  return JSON.parse(JSON.stringify(newFollowUp));
}

export async function updateFollowUp(id: string, updates: Partial<Omit<FollowUp, 'id' | 'createdAt' | 'prospectId'>>): Promise<FollowUp | undefined> {
  const followUpIndex = followUps.findIndex(fu => fu.id === id);
  if (followUpIndex === -1) return undefined;
  
  const originalFollowUp = followUps[followUpIndex];
  followUps[followUpIndex] = { ...originalFollowUp, ...updates };

  if (updates.status && updates.status !== 'Pending') {
    updateGamificationOnFollowUpComplete(originalFollowUp, followUps[followUpIndex]);
  }
  
  const prospect = prospects.find(p => p.id === originalFollowUp.prospectId);
   if (prospect) {
    await ensureProspectDetails(prospect); // This will update nextFollowUpDate
  }

  return JSON.parse(JSON.stringify(followUps[followUpIndex]));
}


export async function addInteraction(prospectId: string, interactionData: Omit<Interaction, 'id'>): Promise<Interaction> {
  const prospect = prospects.find(p => p.id === prospectId);
  if (!prospect) throw new Error('Prospect not found');

  const newId = String(prospect.interactionHistory.length + 1 + Date.now());
  const newInteraction: Interaction = {
    ...interactionData,
    id: newId,
  };
  
  prospect.interactionHistory.push(newInteraction);
  prospect.lastContactedDate = interactionData.date;
  prospect.updatedAt = new Date().toISOString();
  
  return JSON.parse(JSON.stringify(newInteraction));
}


// Gamification Logic (Illustrative - uses localStorage, which is client-side)
const GAMIFICATION_KEY = 'followUpFlowGamification';

export function getGamificationStats(): GamificationStats {
  if (typeof window === 'undefined') {
    return { dailyProspectsAdded: 0, followUpStreak: 0, totalOnTimeFollowUps: 0, totalMissedFollowUps: 0 };
  }
  const stats = localStorage.getItem(GAMIFICATION_KEY);
  const defaultStats: GamificationStats = { dailyProspectsAdded: 0, followUpStreak: 0, totalOnTimeFollowUps: 0, totalMissedFollowUps: 0 };
  
  const parsedStats = stats ? JSON.parse(stats) : defaultStats;

  const todayStr = new Date().toISOString().split('T')[0];
  if (parsedStats.lastProspectAddedDate !== todayStr) {
    parsedStats.dailyProspectsAdded = 0;
    // lastProspectAddedDate will be updated when a prospect is actually added.
  }
  return parsedStats;
}

export function saveGamificationStats(stats: GamificationStats) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GAMIFICATION_KEY, JSON.stringify(stats));
}

function updateGamificationOnAddProspect() {
  if (typeof window === 'undefined') return;
  const stats = getGamificationStats();
  const todayStr = new Date().toISOString().split('T')[0];
  
  // If it's a new day, reset dailyProspectsAdded before incrementing
  if (stats.lastProspectAddedDate !== todayStr) {
    stats.dailyProspectsAdded = 0; 
  }
  stats.dailyProspectsAdded += 1;
  stats.lastProspectAddedDate = todayStr;
  saveGamificationStats(stats);
}

function updateGamificationOnFollowUpComplete(originalFollowUp: FollowUp, updatedFollowUp: FollowUp) {
  if (typeof window === 'undefined') return;
  const stats = getGamificationStats();
  const scheduledDate = new Date(originalFollowUp.date + 'T' + originalFollowUp.time);
  const completedDate = new Date(); 

  if (updatedFollowUp.status === 'Completed') {
    if (completedDate.toISOString().split('T')[0] <= scheduledDate.toISOString().split('T')[0]) {
      stats.totalOnTimeFollowUps += 1;
      // Logic for streak: needs to check if the last follow-up was on the previous day and on time.
      // This is a simplified version. For a robust streak, more state about last follow-up date is needed.
      stats.followUpStreak += 1; 
    } else { // Completed late
      stats.totalMissedFollowUps += 1; // Or a new category "lateFollowUps"
      stats.followUpStreak = 0;
    }
  } else if (updatedFollowUp.status === 'Missed') {
    stats.totalMissedFollowUps += 1;
    stats.followUpStreak = 0;
  }
  saveGamificationStats(stats);
}
    