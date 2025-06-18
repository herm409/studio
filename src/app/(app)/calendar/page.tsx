
"use client";

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, Mail, Phone, User, AlertTriangle, Info, Loader2, CheckCircle, XCircle, Edit2, Trash2 } from "lucide-react";
import type { FollowUp, Prospect } from '@/types';
import { getUpcomingFollowUps, getProspects, updateFollowUp as serverUpdateFollowUp, deleteFollowUp as serverDeleteFollowUp } from "@/lib/data"; 
import { format, parseISO, isSameDay, isPast, isToday, isFuture } from "date-fns";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
// Note: FollowUpItem is not used here anymore, logic is inlined or adapted.
// If FollowUpModal for editing is needed, it should be imported and managed.

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
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(); 
  const [allFollowUps, setAllFollowUps] = useState<FollowUp[]>([]);
  const [prospectsMap, setProspectsMap] = useState<Map<string, Prospect>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  // State for managing editing follow-up if edit functionality is added back
  // const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);
  // const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);


  const fetchCalendarData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const fuData = await getUpcomingFollowUps(365 * 5); 
        const pData = await getProspects(); 
        
        setAllFollowUps(fuData.sort((a,b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()));
        const map = new Map<string, Prospect>();
        pData.forEach(p => map.set(p.id, p));
        setProspectsMap(map);
      } catch (error) {
        console.error("Failed to load calendar data:", error);
        toast({ title: "Error", description: "Failed to load calendar data.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

  useEffect(() => {
    fetchCalendarData();
  }, [user]);

  useEffect(() => {
    setSelectedDate(new Date());
  }, []); 

  const followUpDays = useMemo(() => {
    return allFollowUps.filter(fu => fu.status === 'Pending').map(fu => parseISO(fu.date));
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

  const handleFollowUpStatusChange = async (followUpId: string, status: FollowUp['status']) => {
    try {
      await serverUpdateFollowUp(followUpId, { status }); 
      toast({ title: "Success", description: `Follow-up marked as ${status}.` });
      fetchCalendarData(); // Refetch all data
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update follow-up status.", variant: "destructive" });
    }
  };

  const handleDeleteFollowUp = async (followUpId: string) => {
    try {
      await serverDeleteFollowUp(followUpId);
      toast({ title: "Success", description: "Follow-up deleted." });
      fetchCalendarData(); // Refetch all data
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete follow-up.", variant: "destructive" });
    }
  };
  
  // const handleEditFollowUp = (followUp: FollowUp) => {
  //   // Logic to open edit modal - needs FollowUpForm and Dialog state
  //   // setEditingFollowUp(followUp);
  //   // setIsFollowUpModalOpen(true);
  //   toast({title: "Info", description: "Edit functionality to be implemented here."})
  // };


  if (isLoading && !selectedDate) { 
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
            <CardTitle className="text-2xl sm:text-3xl font-bold font-headline">Calendar</CardTitle>
          </div>
          <CardDescription>View your scheduled follow-ups. Dates with pending follow-ups are highlighted.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-1/2 flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border shadow-md p-0 w-full max-w-md"
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
                  const now = new Date();
                  const followUpDateTime = new Date(`${fu.date}T${fu.time}`);

                  let displayStatusText = fu.status;
                  let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline";
                  let itemClasses = "border";
                  let statusIcon = null;

                  if (fu.status === 'Pending') {
                    if (followUpDateTime < now) {
                      displayStatusText = 'Overdue';
                      badgeVariant = 'destructive';
                      itemClasses = "border-destructive bg-destructive/10";
                      statusIcon = <AlertTriangle className="w-4 h-4 mr-1 text-destructive shrink-0" />;
                    } else {
                      const hoursDiff = (followUpDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
                      if (isToday(followUpDateTime) && hoursDiff <= 3 && hoursDiff >= 0) {
                        displayStatusText = 'Due Soon';
                        badgeVariant = 'default'; // Using 'default' (primary) for due soon, could be 'accent' (teal)
                        itemClasses = "border-primary bg-primary/10"; // Was accent
                        statusIcon = <Clock className="w-4 h-4 mr-1 text-primary shrink-0" />; // Was accent
                      } else if (isToday(followUpDateTime)) {
                        displayStatusText = 'Today';
                        badgeVariant = 'default'; // Using 'default' (primary) for today
                        itemClasses = "border-primary bg-primary/10";
                        statusIcon = <Clock className="w-4 h-4 mr-1 text-primary shrink-0" />;
                      } else {
                        displayStatusText = 'Pending';
                        badgeVariant = 'secondary';
                      }
                    }
                  } else if (fu.status === 'Completed') {
                    displayStatusText = 'Completed';
                    badgeVariant = 'secondary'; // Using secondary for completed
                    itemClasses = "border-green-500 bg-green-500/10 opacity-80";
                    statusIcon = <CheckCircle className="w-4 h-4 mr-1 text-green-600 shrink-0" />;
                  } else if (fu.status === 'Missed') {
                    displayStatusText = 'Missed';
                    badgeVariant = 'destructive';
                    itemClasses = "border-destructive bg-destructive/10 opacity-80";
                    statusIcon = <XCircle className="w-4 h-4 mr-1 text-destructive shrink-0" />;
                  }

                  return (
                    <li key={fu.id} className={cn("p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow", itemClasses)}>
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 border mt-1">
                           <AvatarImage src={prospect?.avatarUrl || `https://placehold.co/40x40.png?text=${prospect?.name?.charAt(0) || 'P'}`} alt={prospect?.name} data-ai-hint="person face" />
                           <AvatarFallback>{prospect?.name?.charAt(0) || 'P'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <h4 className="font-semibold text-md flex items-center">
                                {statusIcon}
                                {prospect?.name || 'Unknown Prospect'}
                            </h4>
                             <Badge variant={badgeVariant} className="text-xs">{displayStatusText}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center">
                            {getMethodIcon(fu.method)}
                            {fu.method} at {fu.time}
                          </p>
                          <p className="text-sm mt-1 break-words">{fu.notes}</p>
                           {fu.aiSuggestedContent && (
                            <p className="text-xs mt-1 italic text-primary break-words">AI: {fu.aiSuggestedContent.substring(0,50)}...</p>
                           )}
                           <div className="mt-2 flex flex-wrap gap-2">
                                {fu.status === 'Pending' && (
                                    <>
                                        <Button size="xs" variant="outline" className="text-green-600 border-green-500 hover:bg-green-500/20" onClick={() => handleFollowUpStatusChange(fu.id, 'Completed')}>
                                            <CheckCircle className="w-3 h-3 mr-1" /> Mark Completed
                                        </Button>
                                        <Button size="xs" variant="outline" className="text-red-600 border-red-500 hover:bg-red-500/20" onClick={() => handleFollowUpStatusChange(fu.id, 'Missed')}>
                                            <XCircle className="w-3 h-3 mr-1" /> Mark Missed
                                        </Button>
                                    </>
                                )}
                                {/* <Button size="xs" variant="ghost" onClick={() => handleEditFollowUp(fu)}>
                                    <Edit2 className="w-3 h-3 mr-1" /> Edit
                                </Button> */}
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button size="xs" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete this follow-up.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteFollowUp(fu.id)} className="bg-destructive hover:bg-destructive/90">
                                            Yes, delete
                                        </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                           </div>
                        </div>
                        <Button variant="outline" size="sm" asChild className="shrink-0">
                           <Link href={`/prospects/${fu.prospectId}`}>View</Link>
                        </Button>
                      </div>
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
