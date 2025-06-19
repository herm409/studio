
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Log Firebase configuration for debugging (excluding sensitive parts if necessary)
console.log('[Firebase] Attempting to initialize Firebase with config:');
console.log(`[Firebase] Project ID: ${firebaseConfig.projectId}`);
console.log(`[Firebase] Auth Domain: ${firebaseConfig.authDomain}`);
console.log(`[Firebase] Storage Bucket: ${firebaseConfig.storageBucket}`);
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('[Firebase] CRITICAL ERROR: Firebase API Key or Project ID is missing in the environment configuration. Firebase will not initialize correctly.');
}

let app: FirebaseApp;
let authInstance: import("firebase/auth").Auth;
let dbInstance: import("firebase/firestore").FirebaseFirestore;
let storageInstance: import("firebase/storage").FirebaseStorage;

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

} catch (error) {
  console.error('[Firebase] CRITICAL ERROR: Failed to initialize Firebase services. This is likely the cause of server startup failure.');
  console.error(error);
  // Depending on the severity, you might want to rethrow or handle differently
  // For now, we'll let the app try to continue, but services will be broken.
  // This helps isolate if Firebase init is THE blocker for server start.
  // @ts-ignore
  app = null; 
  // @ts-ignore
  authInstance = null;
  // @ts-ignore
  dbInstance = null;
  // @ts-ignore
  storageInstance = null;
}

export { app, authInstance as auth, dbInstance as db, storageInstance as storage };
