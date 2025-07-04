
"use client";

import { useEffect, useState } from 'react';
import { UpcomingFollowUps } from "@/components/dashboard/UpcomingFollowUps";
import { getUpcomingFollowUps, getProspects, getGamificationStats, getAccountabilitySummaryData } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Target, Trophy, Share2, Send, Loader2 } from "lucide-react"; // Added Loader2
import type { FollowUp, Prospect, GamificationStats, AccountabilitySummaryData } from "@/types";
import Link from "next/link";
import { useAuth } from '@/context/AuthContext'; // Import useAuth

// export const dynamic = 'force-dynamic'; // No longer needed for client component data fetching pattern

const DAILY_PROSPECT_GOAL = 2; 

export default function DashboardPage() {
  const { user } = useAuth();
  const [upcomingFollowUpsData, setUpcomingFollowUpsData] = useState<FollowUp[]>([]);
  const [prospectsData, setProspectsData] = useState<Prospect[]>([]);
  const [gamificationStats, setGamificationStats] = useState<GamificationStats | null>(null);
  const [accountabilityData, setAccountabilityData] = useState<AccountabilitySummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadDashboardData() {
    if (!user) {
      setIsLoading(false); // Stop loading if no user, though layout should prevent this page
      return;
    }
    setIsLoading(true);
    try {
      const [fuData, pData, gsData, adData] = await Promise.all([
        getUpcomingFollowUps(7),
        getProspects(),
        getGamificationStats(),
        getAccountabilitySummaryData()
      ]);
      setUpcomingFollowUpsData(fuData);
      setProspectsData(pData);
      setGamificationStats(gsData);
      setAccountabilityData(adData);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      // Optionally, show a toast notification
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, [user]); // Reload data if user changes

  if (isLoading || !gamificationStats || !accountabilityData) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-150px)]"> {/* Adjust height as needed */}
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  const dailyProspectProgress = Math.min((gamificationStats.dailyProspectsAdded / DAILY_PROSPECT_GOAL) * 100, 100);
  
  const accountabilitySummaryText = `Here's my Follow-Up Flow activity for the last 2 weeks:
- New Prospects: ${accountabilityData.newProspectsLast14Days}
- Follow-ups Done: ${accountabilityData.followUpsCompletedLast14Days}
- Notes Logged: ${accountabilityData.interactionsLoggedLast14Days}
- Current Streak: ${accountabilityData.currentFollowUpStreak} days

Any tips for improvement?`;

  const encodedSummaryText = encodeURIComponent(accountabilitySummaryText);
  const smsLink = `sms:?body=${encodedSummaryText}`;

  return (
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <UpcomingFollowUps 
          followUps={upcomingFollowUpsData} 
          prospects={prospectsData}
          onFollowUpUpdated={loadDashboardData} // Pass the refresh function
        />
      </div>
      <div className="lg:col-span-1 space-y-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center">
              <Trophy className="mr-2 h-6 w-6 text-yellow-500" />
              Gamification Snapshot
            </CardTitle>
            <CardDescription>Your progress and streaks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Daily Prospect Goal ({DAILY_PROSPECT_GOAL})</span> 
                <span className="text-sm text-primary font-semibold">
                  {gamificationStats.dailyProspectsAdded} / {DAILY_PROSPECT_GOAL}
                </span>
              </div>
              <Progress value={dailyProspectProgress} aria-label="Daily prospect goal progress" />
              <p className="text-xs text-muted-foreground mt-1">
                {gamificationStats.dailyProspectsAdded >= DAILY_PROSPECT_GOAL 
                  ? "Goal achieved for today!" 
                  : `Add ${DAILY_PROSPECT_GOAL - gamificationStats.dailyProspectsAdded} more prospects today!`}
              </p>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Follow-Up Streak</span>
                <span className="text-sm text-primary font-semibold">
                  {gamificationStats.followUpStreak} Day{gamificationStats.followUpStreak === 1 ? "" : "s"}
                </span>
              </div>
              <Progress value={(gamificationStats.followUpStreak / 5) * 100} aria-label="Follow-up streak" className="[&>*]:bg-accent" />
              <p className="text-xs text-muted-foreground mt-1">Keep your follow-up streak going!</p>
            </div>
             <div className="text-center">
                <p className="text-sm text-muted-foreground">More detailed stats on the <Link href="/gamification" className="text-primary hover:underline">Gamification page</Link>.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center">
              <Share2 className="mr-2 h-6 w-6 text-blue-500" />
              Accountability Update
            </CardTitle>
            <CardDescription>Share your progress with your partner.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Summary for the last 2 weeks:
            </p>
            <ul className="text-xs list-disc list-inside pl-2 space-y-0.5">
                <li>New Prospects: {accountabilityData.newProspectsLast14Days}</li>
                <li>Follow-ups Done: {accountabilityData.followUpsCompletedLast14Days}</li>
                <li>Notes Logged: {accountabilityData.interactionsLoggedLast14Days}</li>
                <li>Current Streak: {accountabilityData.currentFollowUpStreak} days</li>
            </ul>
             <Button asChild className="w-full mt-2">
              <a href={smsLink}>
                <Send className="mr-2 h-4 w-4" /> Send via Text Message
              </a>
            </Button>
            <p className="text-xs text-muted-foreground text-center pt-1">Opens your default SMS app.</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center">
              <Target className="mr-2 h-6 w-6 text-red-500" />
              Focus Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Review your <strong>Dashboard</strong> for upcoming and overdue follow-ups.</li>
              <li>Advance a prospect: Try moving someone from 'Pique Interest' to 'Full Presentation' or from 'Presentation' to an 'Expert Call'.</li>
              <li>Check your <strong>Prospect List</strong> for anyone missing a <code>Next Follow-Up Date</code> and schedule one.</li>
              <li>Engage a 'fresh' prospect (low <code>Follow-Up Stage Number</code>) today.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
