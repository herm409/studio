
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Construction, Loader2, Edit3 } from "lucide-react";
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { storage, auth } from '@/lib/firebase'; // Import storage and auth
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from 'firebase/auth';
import { updateUserFirestoreProfile } from '@/lib/data';

export default function SettingsPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setEmail(user.email || '');
      setPhotoURL(user.photoURL || `https://placehold.co/100x100.png?text=${(user.displayName || user.email || "U").charAt(0)}`);
      setPhotoPreview(user.photoURL || `https://placehold.co/100x100.png?text=${(user.displayName || user.email || "U").charAt(0)}`);
    }
  }, [user]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setNewPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      let newPhotoDownloadURL = user.photoURL;

      if (newPhotoFile) {
        const imageRef = storageRef(storage, `profilePictures/${user.uid}/${newPhotoFile.name}`);
        await uploadBytes(imageRef, newPhotoFile);
        newPhotoDownloadURL = await getDownloadURL(imageRef);
      }
      
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser!, {
        displayName: displayName,
        photoURL: newPhotoDownloadURL,
      });

      // Update Firestore profile document
      await updateUserFirestoreProfile(user.uid, {
        displayName: displayName,
        photoURL: newPhotoDownloadURL,
      });
      
      setPhotoURL(newPhotoDownloadURL); // Update local state for current photo
      await refreshUser(); // Refresh user state in AuthContext

      toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({ title: "Error", description: error.message || "Failed to update profile.", variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
      setNewPhotoFile(null); // Reset file input state
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Settings</h1>
        <p className="text-muted-foreground">Manage your application preferences and account details.</p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Profile Information</CardTitle>
          <CardDescription>Update your personal details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-6">
            <div className="relative group">
                <Avatar className="h-24 w-24 border-2 border-primary cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <AvatarImage src={photoPreview || undefined} alt={displayName || "User"} data-ai-hint="user avatar" />
                    <AvatarFallback className="text-3xl">{(displayName || email || "U").charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div 
                    className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Edit3 className="h-8 w-8 text-white" />
                </div>
            </div>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <div className="flex-1 space-y-1">
                <p className="text-sm text-muted-foreground">Click image to change profile picture.</p>
                {newPhotoFile && <p className="text-xs text-accent">New photo: {newPhotoFile.name}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={email} disabled />
            </div>
          </div>
          
          <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
            {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Profile Changes
          </Button>
        </CardContent>
      </Card>

      <Separator />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Notification Preferences</CardTitle>
          <CardDescription>Choose how you want to be notified.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="emailNotifications" defaultChecked />
            <Label htmlFor="emailNotifications">Email notifications for upcoming follow-ups</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="inAppNotifications" defaultChecked />
            <Label htmlFor="inAppNotifications">In-app notifications for mentions and tasks</Label>
          </div>
           <div className="flex items-center space-x-2">
            <Checkbox id="gamificationNotifications" />
            <Label htmlFor="gamificationNotifications">Gamification milestone notifications</Label>
          </div>
          <Button disabled>Save Preferences</Button>
        </CardContent>
      </Card>
      
      <Separator />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Funnel Stages &amp; Calendar</CardTitle>
          <CardDescription>Customization options (coming soon).</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-10">
          <Construction className="mx-auto h-12 w-12 mb-4" />
          <p>Custom Funnel Stage management and Calendar Integration settings will be available here in a future update.</p>
        </CardContent>
      </Card>
    </div>
  );
}
