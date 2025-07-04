
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
import { isPast, isToday, parseISO, format } from 'date-fns';

const USERS_COLLECTION = 'users';
const PROSPECTS_COLLECTION = 'prospects';
const FOLLOW_UPS_COLLECTION = 'followUps';
const INTERACTIONS_COLLECTION = 'interactions';
const GAMIFICATION_COLLECTION = 'gamificationStats';

// Helper to get current user ID
function getCurrentUserId(): string | null {
  return auth.currentUser ? auth.currentUser.uid : null;
}

// Interface for raw prospect data from Firestore
interface ProspectDocData {
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  initialData: string;
  currentFunnelStage: FunnelStageType;
  followUpStageNumber: number;
  colorCode?: string;
  colorCodeReasoning?: string;
  lastContactedDate?: Timestamp | string;
  nextFollowUpDate?: Timestamp | string;
  isArchived?: boolean | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  avatarUrl?: string;
}

export interface AlertNotificationItem {
  followUp: FollowUp;
  prospectId: string;
  prospectName: string;
  prospectAvatarUrl?: string;
  prospectColorCode?: string;
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
  id?: string; // Prospect ID
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
      console.error(`Error generating color code for prospect ${prospectData.name || prospectData.id}:`, error);
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
  const prospectDocRef = doc(db, PROSPECTS_COLLECTION, prospectId);
  const prospectSnap = await getDoc(prospectDocRef);
  if (!prospectSnap.exists() || prospectSnap.data()?.isArchived === true) {
    return undefined;
  }

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

  const q = query(
    collection(db, PROSPECTS_COLLECTION),
    where('userId', '==', userId)
  );
  const querySnapshot = await getDocs(q);
  const prospectsList: Prospect[] = [];

  for (const prospectDoc of querySnapshot.docs) {
    const data = prospectDoc.data() as ProspectDocData;

    if (data.isArchived === true) {
      continue;
    }

    let lastContactedDateValue: string | undefined = undefined;
    const rawLCD = data.lastContactedDate;
    if (rawLCD) {
        if (typeof rawLCD === 'string') {
            lastContactedDateValue = rawLCD;
        } else if (rawLCD && 'toDate' in rawLCD && typeof (rawLCD as any).toDate === 'function') {
            const tempTimestamp = rawLCD as Timestamp;
            lastContactedDateValue = tempTimestamp.toDate().toISOString();
        }
    }

    let nextFollowUpDateValue: string | undefined = undefined;
    const rawNFD = data.nextFollowUpDate;
    if (rawNFD) {
        if (typeof rawNFD === 'string') {
            nextFollowUpDateValue = rawNFD.split('T')[0];
        } else if (rawNFD && 'toDate' in rawNFD && typeof (rawNFD as any).toDate === 'function') {
             const tempTimestamp = rawNFD as Timestamp;
             nextFollowUpDateValue = tempTimestamp.toDate().toISOString().split('T')[0];
        }
    }

    if (nextFollowUpDateValue === undefined) {
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
      isArchived: Boolean(data.isArchived),
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
    const data = prospectDocSnap.data() as ProspectDocData;
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
    const rawLCD = data.lastContactedDate;
    if (rawLCD) {
        if (typeof rawLCD === 'string') {
            lastContactedDateValue = rawLCD;
        } else if (rawLCD && 'toDate' in rawLCD && typeof (rawLCD as any).toDate === 'function') {
            const tempTimestamp = rawLCD as Timestamp;
            lastContactedDateValue = tempTimestamp.toDate().toISOString();
        }
    }

    let nextFollowUpDateValue: string | undefined = undefined;
    const rawNFD = data.nextFollowUpDate;
    if (rawNFD) {
        if (typeof rawNFD === 'string') {
            nextFollowUpDateValue = rawNFD.split('T')[0];
        } else if (rawNFD && 'toDate' in rawNFD && typeof (rawNFD as any).toDate === 'function') {
             const tempTimestamp = rawNFD as Timestamp;
             nextFollowUpDateValue = tempTimestamp.toDate().toISOString().split('T')[0];
        }
    }

    if (nextFollowUpDateValue === undefined && data.isArchived !== true) {
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
      isArchived: Boolean(data.isArchived),
      createdAt: data.createdAt.toDate().toISOString(),
      updatedAt: data.updatedAt.toDate().toISOString(),
      avatarUrl: data.avatarUrl,
    };
    return prospect;
  }
  return undefined;
}

export async function addProspect(prospectData: Omit<Prospect, 'id' | 'createdAt' | 'updatedAt' | 'interactionHistory' | 'colorCode' | 'colorCodeReasoning' | 'nextFollowUpDate' | 'lastContactedDate' | 'userId' | 'isArchived'> & { avatarUrl?: string }): Promise<Prospect> {
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
    isArchived: false,
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
    isArchived: false,
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

  const originalProspectData = prospectSnap.data() as ProspectDocData;
  const updatesForFirestore: { [key: string]: any } = { updatedAt: Timestamp.now() };

  // Apply all provided updates first
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

  const finalStage = updatesForFirestore.currentFunnelStage || originalProspectData.currentFunnelStage;

  if (finalStage === "Close") {
    updatesForFirestore.isArchived = true;
    updatesForFirestore.nextFollowUpDate = deleteField();
  } else {
    updatesForFirestore.isArchived = false;
  }

  if ( (updates.followUpStageNumber && updates.followUpStageNumber !== originalProspectData.followUpStageNumber) ||
       (updates.name && updates.name !== originalProspectData.name) ||
       (originalProspectData.colorCode === '#CCCCCC' && (!updatesForFirestore.colorCode || updatesForFirestore.colorCode === '#CCCCCC') && updatesForFirestore.isArchived === false ) ||
       (updatesForFirestore.isArchived === false && originalProspectData.isArchived !== false )
     ) {
    const aiDetails = await ensureProspectDetails({
      id: id,
      name: updatesForFirestore.name || originalProspectData.name,
      followUpStageNumber: updatesForFirestore.followUpStageNumber || originalProspectData.followUpStageNumber,
      currentFunnelStage: finalStage,
      initialData: updatesForFirestore.initialData || originalProspectData.initialData,
      colorCode: updatesForFirestore.colorCode || originalProspectData.colorCode,
      colorCodeReasoning: updatesForFirestore.colorCodeReasoning || originalProspectData.colorCodeReasoning,
      userId,
    });
    Object.assign(updatesForFirestore, aiDetails);
  }


  await updateDoc(prospectDocRef, updatesForFirestore);

  const finalProspectDataAfterUpdate = (await getDoc(prospectDocRef)).data() as ProspectDocData;
  let updatedNextFollowUpDate;

  if (finalProspectDataAfterUpdate.isArchived === true) {
    updatedNextFollowUpDate = undefined;
  } else {
    updatedNextFollowUpDate = await calculateNextFollowUpDate(id, userId);
  }

  let currentStoredNextFollowUp: string | undefined = undefined;
  const rawNFDAfterUpdate = finalProspectDataAfterUpdate.nextFollowUpDate;
  if (rawNFDAfterUpdate) {
      if (typeof rawNFDAfterUpdate === 'string') {
          currentStoredNextFollowUp = rawNFDAfterUpdate.split('T')[0];
      } else if (rawNFDAfterUpdate && 'toDate' in rawNFDAfterUpdate && typeof (rawNFDAfterUpdate as any).toDate === 'function') {
          const tempTimestamp = rawNFDAfterUpdate as Timestamp;
          currentStoredNextFollowUp = tempTimestamp.toDate().toISOString().split('T')[0];
      }
  }

  if (updatedNextFollowUpDate !== currentStoredNextFollowUp || (finalProspectDataAfterUpdate.isArchived === true && currentStoredNextFollowUp !== undefined)) {
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
  const followUps = querySnapshot.docs.map(docSnap => {
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

  const activeFollowUps = [];
  for (const fu of followUps) {
    const prospectDoc = await getDoc(doc(db, PROSPECTS_COLLECTION, fu.prospectId));
    if (prospectDoc.exists() && prospectDoc.data()?.isArchived !== true) {
      activeFollowUps.push(fu);
    }
  }
  return activeFollowUps;
}

export async function addFollowUp(followUpData: Omit<FollowUp, 'id' | 'createdAt' | 'updatedAt'| 'userId'>): Promise<FollowUp> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error("User not authenticated");

  const prospectDocRefForCheck = doc(db, PROSPECTS_COLLECTION, followUpData.prospectId);
  const prospectSnapForCheck = await getDoc(prospectDocRefForCheck);
  if (prospectSnapForCheck.exists() && prospectSnapForCheck.data()?.isArchived === true) {
    throw new Error("Cannot add follow-up to an archived prospect.");
  }


  const now = Timestamp.now();
  const newFollowUpData: {[key: string]: any} = {
    prospectId: followUpData.prospectId,
    date: followUpData.date,
    time: followUpData.time,
    method: followUpData.method,
    notes: followUpData.notes,
    status: followUpData.status,
    userId,
    createdAt: now,
    updatedAt: now,
  };

  if (followUpData.aiSuggestedTone) {
    newFollowUpData.aiSuggestedTone = followUpData.aiSuggestedTone;
  }
  if (followUpData.aiSuggestedContent) {
    newFollowUpData.aiSuggestedContent = followUpData.aiSuggestedContent;
  }
  if (followUpData.aiSuggestedTool) {
    newFollowUpData.aiSuggestedTool = followUpData.aiSuggestedTool;
  }

  const docRef = await addDoc(collection(db, FOLLOW_UPS_COLLECTION), newFollowUpData);

  const prospectDocRef = doc(db, PROSPECTS_COLLECTION, followUpData.prospectId);
  const nextFollowUpDate = await calculateNextFollowUpDate(followUpData.prospectId, userId);
  await updateDoc(prospectDocRef, {
      nextFollowUpDate: nextFollowUpDate || deleteField(),
      updatedAt: Timestamp.now()
    });

  return {
    ...newFollowUpData,
    id: docRef.id,
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

     if (updatedFollowUpForGamification.status === 'Completed') {
        const prospectDocToUpdateRef = doc(db, PROSPECTS_COLLECTION, originalFollowUpData.prospectId);
        const prospectSnapToUpdate = await getDoc(prospectDocToUpdateRef);

        if (prospectSnapToUpdate.exists() && prospectSnapToUpdate.data().userId === userId) {
            const prospectDataToUpdate = prospectSnapToUpdate.data() as ProspectDocData;
            let newFollowUpStageNumber = (prospectDataToUpdate.followUpStageNumber || 0) + 1;
            if (newFollowUpStageNumber > 12) {
                newFollowUpStageNumber = 12;
            }

            const prospectUpdatesForCounter: { [key: string]: any } = {
                followUpStageNumber: newFollowUpStageNumber,
                updatedAt: Timestamp.now(),
            };

            const aiColorDetails = await ensureProspectDetails({
                id: prospectSnapToUpdate.id,
                name: prospectDataToUpdate.name,
                followUpStageNumber: newFollowUpStageNumber,
                currentFunnelStage: prospectDataToUpdate.currentFunnelStage,
                initialData: prospectDataToUpdate.initialData,
                colorCode: prospectDataToUpdate.colorCode,
                colorCodeReasoning: prospectDataToUpdate.colorCodeReasoning,
                userId,
            });

            if (aiColorDetails.colorCode) {
                prospectUpdatesForCounter.colorCode = aiColorDetails.colorCode;
            }
            if (aiColorDetails.colorCodeReasoning) {
                prospectUpdatesForCounter.colorCodeReasoning = aiColorDetails.colorCodeReasoning;
            }

            await updateDoc(prospectDocToUpdateRef, prospectUpdatesForCounter);
        }

        let interactionType: Interaction['type'] = 'Note';
        switch (updatedFollowUpForGamification.method) {
          case 'Call':
            interactionType = 'Call';
            break;
          case 'Email':
            interactionType = 'Email';
            break;
          case 'In-Person':
            interactionType = 'Meeting';
            break;
        }
        await addInteraction(originalFollowUpData.prospectId, {
          prospectId: originalFollowUpData.prospectId,
          date: new Date().toISOString(),
          type: interactionType,
          summary: `Completed Follow-Up: ${updatedFollowUpForGamification.notes}`,
          outcome: 'Follow-up successfully completed.',
        });
     }
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

export async function addInteraction(prospectId: string, interactionData: Omit<Interaction, 'id' | 'userId' | 'date'> & {date: string; prospectId: string;}): Promise<Interaction> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error("User not authenticated");

  const prospectDocRef = doc(db, PROSPECTS_COLLECTION, prospectId);
  const prospectSnap = await getDoc(prospectDocRef);
  if (!prospectSnap.exists() || prospectSnap.data().userId !== userId) {
    throw new Error("Prospect not found or unauthorized to add interaction.");
  }
  if (prospectSnap.data()?.isArchived === true) {
    throw new Error("Cannot add interaction to an archived prospect.");
  }


  const interactionTimestamp = Timestamp.fromDate(new Date(interactionData.date));
  const dataToSave: { [key: string]: any } = {
    prospectId: interactionData.prospectId,
    userId,
    date: interactionTimestamp,
    type: interactionData.type,
    summary: interactionData.summary,
  };

  if (interactionData.outcome && interactionData.outcome.trim() !== "") {
    dataToSave.outcome = interactionData.outcome;
  }

  const docRef = await addDoc(collection(db, INTERACTIONS_COLLECTION), dataToSave);

  await updateDoc(prospectDocRef, {
      lastContactedDate: interactionTimestamp,
      updatedAt: Timestamp.now()
    });

  return {
    ...interactionData,
    id: docRef.id,
    userId,
    date: interactionTimestamp.toDate().toISOString(),
    ...(dataToSave.outcome && { outcome: dataToSave.outcome }),
  } as Interaction;
}


export async function getGamificationStats(): Promise<GamificationStats> {
  const userId = getCurrentUserId();
  if (!userId) return { dailyProspectsAdded: 0, followUpStreak: 0, totalOnTimeFollowUps: 0, totalMissedFollowUps: 0, lastProspectAddedDate: null, lastFollowUpActivityDate: null, totalProspectsAdded: 0 };

  const statsDocRef = doc(db, GAMIFICATION_COLLECTION, userId);
  const docSnap = await getDoc(statsDocRef);

  const defaultStats: GamificationStats = { 
    dailyProspectsAdded: 0, 
    followUpStreak: 0, 
    totalOnTimeFollowUps: 0, 
    totalMissedFollowUps: 0, 
    lastProspectAddedDate: null, 
    lastFollowUpActivityDate: null, 
    totalProspectsAdded: 0 
  };

  if (docSnap.exists()) {
    const data = docSnap.data() as Partial<GamificationStats>; 
    let statsToReturn: GamificationStats = { ...defaultStats, ...data }; 

    const todayStr = new Date().toISOString().split('T')[0];
    if (statsToReturn.lastProspectAddedDate !== todayStr) {
      statsToReturn.dailyProspectsAdded = 0;
    }
    // Ensure core numeric stats are numbers
    statsToReturn.dailyProspectsAdded = Number(statsToReturn.dailyProspectsAdded || 0);
    statsToReturn.followUpStreak = Number(statsToReturn.followUpStreak || 0);
    statsToReturn.totalOnTimeFollowUps = Number(statsToReturn.totalOnTimeFollowUps || 0);
    statsToReturn.totalMissedFollowUps = Number(statsToReturn.totalMissedFollowUps || 0);
    statsToReturn.totalProspectsAdded = Number(statsToReturn.totalProspectsAdded || 0);

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
    const defaultStatsBase: GamificationStats = { dailyProspectsAdded: 0, followUpStreak: 0, totalOnTimeFollowUps: 0, totalMissedFollowUps: 0, lastProspectAddedDate: null, lastFollowUpActivityDate: null, totalProspectsAdded: 0 };
    let currentStats: GamificationStats;

    if (!statsSnap.exists()) {
      currentStats = defaultStatsBase;
    } else {
      currentStats = { ...defaultStatsBase, ...statsSnap.data() as Partial<GamificationStats> };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (currentStats.lastProspectAddedDate !== todayStr) {
      currentStats.dailyProspectsAdded = 0;
    }
    currentStats.dailyProspectsAdded = (Number(currentStats.dailyProspectsAdded || 0)) + 1;
    currentStats.lastProspectAddedDate = todayStr;
    currentStats.totalProspectsAdded = (Number(currentStats.totalProspectsAdded || 0)) + 1; 
    transaction.set(statsDocRef, currentStats, { merge: true });
  });
}

async function updateGamificationOnFollowUpComplete(originalFollowUp: FollowUp, updatedFollowUp: FollowUp) {
  const userId = getCurrentUserId();
  if (!userId) return;

  const statsDocRef = doc(db, GAMIFICATION_COLLECTION, userId);
  await runTransaction(db, async (transaction) => {
    const statsSnap = await transaction.get(statsDocRef);
    const defaultStatsBase: GamificationStats = { dailyProspectsAdded: 0, followUpStreak: 0, totalOnTimeFollowUps: 0, totalMissedFollowUps: 0, lastProspectAddedDate: null, lastFollowUpActivityDate: null, totalProspectsAdded: 0 };
    let currentStats: GamificationStats;

    if (!statsSnap.exists()) {
      currentStats = defaultStatsBase;
    } else {
      currentStats = { ...defaultStatsBase, ...statsSnap.data() as Partial<GamificationStats> };
    }

    const completedDate = new Date();
    const todayStr = completedDate.toISOString().split('T')[0];

    if (updatedFollowUp.status === 'Completed') {
      currentStats.totalOnTimeFollowUps = (Number(currentStats.totalOnTimeFollowUps || 0)) + 1;
      if (currentStats.lastFollowUpActivityDate !== todayStr) {
         currentStats.followUpStreak = (Number(currentStats.followUpStreak || 0)) + 1;
      }
      currentStats.lastFollowUpActivityDate = todayStr;
    } else if (updatedFollowUp.status === 'Missed') {
      currentStats.totalMissedFollowUps = (Number(currentStats.totalMissedFollowUps || 0)) + 1;
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

export async function hasActiveAlerts(): Promise<boolean> {
  const userId = getCurrentUserId();
  if (!userId) return false;

  const today = new Date();
  const todayISO = today.toISOString().split('T')[0];

  const followUpsQuery = query(
    collection(db, FOLLOW_UPS_COLLECTION),
    where('userId', '==', userId),
    where('status', '==', 'Pending'),
    where('date', '<=', todayISO)
  );

  const followUpsSnapshot = await getDocs(followUpsQuery);

  if (followUpsSnapshot.empty) {
    return false;
  }

  for (const fuDoc of followUpsSnapshot.docs) {
    const fuData = fuDoc.data();
    const followUpDate = parseISO(fuData.date as string);

    if (isPast(followUpDate) || isToday(followUpDate)) {
      const prospectDocRef = doc(db, PROSPECTS_COLLECTION, fuData.prospectId as string);
      const prospectSnap = await getDoc(prospectDocRef);
      if (prospectSnap.exists() && prospectSnap.data()?.isArchived !== true) {
        return true;
      }
    }
  }
  return false;
}

export async function getActiveAlertFollowUps(): Promise<AlertNotificationItem[]> {
  const userId = getCurrentUserId();
  if (!userId) return [];

  const today = new Date();
  const todayISO = today.toISOString().split('T')[0];

  const followUpsQuery = query(
    collection(db, FOLLOW_UPS_COLLECTION),
    where('userId', '==', userId),
    where('status', '==', 'Pending'),
    where('date', '<=', todayISO),
    orderBy('date', 'asc'),
    orderBy('time', 'asc')
  );

  const followUpsSnapshot = await getDocs(followUpsQuery);
  if (followUpsSnapshot.empty) {
    return [];
  }

  const alertItems: AlertNotificationItem[] = [];

  for (const fuDoc of followUpsSnapshot.docs) {
    const followUpData = fuDoc.data();
    const followUpDate = parseISO(followUpData.date as string);

    if (isPast(followUpDate) || isToday(followUpDate)) {
      const prospectDocRef = doc(db, PROSPECTS_COLLECTION, followUpData.prospectId as string);
      const prospectSnap = await getDoc(prospectDocRef);

      if (prospectSnap.exists() && prospectSnap.data()?.isArchived !== true) {
        const prospectData = prospectSnap.data() as ProspectDocData;
        const createdAtTimestamp = followUpData.createdAt as Timestamp | undefined;
        const updatedAtTimestamp = followUpData.updatedAt as Timestamp | undefined;

        alertItems.push({
          followUp: {
            id: fuDoc.id,
            userId: followUpData.userId,
            prospectId: followUpData.prospectId,
            date: followUpData.date,
            time: followUpData.time,
            method: followUpData.method,
            notes: followUpData.notes,
            status: followUpData.status,
            aiSuggestedTone: followUpData.aiSuggestedTone,
            aiSuggestedContent: followUpData.aiSuggestedContent,
            aiSuggestedTool: followUpData.aiSuggestedTool,
            createdAt: createdAtTimestamp?.toDate().toISOString() ?? new Date(0).toISOString(),
            updatedAt: updatedAtTimestamp?.toDate().toISOString(),
          } as FollowUp,
          prospectId: prospectSnap.id,
          prospectName: prospectData.name,
          prospectAvatarUrl: prospectData.avatarUrl,
          prospectColorCode: prospectData.colorCode,
        });
      }
    }
  }
  return alertItems;
}

