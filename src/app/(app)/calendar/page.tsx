
"use client";

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, Mail, Phone, User, AlertTriangle, Info, Loader2 } from "lucide-react";
import type { FollowUp, Prospect } from '@/types';
import { getUpcomingFollowUps, getProspects } from "@/lib/data"; 
import { format, parseISO, isSameDay, isPast } from "date-fns";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

const getMethodIcon = (method?: FollowUp['method']) => {
  switch(method) {
    case 'Email': return <Mail className="w-4 h-4 mr-2 text-muted-foreground" />;
    case 'Call': return <Phone className="w-4 h-4 mr-2 text-muted-foreground" />;
    case 'In-Person': return <User className="w-4 h-4 mr-2 text-muted-foreground" />;
    default: return <CalendarDays className="w-4 h-4 mr-2 text-muted-foreground" />;
  }
};

export default function CalendarPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [allFollowUps, setAllFollowUps] = useState<FollowUp[]>([]);
  const [prospectsMap, setProspectsMap] = useState<Map<string, Prospect>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        // Fetch follow-ups for a long period, e.g., 1 year (365 days)
        // getUpcomingFollowUps should ideally fetch ALL pending follow-ups for the user,
        // or be adapted to fetch for a very wide range.
        // For Firestore, this might mean querying all follow-ups for the user.
        const fuData = await getUpcomingFollowUps(365 * 5); // Fetch for 5 years to get most FUs
        const pData = await getProspects(); // Fetches prospects for the current user
        
        setAllFollowUps(fuData);
        const map = new Map<string, Prospect>();
        pData.forEach(p => map.set(p.id, p));
        setProspectsMap(map);
      } catch (error) {
        console.error("Failed to load calendar data:", error);
        // Add toast notification for error
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [user]);

  const followUpDays = useMemo(() => {
    return allFollowUps.map(fu => parseISO(fu.date));
  }, [allFollowUps]);

  const followUpsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return allFollowUps.filter(fu => isSameDay(parseISO(fu.date), selectedDate))
                       .sort((a,b) => a.time.localeCompare(b.time));
  }, [selectedDate, allFollowUps]);

  const calendarModifiers = { 
    hasFollowUp: followUpDays,
    ...(selectedDate && {selectedDay: selectedDate})
  };
  const calendarModifiersStyles = {
    hasFollowUp: { 
      fontWeight: 'bold',
      border: "2px solid hsl(var(--primary))",
      borderRadius: 'var(--radius)',
    },
    selectedDay: {
      backgroundColor: 'hsl(var(--primary))',
      color: 'hsl(var(--primary-foreground))',
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading calendar...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please log in to view your calendar.</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-7 w-7 text-primary" />
            <CardTitle className="text-3xl font-bold font-headline">Calendar</CardTitle>
          </div>
          <CardDescription>View your scheduled follow-ups. Dates with follow-ups are highlighted.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-1/2 flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border shadow-md p-0"
              modifiers={calendarModifiers}
              modifiersStyles={calendarModifiersStyles}
              disabled={isLoading}
            />
          </div>
          <div className="lg:w-1/2 space-y-4">
            <h3 className="text-xl font-semibold font-headline">
              {selectedDate ? `Follow-Ups for ${format(selectedDate, "PPP")}` : "Select a date to view follow-ups"}
            </h3>
            {followUpsForSelectedDate.length > 0 ? (
              <ul className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {followUpsForSelectedDate.map(fu => {
                  const prospect = prospectsMap.get(fu.prospectId);
                  const isOverdue = isPast(parseISO(fu.date)) && !isSameDay(parseISO(fu.date), new Date()) && fu.status === 'Pending';
                  return (
                    <li key={fu.id} className={cn("p-3 border rounded-lg shadow-sm hover:shadow-md transition-shadow", isOverdue && "border-destructive bg-destructive/10")}>
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 border mt-1">
                           <AvatarImage src={prospect?.avatarUrl || `https://placehold.co/40x40.png?text=${prospect?.name?.charAt(0) || 'P'}`} alt={prospect?.name} data-ai-hint="person face" />
                           <AvatarFallback>{prospect?.name?.charAt(0) || 'P'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <h4 className="font-semibold text-md">{prospect?.name || 'Unknown Prospect'}</h4>
                             <Badge variant={isOverdue ? "destructive" : "outline"} className="text-xs">{isOverdue ? "Overdue" : fu.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center">
                            {getMethodIcon(fu.method)}
                            {fu.method} at {fu.time}
                          </p>
                          <p className="text-sm mt-1">{fu.notes}</p>
                           {fu.aiSuggestedContent && (
                            <p className="text-xs mt-1 italic text-primary">AI: {fu.aiSuggestedContent.substring(0,50)}...</p>
                           )}
                        </div>
                        <Button variant="outline" size="sm" asChild className="shrink-0">
                           <Link href={`/prospects/${fu.prospectId}`}>View</Link>
                        </Button>
                      </div>
                      {isOverdue && <p className="text-xs text-destructive mt-1 flex items-center"><AlertTriangle className="w-3 h-3 mr-1"/>This follow-up is overdue.</p>}
                    </li>
                  );
                })}
              </ul>
            ) : selectedDate ? (
              <div className="text-center py-6 text-muted-foreground">
                 <Info className="mx-auto h-8 w-8 mb-2" />
                <p>No follow-ups scheduled for this day.</p>
              </div>
            ) : (
                 <div className="text-center py-6 text-muted-foreground">
                 <Info className="mx-auto h-8 w-8 mb-2" />
                <p>Select a date from the calendar to see scheduled follow-ups.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
