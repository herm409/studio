
import type { Prospect, FollowUp, Interaction, GamificationStats } from '@/types';
import { db, auth } from './firebase';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc, // Added deleteDoc
  query,
  where,
  Timestamp,
  orderBy,
  limit,
  runTransaction,
  setDoc,
  deleteField,
} from 'firebase/firestore';
import { colorCodeProspect as genAIColorCodeProspect } from '@/ai/flows/color-code-prospect';

const PROSPECTS_COLLECTION = 'prospects';
const FOLLOW_UPS_COLLECTION = 'followUps';
const INTERACTIONS_COLLECTION = 'interactions';
const GAMIFICATION_COLLECTION = 'gamificationStats';


// Helper to get current user ID
function getCurrentUserId(): string | null {
  return auth.currentUser ? auth.currentUser.uid : null;
}

async function ensureProspectDetails(prospectData: Omit<Prospect, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'interactionHistory' | 'colorCode' | 'colorCodeReasoning'> & { id?: string, userId: string, createdAt?: string, updatedAt?: string }): Promise<Partial<Pick<Prospect, 'colorCode' | 'colorCodeReasoning'>>> {
  let updatedDetails: Partial<Pick<Prospect, 'colorCode' | 'colorCodeReasoning'>> = {};

  // Color coding (ensure prospectData has name and followUpStageNumber)
  if ((!prospectData.colorCode || prospectData.colorCode === '#CCCCCC' || !prospectData.colorCodeReasoning) && prospectData.name && prospectData.followUpStageNumber) {
    try {
      const colorResult = await genAIColorCodeProspect({ stage: prospectData.followUpStageNumber, prospectName: prospectData.name });
      updatedDetails.colorCode = colorResult.colorCode;
      updatedDetails.colorCodeReasoning = colorResult.reasoning;
    } catch (error) {
      console.error(`Error generating color code for prospect ${prospectData.name}:`, error);
      updatedDetails.colorCode = '#DDDDDD'; // Different fallback for error
      updatedDetails.colorCodeReasoning = 'Failed to generate color code due to an error.';
    }
  } else if (!prospectData.colorCode) {
    updatedDetails.colorCode = '#CCCCCC'; // Default if not generated
    updatedDetails.colorCodeReasoning = 'Default color code assigned.';
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
    return nextFollowUp.date; // Assuming date is stored as YYYY-MM-DD string
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
    let data = prospectDoc.data() as Omit<Prospect, 'id' | 'interactionHistory'> & { createdAt: Timestamp, updatedAt: Timestamp, lastContactedDate?: Timestamp | string, nextFollowUpDate?: Timestamp | string };

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
      lastContactedDate: data.lastContactedDate ? (typeof data.lastContactedDate === 'string' ? data.lastContactedDate : data.lastContactedDate.toDate().toISOString()) : undefined,
      nextFollowUpDate: data.nextFollowUpDate ? (typeof data.nextFollowUpDate === 'string' ? data.nextFollowUpDate : data.nextFollowUpDate.toDate().toISOString()) : await calculateNextFollowUpDate(prospectDoc.id, userId),
      interactionHistory: [],
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
    const data = prospectDocSnap.data() as Omit<Prospect, 'id' | 'interactionHistory'> & { createdAt: Timestamp, updatedAt: Timestamp, lastContactedDate?: Timestamp | string, nextFollowUpDate?: Timestamp | string };
    if (data.userId !== userId) return undefined;

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
      lastContactedDate: data.lastContactedDate ? (typeof data.lastContactedDate === 'string' ? data.lastContactedDate : data.lastContactedDate.toDate().toISOString()) : undefined,
      nextFollowUpDate: data.nextFollowUpDate ? (typeof data.nextFollowUpDate === 'string' ? data.nextFollowUpDate : data.nextFollowUpDate.toDate().toISOString()) : await calculateNextFollowUpDate(id, userId),
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

  const dataForFirestore: { [key: string]: any } = {
    name: prospectData.name,
    initialData: prospectData.initialData,
    currentFunnelStage: prospectData.currentFunnelStage,
    followUpStageNumber: prospectData.followUpStageNumber,
    userId,
    ...aiDetails, // Spread AI generated details (colorCode, colorCodeReasoning)
    createdAt: now,
    updatedAt: now,
  };

  if (prospectData.email && prospectData.email.trim() !== "") {
    dataForFirestore.email = prospectData.email;
  }
  // No 'else' for email; if it's empty/whitespace, it's simply not added to dataForFirestore.

  if (prospectData.phone && prospectData.phone.trim() !== "") {
    dataForFirestore.phone = prospectData.phone;
  }
  // No 'else' for phone.

  if (prospectData.avatarUrl && prospectData.avatarUrl.trim() !== "") {
    dataForFirestore.avatarUrl = prospectData.avatarUrl;
  } else {
    // Default placeholder if avatarUrl is empty, null, undefined, or whitespace.
    dataForFirestore.avatarUrl = `https://placehold.co/100x100.png?text=${prospectData.name.charAt(0)}`;
  }

  const docRef = await addDoc(collection(db, PROSPECTS_COLLECTION), dataForFirestore);
  updateGamificationOnAddProspect();

  return {
    id: docRef.id,
    userId: dataForFirestore.userId,
    name: dataForFirestore.name,
    email: dataForFirestore.email, // Will be undefined if not in dataForFirestore
    phone: dataForFirestore.phone, // Will be undefined if not in dataForFirestore
    initialData: dataForFirestore.initialData,
    currentFunnelStage: dataForFirestore.currentFunnelStage,
    followUpStageNumber: dataForFirestore.followUpStageNumber,
    colorCode: dataForFirestore.colorCode,
    colorCodeReasoning: dataForFirestore.colorCodeReasoning,
    lastContactedDate: undefined,
    nextFollowUpDate: undefined,
    interactionHistory: [],
    createdAt: now.toDate().toISOString(),
    updatedAt: now.toDate().toISOString(),
    avatarUrl: dataForFirestore.avatarUrl,
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
  const updatesForFirestore: { [key: string]: any } = { updatedAt: Timestamp.now() };

  // Iterate over keys in updates to build updatesForFirestore object
  for (const key of Object.keys(updates) as Array<keyof typeof updates>) {
    const value = updates[key];
    if ((key === 'email' || key === 'phone') && value === '') {
      updatesForFirestore[key] = deleteField(); // Remove field if empty string
    } else if (key === 'avatarUrl' && value === '') {
      // Set default placeholder if avatarUrl is cleared with an empty string
      updatesForFirestore[key] = `https://placehold.co/100x100.png?text=${(updates.name || originalProspectData.name).charAt(0)}`;
    } else if (value !== undefined) { // Only include the field if value is not undefined
      updatesForFirestore[key] = value;
    }
  }
  
  if (updates.followUpStageNumber && updates.followUpStageNumber !== originalProspectData.followUpStageNumber) {
    const aiDetails = await ensureProspectDetails({
      name: updates.name || originalProspectData.name,
      followUpStageNumber: updates.followUpStageNumber,
      currentFunnelStage: updates.currentFunnelStage || originalProspectData.currentFunnelStage,
      initialData: updates.initialData || originalProspectData.initialData,
      userId,
    });
    Object.assign(updatesForFirestore, aiDetails); // Merge AI details into updatesForFirestore
  }

  await updateDoc(prospectDocRef, updatesForFirestore);
  // After updating, recalculate nextFollowUpDate for the prospect
  const updatedNextFollowUpDate = await calculateNextFollowUpDate(id, userId);
  if (updatedNextFollowUpDate !== originalProspectData.nextFollowUpDate) {
      await updateDoc(prospectDocRef, { nextFollowUpDate: updatedNextFollowUpDate || deleteField() });
  }

  return getProspectById(id);
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
  return querySnapshot.docs.map(docSnap => {
    const data = docSnap.data();
    const createdAtTimestamp = data.createdAt as Timestamp | undefined;
    // Fallback to epoch if createdAt is missing, though new follow-ups should always have it.
    const createdAtString = createdAtTimestamp ? createdAtTimestamp.toDate().toISOString() : new Date(0).toISOString(); 
    return {
      id: docSnap.id,
      userId: data.userId,
      prospectId: data.prospectId,
      date: data.date,
      time: data.time,
      method: data.method,
      notes: data.notes,
      status: data.status,
      aiSuggestedTone: data.aiSuggestedTone,
      aiSuggestedContent: data.aiSuggestedContent,
      aiSuggestedTool: data.aiSuggestedTool,
      createdAt: createdAtString,
    } as FollowUp;
  });
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
    where('date', '>=', today.toISOString().split('T')[0]),
    where('date', '<=', upcomingDateLimit.toISOString().split('T')[0]),
    orderBy('date', 'asc'),
    orderBy('time', 'asc')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => {
    const data = docSnap.data();
    const createdAtTimestamp = data.createdAt as Timestamp | undefined;
    // Fallback to epoch if createdAt is missing, though new follow-ups should always have it.
    const createdAtString = createdAtTimestamp ? createdAtTimestamp.toDate().toISOString() : new Date(0).toISOString();
    return {
      id: docSnap.id,
      userId: data.userId,
      prospectId: data.prospectId,
      date: data.date,
      time: data.time,
      method: data.method,
      notes: data.notes,
      status: data.status,
      aiSuggestedTone: data.aiSuggestedTone,
      aiSuggestedContent: data.aiSuggestedContent,
      aiSuggestedTool: data.aiSuggestedTool,
      createdAt: createdAtString,
    } as FollowUp;
  });
}

export async function addFollowUp(followUpData: Omit<FollowUp, 'id' | 'createdAt' | 'userId'>): Promise<FollowUp> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error("User not authenticated");

  const now = Timestamp.now();
  const newFollowUpData = {
    ...followUpData,
    userId,
    createdAt: now, // Firestore Timestamp
  };
  const docRef = await addDoc(collection(db, FOLLOW_UPS_COLLECTION), newFollowUpData);

  const prospectDocRef = doc(db, PROSPECTS_COLLECTION, followUpData.prospectId);
  const nextFollowUpDate = await calculateNextFollowUpDate(followUpData.prospectId, userId);
  await updateDoc(prospectDocRef, {
      nextFollowUpDate: nextFollowUpDate || deleteField(), // Store as string or delete if none
      updatedAt: Timestamp.now()
    });

  return {
    ...followUpData, // Contains all original fields except id, createdAt, userId
    id: docRef.id,
    userId,
    createdAt: now.toDate().toISOString(), // Convert to ISO string for return type
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

  const originalFollowUpData = followUpSnap.data()!; // Assert data exists
  await updateDoc(followUpDocRef, updates);

   // Construct the original and updated FollowUp objects for gamification logic
   const originalFollowUpForGamification: FollowUp = {
    id: followUpSnap.id,
    ...originalFollowUpData,
    createdAt: (originalFollowUpData.createdAt as Timestamp | undefined)?.toDate().toISOString() || new Date(0).toISOString(),
  } as FollowUp;

  const updatedFollowUpForGamification: FollowUp = {
    ...originalFollowUpForGamification,
    ...updates, // Apply updates
  };


  if (updates.status && updates.status !== 'Pending' && originalFollowUpForGamification.status === 'Pending') {
     updateGamificationOnFollowUpComplete(originalFollowUpForGamification, updatedFollowUpForGamification);
  }


  const prospectDocRef = doc(db, PROSPECTS_COLLECTION, originalFollowUpData.prospectId);
  const nextFollowUpDate = await calculateNextFollowUpDate(originalFollowUpData.prospectId, userId);
  await updateDoc(prospectDocRef, {
      nextFollowUpDate: nextFollowUpDate || deleteField(),
      updatedAt: Timestamp.now()
    });

  const updatedSnap = await getDoc(followUpDocRef);
  const finalData = updatedSnap.data()!;
  return {
      id: updatedSnap.id,
      ...finalData,
      createdAt: (finalData.createdAt as Timestamp | undefined)?.toDate().toISOString() || new Date(0).toISOString(),
    } as FollowUp;
}

export async function deleteFollowUp(followUpId: string): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error("User not authenticated");

  const followUpDocRef = doc(db, FOLLOW_UPS_COLLECTION, followUpId);
  const followUpSnap = await getDoc(followUpDocRef);

  if (!followUpSnap.exists() || followUpSnap.data().userId !== userId) {
    throw new Error("Follow-up not found or unauthorized");
  }

  const prospectId = followUpSnap.data().prospectId as string;

  await deleteDoc(followUpDocRef);

  // After deleting, recalculate nextFollowUpDate for the prospect
  const prospectDocRef = doc(db, PROSPECTS_COLLECTION, prospectId);
  const nextFollowUpDate = await calculateNextFollowUpDate(prospectId, userId);
  await updateDoc(prospectDocRef, {
    nextFollowUpDate: nextFollowUpDate || deleteField(),
    updatedAt: Timestamp.now(),
  });
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
      lastContactedDate: interactionTimestamp.toDate().toISOString(), // Store as ISO string
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
  if (!userId) return { dailyProspectsAdded: 0, followUpStreak: 0, totalOnTimeFollowUps: 0, totalMissedFollowUps: 0, lastProspectAddedDate: null, lastFollowUpActivityDate: null };

  const statsDocRef = doc(db, GAMIFICATION_COLLECTION, userId);
  const docSnap = await getDoc(statsDocRef);

  const defaultStats: GamificationStats = { dailyProspectsAdded: 0, followUpStreak: 0, totalOnTimeFollowUps: 0, totalMissedFollowUps: 0, lastProspectAddedDate: null, lastFollowUpActivityDate: null };

  if (docSnap.exists()) {
    const data = docSnap.data() as GamificationStats;
    const todayStr = new Date().toISOString().split('T')[0];

    let statsToReturn: GamificationStats = { ...defaultStats, ...data };

    if (statsToReturn.lastProspectAddedDate !== todayStr) {
      statsToReturn.dailyProspectsAdded = 0;
    }
    return statsToReturn;
  } else {
    await setDoc(statsDocRef, defaultStats);
    return defaultStats;
  }
}

async function updateGamificationOnAddProspect() {
  const userId = getCurrentUserId();
  if (!userId) return;

  const statsDocRef = doc(db, GAMIFICATION_COLLECTION, userId);
  await runTransaction(db, async (transaction) => {
    const statsSnap = await transaction.get(statsDocRef);
    let currentStats: GamificationStats;
    const defaultStatsBase: GamificationStats = { dailyProspectsAdded: 0, followUpStreak: 0, totalOnTimeFollowUps: 0, totalMissedFollowUps: 0, lastProspectAddedDate: null, lastFollowUpActivityDate: null };

    if (!statsSnap.exists()) {
      currentStats = defaultStatsBase;
    } else {
      currentStats = { ...defaultStatsBase, ...statsSnap.data() as GamificationStats };
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
    const defaultStatsBase: GamificationStats = { dailyProspectsAdded: 0, followUpStreak: 0, totalOnTimeFollowUps: 0, totalMissedFollowUps: 0, lastProspectAddedDate: null, lastFollowUpActivityDate: null };

    if (!statsSnap.exists()) {
      currentStats = defaultStatsBase;
    } else {
      currentStats = { ...defaultStatsBase, ...statsSnap.data() as GamificationStats };
    }

    const completedDate = new Date();
    const todayStr = completedDate.toISOString().split('T')[0];

    if (updatedFollowUp.status === 'Completed') {
      currentStats.totalOnTimeFollowUps = (currentStats.totalOnTimeFollowUps || 0) + 1;
      // Only increment streak if this is a new day of activity
      if (currentStats.lastFollowUpActivityDate !== todayStr) {
         currentStats.followUpStreak = (currentStats.followUpStreak || 0) + 1;
      }
      currentStats.lastFollowUpActivityDate = todayStr;
    } else if (updatedFollowUp.status === 'Missed') {
      currentStats.totalMissedFollowUps = (currentStats.totalMissedFollowUps || 0) + 1;
      currentStats.followUpStreak = 0; // Reset streak on missed
      currentStats.lastFollowUpActivityDate = todayStr; // Still counts as activity for the day
    }
    transaction.set(statsDocRef, currentStats, { merge: true });
  });
}
