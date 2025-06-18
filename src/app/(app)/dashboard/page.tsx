
import { UpcomingFollowUps } from "@/components/dashboard/UpcomingFollowUps";
import { getUpcomingFollowUps, getProspects, getGamificationStats } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Award, Target, TrendingUp, Trophy } from "lucide-react";

export default async function DashboardPage() {
  const upcomingFollowUpsData = await getUpcomingFollowUps(7);
  const prospectsData = await getProspects();
  // Gamification stats are client-side due to localStorage. We'll handle display on client if needed, or pass defaults.
  // For a server component, we can only show placeholders or general info.
  // Let's make a client component for gamification overview or show static goals.

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
                <span className="text-sm font-medium">Daily Prospect Goal (2)</span> 
                <span className="text-sm text-primary font-semibold">0 / 2</span>
              </div>
              <Progress value={0} aria-label="Daily prospect goal progress" />
              <p className="text-xs text-muted-foreground mt-1">Add 2 new prospects today!</p>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Follow-Up Streak</span>
                <span className="text-sm text-primary font-semibold">0 Days</span>
              </div>
              <Progress value={0} aria-label="Follow-up streak" className="[&>*]:bg-accent" />
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
