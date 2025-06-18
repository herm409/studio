
"use client";
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Award, CalendarCheck, CheckCircle, Repeat, Star, Target, Trophy, Zap, Users } from "lucide-react";
import type { GamificationStats } from '@/types';
import { getGamificationStats } from '@/lib/data'; 
import { useAuth } from '@/context/AuthContext';

const DAILY_PROSPECT_GOAL = 5;
const STREAK_MILESTONES = [5, 10, 25, 50, 100];

export default function GamificationPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setLoading(true);
      getGamificationStats().then(loadedStats => {
        setStats(loadedStats);
        setLoading(false);
      }).catch(error => {
        console.error("Error fetching gamification stats:", error);
        setLoading(false);
        // Optionally, show a toast or error message to the user
      });
    } else {
      setLoading(false); // Not logged in, no stats to load
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Trophy className="h-12 w-12 animate-bounce text-primary" />
        <p className="ml-4 text-xl text-muted-foreground">Loading your achievements...</p>
      </div>
    );
  }

  if (!user) {
     return (
      <div className="flex justify-center items-center h-64">
        <Trophy className="h-12 w-12 text-muted-foreground" />
        <p className="ml-4 text-xl text-muted-foreground">Please log in to view gamification stats.</p>
      </div>
    );
  }
  
  if (!stats) {
     return (
      <div className="flex justify-center items-center h-64">
        <Trophy className="h-12 w-12 text-muted-foreground" />
        <p className="ml-4 text-xl text-muted-foreground">No gamification data available yet.</p>
      </div>
    );
  }


  const dailyProspectProgress = Math.min((stats.dailyProspectsAdded / DAILY_PROSPECT_GOAL) * 100, 100);
  const nextStreakMilestone = STREAK_MILESTONES.find(m => m > stats.followUpStreak) || STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
  const streakProgress = Math.min((stats.followUpStreak / nextStreakMilestone) * 100, 100);

  return (
    <div className="space-y-8">
      <header className="text-center">
        <Trophy className="mx-auto h-16 w-16 text-yellow-500 mb-2" />
        <h1 className="text-4xl font-bold font-headline text-primary">Your Gamification Hub</h1>
        <p className="text-lg text-muted-foreground mt-1">Track your progress, build streaks, and unlock achievements!</p>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-xl font-headline">
              <Target className="mr-2 h-6 w-6 text-red-500" /> Daily Prospect Goal
            </CardTitle>
            <CardDescription>Add {DAILY_PROSPECT_GOAL} new prospects today.</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={dailyProspectProgress} className="h-4 mb-2" aria-label={`Daily prospect goal: ${stats.dailyProspectsAdded} of ${DAILY_PROSPECT_GOAL}`} />
            <p className="text-2xl font-bold text-primary text-center">
              {stats.dailyProspectsAdded} / {DAILY_PROSPECT_GOAL}
            </p>
             {stats.dailyProspectsAdded >= DAILY_PROSPECT_GOAL && (
              <p className="text-sm text-green-600 text-center mt-1 flex items-center justify-center"><CheckCircle className="w-4 h-4 mr-1"/>Goal Achieved Today!</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-xl font-headline">
              <Repeat className="mr-2 h-6 w-6 text-blue-500" /> Follow-Up Streak
            </CardTitle>
            <CardDescription>Consecutive days with on-time follow-ups.</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={streakProgress} className="h-4 mb-2 [&>*]:bg-blue-500" aria-label={`Follow-up streak: ${stats.followUpStreak} days, next milestone ${nextStreakMilestone} days`} />
            <p className="text-2xl font-bold text-blue-500 text-center">
              {stats.followUpStreak} Days
            </p>
            <p className="text-xs text-muted-foreground text-center mt-1">Next milestone: {nextStreakMilestone} days</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-xl font-headline">
              <CalendarCheck className="mr-2 h-6 w-6 text-green-500" /> Follow-Up Score
            </CardTitle>
            <CardDescription>Your on-time vs. missed follow-ups.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-2xl font-bold text-green-500">{stats.totalOnTimeFollowUps} <span className="text-sm font-normal">On-Time</span></p>
            <p className="text-lg text-red-500">{stats.totalMissedFollowUps} <span className="text-sm font-normal">Missed</span></p>
            { (stats.totalOnTimeFollowUps + stats.totalMissedFollowUps > 0) &&
              <p className="text-xs text-muted-foreground mt-1">
                Success Rate: {((stats.totalOnTimeFollowUps / (stats.totalOnTimeFollowUps + stats.totalMissedFollowUps)) * 100).toFixed(0)}%
              </p>
            }
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline">
            <Award className="mr-2 h-7 w-7 text-purple-500" /> Achievements
          </CardTitle>
          <CardDescription>Milestones you've unlocked.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { title: "First Prospect", icon: Star, achieved: stats.totalOnTimeFollowUps > 0 || stats.totalMissedFollowUps > 0 || stats.dailyProspectsAdded > 0 }, // Simplified condition for demo
              { title: "5 Day Streak", icon: Zap, achieved: stats.followUpStreak >= 5 },
              { title: "Perfect Day", icon: CheckCircle, achieved: stats.dailyProspectsAdded >= DAILY_PROSPECT_GOAL },
              { title: "10 Prospects Added", icon: Users, achieved: false }, // Placeholder, would need total prospect count
              { title: "Power Hour", icon: Zap, achieved: false },
              { title: "Consistent Closer", icon: Trophy, achieved: stats.followUpStreak >= 25 },
            ].map(ach => (
              <div key={ach.title} className={`p-4 rounded-lg border-2 flex flex-col items-center text-center transition-all duration-300 ${ach.achieved ? 'border-yellow-500 bg-yellow-500/10 shadow-md' : 'border-gray-300 bg-gray-100 opacity-60'}`}>
                <ach.icon className={`h-10 w-10 mb-2 ${ach.achieved ? 'text-yellow-600' : 'text-gray-400'}`} />
                <h3 className={`font-semibold ${ach.achieved ? 'text-yellow-700' : 'text-gray-500'}`}>{ach.title}</h3>
                {ach.achieved && <p className="text-xs text-yellow-600">Unlocked!</p>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
