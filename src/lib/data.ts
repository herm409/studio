
import type { Prospect, FollowUp, Interaction, GamificationStats } from '@/types';
import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  Timestamp,
  orderBy,
  limit,
  runTransaction
} from 'firebase/firestore';
import { colorCodeProspect as genAIColorCodeProspect } from '@/ai/flows/color-code-prospect';

const PROSPECTS_COLLECTION = 'prospects';
const FOLLOW_UPS_COLLECTION = 'followUps';
const INTERACTIONS_COLLECTION = 'interactions'; // Or handle as subcollection
const GAMIFICATION_COLLECTION = 'gamificationStats';


// Helper to get current user ID
function getCurrentUserId(): string | null {
  return auth.currentUser ? auth.currentUser.uid : null;
}

async function ensureProspectDetails(prospectData: Omit<Prospect, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'interactionHistory'> & { id?: string, userId: string, createdAt?: string, updatedAt?: string }): Promise<Partial<Prospect>> {
  let updatedDetails: Partial<Prospect> = {};

  // Color coding
  if (!prospectData.colorCode || prospectData.colorCode === '#CCCCCC' || !prospectData.colorCodeReasoning) {
    try {
      const colorResult = await genAIColorCodeProspect({ stage: prospectData.followUpStageNumber, prospectName: prospectData.name });
      updatedDetails.colorCode = colorResult.colorCode;
      updatedDetails.colorCodeReasoning = colorResult.reasoning;
    } catch (error) {
      console.error(`Error generating color code for prospect ${prospectData.name}:`, error);
      updatedDetails.colorCode = '#DDDDDD';
      updatedDetails.colorCodeReasoning = 'Failed to generate color code.';
    }
  }
  return updatedDetails;
}

async function calculateNextFollowUpDate(prospectId: string, userId: string): Promise<string | undefined> {
  const followUpsQuery = query(
    collection(db, FOLLOW_UPS_COLLECTION),
    where('prospectId', '==', prospectId),
    where('userId', '==', userId),
    where('status', '==', 'Pending'),
    orderBy('date', 'asc'),
    limit(1)
  );
  const followUpsSnapshot = await getDocs(followUpsQuery);
  if (!followUpsSnapshot.empty) {
    const nextFollowUp = followUpsSnapshot.docs[0].data() as FollowUp;
    return nextFollowUp.date;
  }
  return undefined;
}


export async function getProspects(): Promise<Prospect[]> {
  const userId = getCurrentUserId();
  if (!userId) return [];

  const q = query(collection(db, PROSPECTS_COLLECTION), where('userId', '==', userId), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  const prospectsList: Prospect[] = [];
  for (const prospectDoc of querySnapshot.docs) {
    let data = prospectDoc.data() as Omit<Prospect, 'id' | 'interactionHistory'> & { createdAt: Timestamp, updatedAt: Timestamp, lastContactedDate?: Timestamp, nextFollowUpDate?: Timestamp };
    
    const prospect: Prospect = {
      id: prospectDoc.id,
      userId: data.userId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      initialData: data.initialData,
      currentFunnelStage: data.currentFunnelStage,
      followUpStageNumber: data.followUpStageNumber,
      colorCode: data.colorCode,
      colorCodeReasoning: data.colorCodeReasoning,
      lastContactedDate: data.lastContactedDate ? (data.lastContactedDate.toDate()).toISOString() : undefined,
      nextFollowUpDate: await calculateNextFollowUpDate(prospectDoc.id, userId), // Calculate on fetch
      interactionHistory: [], // Fetch separately if needed on prospect list, or on detail page
      createdAt: data.createdAt.toDate().toISOString(),
      updatedAt: data.updatedAt.toDate().toISOString(),
      avatarUrl: data.avatarUrl,
    };
    prospectsList.push(prospect);
  }
  return prospectsList;
}

export async function getProspectById(id: string): Promise<Prospect | undefined> {
  const userId = getCurrentUserId();
  if (!userId) return undefined;

  const prospectDocRef = doc(db, PROSPECTS_COLLECTION, id);
  const prospectDocSnap = await getDoc(prospectDocRef);

  if (prospectDocSnap.exists()) {
    const data = prospectDocSnap.data() as Omit<Prospect, 'id' | 'interactionHistory'> & { createdAt: Timestamp, updatedAt: Timestamp, lastContactedDate?: Timestamp, nextFollowUpDate?: Timestamp };
    if (data.userId !== userId) return undefined; // Security check

    // Fetch interactions for this prospect (example of fetching sub-collection or related collection)
    const interactionsQuery = query(
      collection(db, INTERACTIONS_COLLECTION), 
      where('prospectId', '==', id), 
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    const interactionsSnapshot = await getDocs(interactionsQuery);
    const interactionHistory = interactionsSnapshot.docs.map(docSnap => ({ 
        id: docSnap.id, 
        ...docSnap.data(),
        date: (docSnap.data().date as Timestamp).toDate().toISOString(),
    })) as Interaction[];

    const prospect: Prospect = {
      id: prospectDocSnap.id,
      userId: data.userId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      initialData: data.initialData,
      currentFunnelStage: data.currentFunnelStage,
      followUpStageNumber: data.followUpStageNumber,
      colorCode: data.colorCode,
      colorCodeReasoning: data.colorCodeReasoning,
      lastContactedDate: data.lastContactedDate ? (data.lastContactedDate.toDate()).toISOString() : undefined,
      nextFollowUpDate: await calculateNextFollowUpDate(id, userId),
      interactionHistory: interactionHistory,
      createdAt: data.createdAt.toDate().toISOString(),
      updatedAt: data.updatedAt.toDate().toISOString(),
      avatarUrl: data.avatarUrl,
    };
    return prospect;
  }
  return undefined;
}

export async function addProspect(prospectData: Omit<Prospect, 'id' | 'createdAt' | 'updatedAt' | 'interactionHistory' | 'colorCode' | 'colorCodeReasoning' | 'nextFollowUpDate' | 'lastContactedDate' | 'userId'>): Promise<Prospect> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error("User not authenticated");

  const now = Timestamp.now();
  const aiDetails = await ensureProspectDetails({ ...prospectData, userId });

  const newProspectData = {
    ...prospectData,
    userId,
    email: prospectData.email || undefined,
    phone: prospectData.phone || undefined,
    avatarUrl: prospectData.avatarUrl || `https://placehold.co/100x100.png?text=${prospectData.name.charAt(0)}`,
    ...aiDetails,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, PROSPECTS_COLLECTION), newProspectData);
  updateGamificationOnAddProspect();
  
  return { 
    ...newProspectData, 
    id: docRef.id,
    interactionHistory: [],
    createdAt: now.toDate().toISOString(),
    updatedAt: now.toDate().toISOString(),
  } as Prospect;
}

export async function updateProspect(id: string, updates: Partial<Omit<Prospect, 'id' | 'createdAt' | 'updatedAt' | 'userId'>>): Promise<Prospect | undefined> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error("User not authenticated");

  const prospectDocRef = doc(db, PROSPECTS_COLLECTION, id);
  const prospectSnap = await getDoc(prospectDocRef);
  if (!prospectSnap.exists() || prospectSnap.data().userId !== userId) {
    throw new Error("Prospect not found or unauthorized");
  }
  
  const originalProspectData = prospectSnap.data() as Prospect;
  let finalUpdates: Partial<Prospect> = { ...updates, updatedAt: Timestamp.now().toDate().toISOString() };

  if ('email' in updates && updates.email === '') finalUpdates.email = undefined;
  if ('phone' in updates && updates.phone === '') finalUpdates.phone = undefined;
  if ('avatarUrl' in updates && updates.avatarUrl === '') finalUpdates.avatarUrl = undefined;
  
  if (updates.followUpStageNumber && updates.followUpStageNumber !== originalProspectData.followUpStageNumber) {
    const aiDetails = await ensureProspectDetails({ 
        name: updates.name || originalProspectData.name,
        followUpStageNumber: updates.followUpStageNumber,
        currentFunnelStage: updates.currentFunnelStage || originalProspectData.currentFunnelStage,
        initialData: updates.initialData || originalProspectData.initialData,
        userId
    });
    finalUpdates = { ...finalUpdates, ...aiDetails };
  }

  await updateDoc(prospectDocRef, finalUpdates);
  return getProspectById(id); // Re-fetch to get consolidated data
}


export async function getFollowUpsForProspect(prospectId: string): Promise<FollowUp[]> {
  const userId = getCurrentUserId();
  if (!userId) return [];

  const q = query(
    collection(db, FOLLOW_UPS_COLLECTION), 
    where('prospectId', '==', prospectId), 
    where('userId', '==', userId),
    orderBy('date', 'asc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => ({ 
      id: docSnap.id, 
      ...docSnap.data(),
      createdAt: (docSnap.data().createdAt as Timestamp).toDate().toISOString(),
    })) as FollowUp[];
}

export async function getUpcomingFollowUps(days: number = 7): Promise<FollowUp[]> {
  const userId = getCurrentUserId();
  if (!userId) return [];

  const today = new Date();
  today.setHours(0,0,0,0);
  const upcomingDateLimit = new Date(today);
  upcomingDateLimit.setDate(today.getDate() + days);

  const q = query(
    collection(db, FOLLOW_UPS_COLLECTION),
    where('userId', '==', userId),
    where('status', '==', 'Pending'),
    where('date', '>=', today.toISOString().split('T')[0]), // Compare as string YYYY-MM-DD
    where('date', '<=', upcomingDateLimit.toISOString().split('T')[0]),
    orderBy('date', 'asc'),
    orderBy('time', 'asc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => ({ 
      id: docSnap.id, 
      ...docSnap.data(),
      createdAt: (docSnap.data().createdAt as Timestamp).toDate().toISOString(),
    })) as FollowUp[];
}

export async function addFollowUp(followUpData: Omit<FollowUp, 'id' | 'createdAt' | 'userId'>): Promise<FollowUp> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error("User not authenticated");

  const now = Timestamp.now();
  const newFollowUpData = {
    ...followUpData,
    userId,
    createdAt: now,
  };
  const docRef = await addDoc(collection(db, FOLLOW_UPS_COLLECTION), newFollowUpData);
  
  // Update prospect's nextFollowUpDate if this is the earliest
  const prospectDocRef = doc(db, PROSPECTS_COLLECTION, followUpData.prospectId);
  await updateDoc(prospectDocRef, { 
      nextFollowUpDate: await calculateNextFollowUpDate(followUpData.prospectId, userId),
      updatedAt: Timestamp.now()
    });

  return { 
    ...newFollowUpData, 
    id: docRef.id,
    createdAt: now.toDate().toISOString(),
  } as FollowUp;
}

export async function updateFollowUp(followUpId: string, updates: Partial<Omit<FollowUp, 'id' | 'createdAt' | 'prospectId' | 'userId'>>): Promise<FollowUp | undefined> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error("User not authenticated");

  const followUpDocRef = doc(db, FOLLOW_UPS_COLLECTION, followUpId);
  const followUpSnap = await getDoc(followUpDocRef);

  if (!followUpSnap.exists() || followUpSnap.data().userId !== userId) {
    throw new Error("Follow-up not found or unauthorized");
  }
  
  const originalFollowUp = followUpSnap.data() as FollowUp;
  await updateDoc(followUpDocRef, updates);

  if (updates.status && updates.status !== 'Pending') {
    updateGamificationOnFollowUpComplete(originalFollowUp, { ...originalFollowUp, ...updates });
  }
  
  // Recalculate prospect's nextFollowUpDate
  const prospectDocRef = doc(db, PROSPECTS_COLLECTION, originalFollowUp.prospectId);
  await updateDoc(prospectDocRef, { 
      nextFollowUpDate: await calculateNextFollowUpDate(originalFollowUp.prospectId, userId),
      updatedAt: Timestamp.now()
    });
  
  const updatedSnap = await getDoc(followUpDocRef);
  return { 
      id: updatedSnap.id, 
      ...updatedSnap.data(),
      createdAt: (updatedSnap.data()!.createdAt as Timestamp).toDate().toISOString(),
    } as FollowUp;
}

export async function addInteraction(prospectId: string, interactionData: Omit<Interaction, 'id' | 'userId' | 'date'> & {date: string}): Promise<Interaction> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error("User not authenticated");

  const prospectDocRef = doc(db, PROSPECTS_COLLECTION, prospectId);
  const prospectSnap = await getDoc(prospectDocRef);
  if (!prospectSnap.exists() || prospectSnap.data().userId !== userId) {
    throw new Error("Prospect not found or unauthorized to add interaction.");
  }

  const interactionTimestamp = Timestamp.fromDate(new Date(interactionData.date));
  const newInteractionData = {
    ...interactionData,
    userId,
    prospectId, 
    date: interactionTimestamp,
  };

  const docRef = await addDoc(collection(db, INTERACTIONS_COLLECTION), newInteractionData);
  
  await updateDoc(prospectDocRef, { 
      lastContactedDate: interactionTimestamp,
      updatedAt: Timestamp.now() 
    });

  return { 
    ...newInteractionData, 
    id: docRef.id,
    date: interactionTimestamp.toDate().toISOString(),
  } as Interaction;
}


export async function getGamificationStats(): Promise<GamificationStats> {
  const userId = getCurrentUserId();
  if (!userId) return { dailyProspectsAdded: 0, followUpStreak: 0, totalOnTimeFollowUps: 0, totalMissedFollowUps: 0 };

  const statsDocRef = doc(db, GAMIFICATION_COLLECTION, userId);
  const docSnap = await getDoc(statsDocRef);

  const defaultStats: GamificationStats = { dailyProspectsAdded: 0, followUpStreak: 0, totalOnTimeFollowUps: 0, totalMissedFollowUps: 0 };
  
  if (docSnap.exists()) {
    const data = docSnap.data() as GamificationStats;
    const todayStr = new Date().toISOString().split('T')[0];
    if (data.lastProspectAddedDate !== todayStr) {
      data.dailyProspectsAdded = 0; // Reset if last add was not today
    }
    return data;
  } else {
    // Initialize stats if not exists
    await updateDoc(statsDocRef, defaultStats, { merge: true });
    return defaultStats;
  }
}

async function saveGamificationStats(stats: GamificationStats) {
  const userId = getCurrentUserId();
  if (!userId) return;
  const statsDocRef = doc(db, GAMIFICATION_COLLECTION, userId);
  await updateDoc(statsDocRef, stats, { merge: true });
}

async function updateGamificationOnAddProspect() {
  const userId = getCurrentUserId();
  if (!userId) return;

  const statsDocRef = doc(db, GAMIFICATION_COLLECTION, userId);
  await runTransaction(db, async (transaction) => {
    const statsSnap = await transaction.get(statsDocRef);
    let currentStats: GamificationStats;
    if (!statsSnap.exists()) {
      currentStats = { dailyProspectsAdded: 0, followUpStreak: 0, totalOnTimeFollowUps: 0, totalMissedFollowUps: 0 };
    } else {
      currentStats = statsSnap.data() as GamificationStats;
    }
    
    const todayStr = new Date().toISOString().split('T')[0];
    if (currentStats.lastProspectAddedDate !== todayStr) {
      currentStats.dailyProspectsAdded = 0; 
    }
    currentStats.dailyProspectsAdded += 1;
    currentStats.lastProspectAddedDate = todayStr;
    transaction.set(statsDocRef, currentStats, { merge: true });
  });
}

async function updateGamificationOnFollowUpComplete(originalFollowUp: FollowUp, updatedFollowUp: FollowUp) {
  const userId = getCurrentUserId();
  if (!userId) return;

  const statsDocRef = doc(db, GAMIFICATION_COLLECTION, userId);
  await runTransaction(db, async (transaction) => {
    const statsSnap = await transaction.get(statsDocRef);
    let currentStats: GamificationStats;
    if (!statsSnap.exists()) {
      currentStats = { dailyProspectsAdded: 0, followUpStreak: 0, totalOnTimeFollowUps: 0, totalMissedFollowUps: 0 };
    } else {
      currentStats = statsSnap.data() as GamificationStats;
    }

    const scheduledDate = new Date(originalFollowUp.date + 'T' + originalFollowUp.time);
    const completedDate = new Date(); 

    if (updatedFollowUp.status === 'Completed') {
      if (completedDate.toISOString().split('T')[0] <= scheduledDate.toISOString().split('T')[0]) { // On time or early
        currentStats.totalOnTimeFollowUps = (currentStats.totalOnTimeFollowUps || 0) + 1;
        currentStats.followUpStreak = (currentStats.followUpStreak || 0) + 1; 
      } else { // Late
        currentStats.totalMissedFollowUps = (currentStats.totalMissedFollowUps || 0) + 1; 
        currentStats.followUpStreak = 0; // Reset streak if late
      }
    } else if (updatedFollowUp.status === 'Missed') {
      currentStats.totalMissedFollowUps = (currentStats.totalMissedFollowUps || 0) + 1;
      currentStats.followUpStreak = 0; // Reset streak
    }
    transaction.set(statsDocRef, currentStats, { merge: true });
  });
}
