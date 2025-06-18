
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  Auth, 
  User, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import { auth } from '@/lib/firebase'; 
import { ensureUserProfileDocument } from '@/lib/data';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, pass: string) => Promise<User | null>;
  signIn: (email: string, pass: string) => Promise<User | null>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>; // To refresh user state after profile updates
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await ensureUserProfileDocument(currentUser);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const refreshUser = async () => {
    setLoading(true);
    if (auth.currentUser) {
      await auth.currentUser.reload(); // Fetches the latest user data from Firebase Auth
      const refreshedUser = auth.currentUser; // Get the reloaded user
      setUser(refreshedUser); // Update state
       if (refreshedUser) {
        await ensureUserProfileDocument(refreshedUser); // Ensure Firestore doc is also up-to-date/exists
      }
    }
    setLoading(false);
  };


  const signUp = async (email: string, pass: string): Promise<User | null> => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      // Set a default display name if not set
      if (userCredential.user && !userCredential.user.displayName) {
        const defaultDisplayName = email.split('@')[0];
        await updateProfile(userCredential.user, { displayName: defaultDisplayName });
      }
      // ensureUserProfileDocument will be called by onAuthStateChanged
      setUser(userCredential.user); 
      return userCredential.user;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, pass: string): Promise<User | null> => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      // ensureUserProfileDocument will be called by onAuthStateChanged
      setUser(userCredential.user);
      return userCredential.user;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // The problematic loader that caused hydration error has been removed from here.
  // Loading states should be handled by consuming components like AuthenticatedLayout or individual pages.

  return (
    <AuthContext.Provider value={{ user, loading, error, signUp, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
