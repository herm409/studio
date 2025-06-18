
"use client";
import type { FollowUp, Prospect } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CalendarClock, Mail, Phone, AlertTriangle, CheckCircle, User, ArrowRight, MessageSquareText } from 'lucide-react';
import Link from 'next/link';
import { format, parseISO, isToday, isTomorrow, isPast, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { ColorCodedIndicator } from '@/components/shared/ColorCodedIndicator';

interface UpcomingFollowUpsProps {
  followUps: FollowUp[];
  prospects: Prospect[];
}

export function UpcomingFollowUps({ followUps, prospects }: UpcomingFollowUpsProps) {
  if (followUps.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl sm:text-2xl">Upcoming Follow-Ups</CardTitle>
          <CardDescription>No tasks for the next 7 days. Time to plan!</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No upcoming follow-ups scheduled.</p>
        </CardContent>
      </Card>
    );
  }

  const getProspect = (prospectId: string) => {
    return prospects.find(p => p.id === prospectId);
  };

  const getUrgencyStyles = (dateStr: string) => {
    if (!isValid(parseISO(dateStr))) return "border-gray-300";
    const date = parseISO(dateStr);
    if (isPast(date) && !isToday(date)) return "border-destructive text-destructive";
    if (isToday(date)) return "border-yellow-500 text-yellow-600";
    if (isTomorrow(date)) return "border-blue-500 text-blue-600";
    return "border-gray-300";
  };

  const getUrgencyIcon = (dateStr: string) => {
    if (!isValid(parseISO(dateStr))) return null;
    const date = parseISO(dateStr);
    if (isPast(date) && !isToday(date)) return <AlertTriangle className="w-4 h-4 mr-1 text-destructive" />;
    if (isToday(date)) return <AlertTriangle className="w-4 h-4 mr-1 text-yellow-500" />;
    return null;
  };
  
  const getMethodIcon = (method?: FollowUp['method']) => {
    switch(method) {
      case 'Email': return <Mail className="w-4 h-4 text-muted-foreground" />;
      case 'Call': return <Phone className="w-4 h-4 text-muted-foreground" />;
      case 'In-Person': return <User className="w-4 h-4 text-muted-foreground" />;
      default: return <CalendarClock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl sm:text-2xl">Upcoming Follow-Ups</CardTitle>
        <CardDescription>Tasks for the next 7 days, sorted by urgency.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {followUps.map(fu => {
            const prospect = getProspect(fu.prospectId);
            const prospectName = prospect ? prospect.name : 'Unknown Prospect';
            const prospectAvatar = prospect?.avatarUrl || `https://placehold.co/40x40.png?text=${prospectName.charAt(0)}`;
            const prospectColorCode = prospect?.colorCode;
            const prospectPhone = prospect?.phone;

            return (
              <Card key={fu.id} className={cn("p-4 hover:shadow-md transition-shadow", getUrgencyStyles(fu.date))}>
                <div className="flex flex-col sm:flex-row items-start sm:space-x-4 gap-3 sm:gap-0">
                  <Avatar className="h-10 w-10 border shrink-0">
                    <AvatarImage src={prospectAvatar} alt={prospectName} data-ai-hint="person face"/>
                    <AvatarFallback>{prospectName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0"> {/* Added min-w-0 here for flex child */}
                    <div className="flex items-center justify-between">
                       <h4 className="font-semibold text-md sm:text-lg flex items-center">
                          {getUrgencyIcon(fu.date)}
                          {prospectName}
                       </h4>
                       <ColorCodedIndicator colorCode={prospectColorCode} />
                    </div>
                    <p className="text-sm text-muted-foreground break-words">{fu.notes}</p>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-2 text-sm gap-1 sm:gap-0">
                      <div className="flex items-center">
                        <CalendarClock className="w-4 h-4 mr-1 text-muted-foreground" />
                        <span>{isValid(parseISO(fu.date)) ? format(parseISO(fu.date), 'EEE, MMM d') : 'Invalid Date'} at {fu.time}</span>
                      </div>
                      <div className="flex items-center">
                        {getMethodIcon(fu.method)}
                        <span className="ml-1">{fu.method}</span>
                      </div>
                    </div>
                    {prospectPhone && (
                       <div className="mt-2 flex items-center space-x-2">
                            <Button variant="outline" size="xs" asChild>
                                <a href={`tel:${prospectPhone}`} aria-label={`Call ${prospectName}`}>
                                    <Phone className="w-3 h-3 mr-1" /> Call
                                </a>
                            </Button>
                            <Button variant="outline" size="xs" asChild>
                                <a href={`sms:${prospectPhone}`} aria-label={`Text ${prospectName}`}>
                                    <MessageSquareText className="w-3 h-3 mr-1" /> Text
                                </a>
                            </Button>
                       </div>
                    )}
                  </div>
                  <div className="flex flex-col items-stretch sm:items-end space-y-2 w-full sm:w-auto shrink-0"> {/* Added shrink-0 */}
                     <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                       <Link href={`/prospects/${fu.prospectId}`}>
                         View Prospect <ArrowRight className="ml-2 h-4 w-4" />
                       </Link>
                     </Button>
                     {/* Placeholder for complete action - this would need state management or server action */}
                     <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50 w-full sm:w-auto justify-start sm:justify-center" 
                        onClick={() => alert(`Mark follow-up ${fu.id} for ${prospectName} as done (not implemented).`)}>
                       <CheckCircle className="mr-2 h-4 w-4" /> Mark Done
                     </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
