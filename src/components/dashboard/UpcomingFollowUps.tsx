"use client";
import type { FollowUp, Prospect } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CalendarClock, Mail, Phone, AlertTriangle, CheckCircle, User, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { ColorCodedIndicator } from '@/components/shared/ColorCodedIndicator';

interface UpcomingFollowUpsProps {
  followUps: FollowUp[];
  prospects: Prospect[];
}

export function UpcomingFollowUps({ followUps, prospects }: UpcomingFollowUpsProps) {
  if (followUps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Follow-Ups (Next 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No upcoming follow-ups scheduled. Time to plan!</p>
        </CardContent>
      </Card>
    );
  }

  const getProspectName = (prospectId: string) => {
    const prospect = prospects.find(p => p.id === prospectId);
    return prospect ? prospect.name : 'Unknown Prospect';
  };

  const getProspectAvatar = (prospectId: string) => {
    const prospect = prospects.find(p => p.id === prospectId);
    return prospect?.avatarUrl || 'https://placehold.co/40x40.png';
  };
  
  const getProspectColorCode = (prospectId: string) => {
    const prospect = prospects.find(p => p.id === prospectId);
    return prospect?.colorCode;
  };


  const getUrgencyStyles = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isPast(date) && !isToday(date)) return "border-destructive text-destructive";
    if (isToday(date)) return "border-yellow-500 text-yellow-600";
    if (isTomorrow(date)) return "border-blue-500 text-blue-600";
    return "border-gray-300";
  };

  const getUrgencyIcon = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isPast(date) && !isToday(date)) return <AlertTriangle className="w-4 h-4 mr-1 text-destructive" />;
    if (isToday(date)) return <AlertTriangle className="w-4 h-4 mr-1 text-yellow-500" />;
    return null;
  };
  
  const getMethodIcon = (method: FollowUp['method']) => {
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
        <CardTitle className="font-headline text-2xl">Upcoming Follow-Ups</CardTitle>
        <CardDescription>Tasks for the next 7 days, sorted by urgency.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {followUps.map(fu => (
            <Card key={fu.id} className={cn("p-4 hover:shadow-md transition-shadow", getUrgencyStyles(fu.date))}>
              <div className="flex items-start space-x-4">
                <Avatar className="h-10 w-10 border">
                  <AvatarImage src={getProspectAvatar(fu.prospectId)} alt={getProspectName(fu.prospectId)} data-ai-hint="person face"/>
                  <AvatarFallback>{getProspectName(fu.prospectId).charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                     <h4 className="font-semibold text-lg flex items-center">
                        {getUrgencyIcon(fu.date)}
                        {getProspectName(fu.prospectId)}
                     </h4>
                     <ColorCodedIndicator colorCode={getProspectColorCode(fu.prospectId)} />
                  </div>
                  <p className="text-sm text-muted-foreground">{fu.notes}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm">
                    <div className="flex items-center">
                      <CalendarClock className="w-4 h-4 mr-1 text-muted-foreground" />
                      <span>{format(parseISO(fu.date), 'EEE, MMM d')} at {fu.time}</span>
                    </div>
                    <div className="flex items-center">
                      {getMethodIcon(fu.method)}
                      <span className="ml-1">{fu.method}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                   <Button asChild variant="outline" size="sm">
                     <Link href={`/prospects/${fu.prospectId}`}>
                       View Prospect <ArrowRight className="ml-2 h-4 w-4" />
                     </Link>
                   </Button>
                   {/* Placeholder for complete action */}
                   <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50">
                     <CheckCircle className="mr-2 h-4 w-4" /> Mark Done
                   </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
