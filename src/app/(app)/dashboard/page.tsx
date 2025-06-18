
import { UpcomingFollowUps } from "@/components/dashboard/UpcomingFollowUps";
import { getUpcomingFollowUps, getProspects, getGamificationStats } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, Trophy } from "lucide-react";
import type { GamificationStats } from "@/types";

export const dynamic = 'force-dynamic'; // Ensures the page is re-rendered on every request

const DAILY_PROSPECT_GOAL = 2; // Consistent with gamification page

export default async function DashboardPage() {
  const upcomingFollowUpsData = await getUpcomingFollowUps(7);
  const prospectsData = await getProspects();
  const gamificationStats: GamificationStats = await getGamificationStats();

  const dailyProspectProgress = Math.min((gamificationStats.dailyProspectsAdded / DAILY_PROSPECT_GOAL) * 100, 100);
  // For streak, we might need to define milestones or just show current streak.
  // For simplicity, let's assume a generic progress or just the number.
  // The gamification page has more detailed streak logic. Here, we'll just show the streak value.

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
              {/* 
                Simple progress for streak might not be meaningful without a target.
                Displaying the number is clearer. For a visual, we could use a static bar or icons.
                Let's keep the progress bar but acknowledge it might not be the best visual for a streak without a defined "next milestone" easily available here.
                The GamificationPage has more complex streak milestone logic.
              */}
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
