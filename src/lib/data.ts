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
    followUpStageNumber: 3, // Example stage number
    interactionHistory: [
      { id: 'int1', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), type: 'Email', summary: 'Sent initial brochure.', outcome: 'Opened email.' },
      { id: 'int2', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), type: 'Call', summary: 'Brief discussion about needs.', outcome: 'Scheduled demo.' },
    ],
    scheduledFollowUps: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    avatarUrl: 'https://placehold.co/100x100.png',
    lastContactedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
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
      date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(), // More than 7 days away
      time: '15:00',
      method: 'Call',
      notes: 'Check in before end of quarter.',
      status: 'Pending',
      createdAt: new Date().toISOString(),
    }
];

// Initialize color codes for existing prospects
prospects.forEach(async (p) => {
  if (!p.colorCode) {
    try {
      const colorResult = await genAIColorCodeProspect({ stage: p.followUpStageNumber, prospectName: p.name });
      p.colorCode = colorResult.colorCode;
      p.colorCodeReasoning = colorResult.reasoning;
    } catch (error) {
      console.error("Error generating color code for prospect:", p.name, error);
      p.colorCode = '#CCCCCC'; // Default color on error
      p.colorCodeReasoning = 'Could not generate color code.';
    }
  }
  // Initialize nextFollowUpDate for prospects
  const prospectFollowUps = followUps.filter(fu => fu.prospectId === p.id && fu.status === 'Pending')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (prospectFollowUps.length > 0) {
    p.nextFollowUpDate = prospectFollowUps[0].date;
  }
});


export async function getProspects(): Promise<Prospect[]> {
  return JSON.parse(JSON.stringify(prospects));
}

export async function getProspectById(id: string): Promise<Prospect | undefined> {
  const prospect = prospects.find(p => p.id === id);
  return prospect ? JSON.parse(JSON.stringify(prospect)) : undefined;
}

export async function addProspect(prospectData: Omit<Prospect, 'id' | 'createdAt' | 'updatedAt' | 'interactionHistory' | 'scheduledFollowUps' | 'colorCode' | 'colorCodeReasoning'>): Promise<Prospect> {
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
    }
  }
  
  prospects[prospectIndex] = updatedProspect;
  return JSON.parse(JSON.stringify(updatedProspect));
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
  // Update prospect's nextFollowUpDate
  const prospect = await getProspectById(followUpData.prospectId);
  if (prospect) {
    const prospectFollowUps = followUps.filter(fu => fu.prospectId === prospect.id && fu.status === 'Pending')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    await updateProspect(prospect.id, { nextFollowUpDate: prospectFollowUps.length > 0 ? prospectFollowUps[0].date : undefined });
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
  
  // Update prospect's nextFollowUpDate if status changed or date changed
  const prospect = await getProspectById(originalFollowUp.prospectId);
   if (prospect && (updates.status || updates.date)) {
    const prospectFollowUps = followUps.filter(fu => fu.prospectId === prospect.id && fu.status === 'Pending')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    await updateProspect(prospect.id, { nextFollowUpDate: prospectFollowUps.length > 0 ? prospectFollowUps[0].date : undefined });
  }

  return JSON.parse(JSON.stringify(followUps[followUpIndex]));
}


export async function addInteraction(prospectId: string, interactionData: Omit<Interaction, 'id'>): Promise<Interaction> {
  const prospect = await getProspectById(prospectId);
  if (!prospect) throw new Error('Prospect not found');

  const newId = String(prospect.interactionHistory.length + 1 + Date.now());
  const newInteraction: Interaction = {
    ...interactionData,
    id: newId,
  };
  
  const updatedInteractions = [...prospect.interactionHistory, newInteraction];
  await updateProspect(prospectId, { interactionHistory: updatedInteractions, lastContactedDate: interactionData.date });
  
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

  // Reset daily prospects if date changed
  const todayStr = new Date().toISOString().split('T')[0];
  if (parsedStats.lastProspectAddedDate !== todayStr) {
    parsedStats.dailyProspectsAdded = 0;
    parsedStats.lastProspectAddedDate = todayStr; // this will be saved by the caller
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
  if (stats.lastProspectAddedDate !== todayStr) {
    stats.dailyProspectsAdded = 1;
    stats.lastProspectAddedDate = todayStr;
  } else {
    stats.dailyProspectsAdded += 1;
  }
  saveGamificationStats(stats);
}

function updateGamificationOnFollowUpComplete(originalFollowUp: FollowUp, updatedFollowUp: FollowUp) {
  if (typeof window === 'undefined') return;
  if (updatedFollowUp.status === 'Completed') {
    const stats = getGamificationStats();
    const scheduledDate = new Date(originalFollowUp.date + 'T' + originalFollowUp.time);
    const completedDate = new Date(); // Assume completion is 'now'

    // Consider on-time if completed on the same day or earlier
    if (completedDate.toISOString().split('T')[0] <= scheduledDate.toISOString().split('T')[0]) {
      stats.followUpStreak += 1;
      stats.totalOnTimeFollowUps += 1;
    } else {
      stats.followUpStreak = 0; // Reset streak if late
      stats.totalMissedFollowUps +=1; // Or count as missed if significantly late
    }
    saveGamificationStats(stats);
  } else if (updatedFollowUp.status === 'Missed') {
    const stats = getGamificationStats();
    stats.followUpStreak = 0;
    stats.totalMissedFollowUps += 1;
    saveGamificationStats(stats);
  }
}
