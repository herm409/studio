
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore"; // Changed type import
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log('[Firebase] Attempting to initialize Firebase with config:');
console.log(`[Firebase] Project ID: ${firebaseConfig.projectId}`);
console.log(`[Firebase] Auth Domain: ${firebaseConfig.authDomain}`);
console.log(`[Firebase] Storage Bucket: ${firebaseConfig.storageBucket}`);

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('[Firebase] CRITICAL ERROR: Firebase API Key or Project ID is missing in the environment configuration. Firebase will not initialize correctly.');
  // Optionally, throw an error to prevent the app from starting in a misconfigured state.
  // throw new Error('[Firebase] FATAL: Firebase configuration (API Key or Project ID) is missing.');
}

let app: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore; // Corrected type
let storageInstance: FirebaseStorage;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log('[Firebase] Firebase app initialized successfully.');
  } else {
    app = getApp();
    console.log('[Firebase] Existing Firebase app retrieved.');
  }

  authInstance = getAuth(app);
  console.log('[Firebase] Firebase Auth initialized.');
  dbInstance = getFirestore(app);
  console.log('[Firebase] Firestore initialized.');
  storageInstance = getStorage(app);
  console.log('[Firebase] Firebase Storage initialized.');

} catch (error: any) {
  console.error('[Firebase] CRITICAL ERROR: Failed to initialize Firebase services.');
  console.error(error);
  // Re-throw the error or handle as appropriate for your app's startup.
  // For now, re-throwing will make sure the server fails loudly if Firebase can't init.
  throw new Error(`[Firebase] FATAL: Firebase initialization failed. Original error: ${error.message}`);
}

export { app, authInstance as auth, dbInstance as db, storageInstance as storage };
