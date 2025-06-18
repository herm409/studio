
import { UpcomingFollowUps } from "@/components/dashboard/UpcomingFollowUps";
import { getUpcomingFollowUps, getProspects, getGamificationStats, getAccountabilitySummaryData } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Target, Trophy, Share2, Send } from "lucide-react";
import type { GamificationStats, AccountabilitySummaryData } from "@/types";
import Link from "next/link"; // Added for potential future links, not strictly needed for SMS

export const dynamic = 'force-dynamic'; 

const DAILY_PROSPECT_GOAL = 2; 

export default async function DashboardPage() {
  const upcomingFollowUpsData = await getUpcomingFollowUps(7);
  const prospectsData = await getProspects();
  const gamificationStats: GamificationStats = await getGamificationStats();
  const accountabilityData: AccountabilitySummaryData = await getAccountabilitySummaryData();

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
        <UpcomingFollowUps followUps={upcomingFollowUpsData} prospects={prospectsData} />
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
                <p className="text-sm text-muted-foreground">More detailed stats on the <a href="/gamification" className="text-primary hover:underline">Gamification page</a>.</p>
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
              <li>Reach out to 2 "cold" prospects.</li>
              <li>Prepare materials for upcoming demos.</li>
              <li>Review notes for 3 "warm" leads.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
