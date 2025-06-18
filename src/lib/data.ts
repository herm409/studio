
import type { Prospect, FollowUp, Interaction, GamificationStats, AccountabilitySummaryData, FunnelStageType } from '@/types';
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
  runTransaction,
  setDoc,
  deleteField,
} from 'firebase/firestore';
import { colorCodeProspect as genAIColorCodeProspect } from '@/ai/flows/color-code-prospect';
import type { User } from 'firebase/auth';

const USERS_COLLECTION = 'users';
const PROSPECTS_COLLECTION = 'prospects';
const FOLLOW_UPS_COLLECTION = 'followUps';
const INTERACTIONS_COLLECTION = 'interactions';
const GAMIFICATION_COLLECTION = 'gamificationStats';


// Helper to get current user ID
function getCurrentUserId(): string | null {
  return auth.currentUser ? auth.currentUser.uid : null;
}

export async function ensureUserProfileDocument(user: User): Promise<void> {
  const userDocRef = doc(db, USERS_COLLECTION, user.uid);
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists()) {
    try {
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || "User",
        photoURL: user.photoURL || `https://placehold.co/100x100.png?text=${(user.displayName || user.email || "U").charAt(0)}`,
        createdAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error creating user profile document:", error);
    }
  }
}

export async function updateUserFirestoreProfile(userId: string, data: { displayName?: string | null; photoURL?: string | null }): Promise<void> {
  if (!userId) throw new Error("User ID is required to update profile.");
  const userDocRef = doc(db, USERS_COLLECTION, userId);
  const updateData: { [key: string]: any } = {};
  if (data.displayName !== undefined) updateData.displayName = data.displayName;
  if (data.photoURL !== undefined) updateData.photoURL = data.photoURL;
  
  if (Object.keys(updateData).length > 0) {
    updateData.updatedAt = Timestamp.now();
    await updateDoc(userDocRef, updateData);
  }
}

interface EnsureProspectDetailsInput {
  userId: string;
  name: string;
  followUpStageNumber: number;
  currentFunnelStage: FunnelStageType;
  initialData: string;
  id?: string;
  colorCode?: string;
  colorCodeReasoning?: string;
}

async function ensureProspectDetails(prospectData: EnsureProspectDetailsInput): Promise<Partial<Pick<Prospect, 'colorCode' | 'colorCodeReasoning'>>> {
  let updatedDetails: Partial<Pick<Prospect, 'colorCode' | 'colorCodeReasoning'>> = {};

  if ((!prospectData.colorCode || prospectData.colorCode === '#CCCCCC' || !prospectData.colorCodeReasoning) && prospectData.name && prospectData.followUpStageNumber) {
    try {
      const colorResult = await genAIColorCodeProspect({ stage: prospectData.followUpStageNumber, prospectName: prospectData.name });
      updatedDetails.colorCode = colorResult.colorCode;
      updatedDetails.colorCodeReasoning = colorResult.reasoning;
    } catch (error) {
      console.error(`Error generating color code for prospect ${prospectData.name}:`, error);
      updatedDetails.colorCode = '#DDDDDD'; 
      updatedDetails.colorCodeReasoning = 'Failed to generate color code due to an error.';
    }
  } else if (!prospectData.colorCode) {
    updatedDetails.colorCode = '#CCCCCC'; 
    updatedDetails.colorCodeReasoning = 'Default color code assigned as no specific conditions met for AI generation.';
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
    let data = prospectDoc.data() as Omit<Prospect, 'id' | 'interactionHistory'> & { createdAt: Timestamp, updatedAt: Timestamp, lastContactedDate?: Timestamp | string, nextFollowUpDate?: Timestamp | string };

    let lastContactedDateValue: string | undefined = undefined;
    if (data.lastContactedDate) {
        if (typeof data.lastContactedDate === 'string') {
            lastContactedDateValue = data.lastContactedDate;
        } else if (data.lastContactedDate instanceof Timestamp) {
            lastContactedDateValue = data.lastContactedDate.toDate().toISOString();
        }
    }

    let nextFollowUpDateValue: string | undefined = undefined;
    if (data.nextFollowUpDate) {
        if (typeof data.nextFollowUpDate === 'string') {
            nextFollowUpDateValue = data.nextFollowUpDate;
        } else if (data.nextFollowUpDate instanceof Timestamp) {
            nextFollowUpDateValue = data.nextFollowUpDate.toDate().toISOString();
        }
    } else {
        nextFollowUpDateValue = await calculateNextFollowUpDate(prospectDoc.id, userId);
    }

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
      lastContactedDate: lastContactedDateValue,
      nextFollowUpDate: nextFollowUpDateValue,
      interactionHistory: [],
      createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
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

    let lastContactedDateValue: string | undefined = undefined;
    if (data.lastContactedDate) {
        if (typeof data.lastContactedDate === 'string') {
            lastContactedDateValue = data.lastContactedDate;
        } else if (data.lastContactedDate instanceof Timestamp) {
            lastContactedDateValue = data.lastContactedDate.toDate().toISOString();
        }
    }

    let nextFollowUpDateValue: string | undefined = undefined;
    if (data.nextFollowUpDate) {
        if (typeof data.nextFollowUpDate === 'string') {
            nextFollowUpDateValue = data.nextFollowUpDate;
        } else if (data.nextFollowUpDate instanceof Timestamp) {
            nextFollowUpDateValue = data.nextFollowUpDate.toDate().toISOString();
        }
    } else {
        nextFollowUpDateValue = await calculateNextFollowUpDate(id, userId);
    }

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
      lastContactedDate: lastContactedDateValue,
      nextFollowUpDate: nextFollowUpDateValue,
      interactionHistory: interactionHistory,
      createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
      avatarUrl: data.avatarUrl,
    };
    return prospect;
  }
  return undefined;
}

export async function addProspect(prospectData: Omit<Prospect, 'id' | 'createdAt' | 'updatedAt' | 'interactionHistory' | 'colorCode' | 'colorCodeReasoning' | 'nextFollowUpDate' | 'lastContactedDate' | 'userId'> & { avatarUrl?: string }): Promise<Prospect> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error("User not authenticated");

  const now = Timestamp.now();
  
  const aiDetails = await ensureProspectDetails({ 
    name: prospectData.name,
    followUpStageNumber: prospectData.followUpStageNumber,
    currentFunnelStage: prospectData.currentFunnelStage,
    initialData: prospectData.initialData,
    userId 
  });

  const dataForFirestore: { [key: string]: any } = {
    name: prospectData.name,
    initialData: prospectData.initialData,
    currentFunnelStage: prospectData.currentFunnelStage,
    followUpStageNumber: prospectData.followUpStageNumber,
    userId,
    ...aiDetails, 
    createdAt: now,
    updatedAt: now,
  };

  if (prospectData.email && prospectData.email.trim() !== "") {
    dataForFirestore.email = prospectData.email;
  }

  if (prospectData.phone && prospectData.phone.trim() !== "") {
    dataForFirestore.phone = prospectData.phone;
  }
  
  if (prospectData.avatarUrl && prospectData.avatarUrl.trim() !== "") {
    dataForFirestore.avatarUrl = prospectData.avatarUrl;
  } else {
    dataForFirestore.avatarUrl = `https://placehold.co/100x100.png?text=${prospectData.name.charAt(0)}`;
  }


  const docRef = await addDoc(collection(db, PROSPECTS_COLLECTION), dataForFirestore);
  updateGamificationOnAddProspect();

  return {
    id: docRef.id,
    userId: dataForFirestore.userId,
    name: dataForFirestore.name,
    email: dataForFirestore.email, 
    phone: dataForFirestore.phone, 
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

  for (const key of Object.keys(updates) as Array<keyof typeof updates>) {
    const value = updates[key];
    if ((key === 'email' || key === 'phone') && value === '') {
      updatesForFirestore[key] = deleteField(); 
    } else if (key === 'avatarUrl' && (value === '' || value === null || value === undefined)) {
      updatesForFirestore[key] = `https://placehold.co/100x100.png?text=${(updates.name || originalProspectData.name).charAt(0)}`;
    } else if (value !== undefined) { 
      updatesForFirestore[key] = value;
    }
  }
  
  
  if (updates.followUpStageNumber && updates.followUpStageNumber !== originalProspectData.followUpStageNumber) {
    const aiDetails = await ensureProspectDetails({
      name: updates.name || originalProspectData.name,
      followUpStageNumber: updates.followUpStageNumber,
      currentFunnelStage: updates.currentFunnelStage || originalProspectData.currentFunnelStage,
      initialData: updates.initialData || originalProspectData.initialData,
      colorCode: originalProspectData.colorCode, 
      colorCodeReasoning: originalProspectData.colorCodeReasoning, 
      userId,
    });
    Object.assign(updatesForFirestore, aiDetails); 
  }

  await updateDoc(prospectDocRef, updatesForFirestore);
  const updatedNextFollowUpDate = await calculateNextFollowUpDate(id, userId);
  
  const currentStoredNextFollowUpTimestamp = prospectSnap.data().nextFollowUpDate;
  let currentStoredNextFollowUp: string | undefined = undefined;
    if (currentStoredNextFollowUpTimestamp) {
        if (typeof currentStoredNextFollowUpTimestamp === 'string') {
            currentStoredNextFollowUp = currentStoredNextFollowUpTimestamp;
        } else if (currentStoredNextFollowUpTimestamp instanceof Timestamp) {
            currentStoredNextFollowUp = currentStoredNextFollowUpTimestamp.toDate().toISOString().split('T')[0]; // Get YYYY-MM-DD
        }
    }

  if (updatedNextFollowUpDate !== currentStoredNextFollowUp) {
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
    const updatedAtTimestamp = data.updatedAt as Timestamp | undefined;
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
      createdAt: createdAtTimestamp?.toDate().toISOString() ?? new Date(0).toISOString(),
      updatedAt: updatedAtTimestamp?.toDate().toISOString(),
    } as FollowUp;
  });
}

export async function getUpcomingFollowUps(days: number = 7): Promise<FollowUp[]> {
  const userId = getCurrentUserId();
  if (!userId) return [];

  const today = new Date(); 
  const startDateObj = new Date(today.getFullYear(), today.getMonth(), today.getDate()); 

  const endDateObj = new Date(startDateObj);
  endDateObj.setDate(startDateObj.getDate() + days - 1); 

  const startDateString = startDateObj.toISOString().split('T')[0];
  const endDateString = endDateObj.toISOString().split('T')[0];

  const q = query(
    collection(db, FOLLOW_UPS_COLLECTION),
    where('userId', '==', userId),
    where('status', '==', 'Pending'),
    where('date', '>=', startDateString),
    where('date', '<=', endDateString),
    orderBy('date', 'asc'),
    orderBy('time', 'asc')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => {
    const data = docSnap.data();
    const createdAtTimestamp = data.createdAt as Timestamp | undefined;
    const updatedAtTimestamp = data.updatedAt as Timestamp | undefined;
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
      createdAt: createdAtTimestamp?.toDate().toISOString() ?? new Date(0).toISOString(),
      updatedAt: updatedAtTimestamp?.toDate().toISOString(),
    } as FollowUp;
  });
}

export async function addFollowUp(followUpData: Omit<FollowUp, 'id' | 'createdAt' | 'updatedAt'| 'userId'>): Promise<FollowUp> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error("User not authenticated");

  const now = Timestamp.now();
  const newFollowUpData = {
    ...followUpData,
    userId,
    createdAt: now, 
    updatedAt: now, 
  };
  const docRef = await addDoc(collection(db, FOLLOW_UPS_COLLECTION), newFollowUpData);

  const prospectDocRef = doc(db, PROSPECTS_COLLECTION, followUpData.prospectId);
  const nextFollowUpDate = await calculateNextFollowUpDate(followUpData.prospectId, userId);
  await updateDoc(prospectDocRef, {
      nextFollowUpDate: nextFollowUpDate || deleteField(), 
      updatedAt: Timestamp.now()
    });

  return {
    ...followUpData, 
    id: docRef.id,
    userId,
    createdAt: now.toDate().toISOString(), 
    updatedAt: now.toDate().toISOString(),
  } as FollowUp;
}

export async function updateFollowUp(followUpId: string, updates: Partial<Omit<FollowUp, 'id' | 'createdAt' | 'updatedAt' | 'prospectId' | 'userId'>>): Promise<FollowUp | undefined> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error("User not authenticated");

  const followUpDocRef = doc(db, FOLLOW_UPS_COLLECTION, followUpId);
  const followUpSnap = await getDoc(followUpDocRef);

  if (!followUpSnap.exists() || followUpSnap.data().userId !== userId) {
    throw new Error("Follow-up not found or unauthorized");
  }

  const originalFollowUpData = followUpSnap.data()!; 
  const updatesForFirestore: { [key: string]: any } = { ...updates, updatedAt: Timestamp.now() };
  await updateDoc(followUpDocRef, updatesForFirestore);

   const originalFollowUpForGamification: FollowUp = {
    id: followUpSnap.id,
    ...originalFollowUpData,
    createdAt: (originalFollowUpData.createdAt as Timestamp | undefined)?.toDate().toISOString(),
    updatedAt: (originalFollowUpData.updatedAt as Timestamp | undefined)?.toDate().toISOString(),
  } as FollowUp;

  const updatedFollowUpForGamification: FollowUp = {
    ...originalFollowUpForGamification,
    ...updates, 
    updatedAt: (updatesForFirestore.updatedAt as Timestamp).toDate().toISOString(), 
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
      createdAt: (finalData.createdAt as Timestamp | undefined)?.toDate().toISOString(),
      updatedAt: (finalData.updatedAt as Timestamp)?.toDate().toISOString(),
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
    prospectId: interactionData.prospectId || prospectId, // Ensure prospectId is set
    date: interactionTimestamp,
  };

  const docRef = await addDoc(collection(db, INTERACTIONS_COLLECTION), newInteractionData);

  await updateDoc(prospectDocRef, {
      lastContactedDate: interactionTimestamp.toDate().toISOString(), 
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
      if (currentStats.lastFollowUpActivityDate !== todayStr) {
         currentStats.followUpStreak = (currentStats.followUpStreak || 0) + 1;
      }
      currentStats.lastFollowUpActivityDate = todayStr;
    } else if (updatedFollowUp.status === 'Missed') {
      currentStats.totalMissedFollowUps = (currentStats.totalMissedFollowUps || 0) + 1;
      currentStats.followUpStreak = 0; 
      currentStats.lastFollowUpActivityDate = todayStr; 
    }
    transaction.set(statsDocRef, currentStats, { merge: true });
  });
}

export async function getAccountabilitySummaryData(): Promise<AccountabilitySummaryData> {
  const userId = getCurrentUserId();
  if (!userId) {
    return { newProspectsLast14Days: 0, followUpsCompletedLast14Days: 0, interactionsLoggedLast14Days: 0, currentFollowUpStreak: 0 };
  }

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const fourteenDaysAgoTimestamp = Timestamp.fromDate(fourteenDaysAgo);

  // New Prospects
  const prospectsQuery = query(
    collection(db, PROSPECTS_COLLECTION),
    where('userId', '==', userId),
    where('createdAt', '>=', fourteenDaysAgoTimestamp)
  );
  const prospectsSnap = await getDocs(prospectsQuery);
  const newProspectsLast14Days = prospectsSnap.size;

  // Follow-ups Completed
  const followUpsQuery = query(
    collection(db, FOLLOW_UPS_COLLECTION),
    where('userId', '==', userId),
    where('status', '==', 'Completed'),
    where('updatedAt', '>=', fourteenDaysAgoTimestamp) 
  );
  const followUpsSnap = await getDocs(followUpsQuery);
  const followUpsCompletedLast14Days = followUpsSnap.size;
  
  const interactionsQuery = query(
    collection(db, INTERACTIONS_COLLECTION),
    where('userId', '==', userId),
    where('date', '>=', fourteenDaysAgoTimestamp) 
  );
  const interactionsSnap = await getDocs(interactionsQuery);
  const interactionsLoggedLast14Days = interactionsSnap.size;

  const gamificationStats = await getGamificationStats(); 
  const currentFollowUpStreak = gamificationStats.followUpStreak;

  return {
    newProspectsLast14Days,
    followUpsCompletedLast14Days,
    interactionsLoggedLast14Days,
    currentFollowUpStreak,
  };
}

    