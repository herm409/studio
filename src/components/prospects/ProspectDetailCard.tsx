
"use client";
import type { Prospect } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FunnelProgress } from "@/components/shared/FunnelProgress";
import { ColorCodedIndicator } from "@/components/shared/ColorCodedIndicator";
import { Mail, Phone, Edit, CalendarDays } from "lucide-react";
import Link from "next/link";
import { format, parseISO } from 'date-fns';

interface ProspectDetailCardProps {
  prospect: Prospect;
}

export function ProspectDetailCard({ prospect }: ProspectDetailCardProps) {
  return (
    <Card className="shadow-xl">
      <CardHeader className="border-b">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-primary">
              <AvatarImage src={prospect.avatarUrl} alt={prospect.name} data-ai-hint="person face"/>
              <AvatarFallback className="text-xl sm:text-2xl">{prospect.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl sm:text-3xl font-headline flex items-center">
                {prospect.name}
                <ColorCodedIndicator colorCode={prospect.colorCode} size="lg" className="ml-3" />
              </CardTitle>
              <div className="flex flex-col sm:flex-row sm:space-x-4 text-muted-foreground mt-1">
                {prospect.email && <span className="flex items-center text-sm"><Mail className="w-4 h-4 mr-1.5" /> {prospect.email}</span>}
                {prospect.phone && <span className="flex items-center text-sm mt-1 sm:mt-0"><Phone className="w-4 h-4 mr-1.5" /> {prospect.phone}</span>}
              </div>
            </div>
          </div>
          <Button variant="outline" asChild className="w-full md:w-auto">
            <Link href={`/prospects/${prospect.id}/edit`}> {/* Assuming an edit page route */}
              <Edit className="mr-2 h-4 w-4" /> Edit Prospect
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6 grid gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-2 font-headline">Funnel Stage</h3>
          <FunnelProgress currentStage={prospect.currentFunnelStage} className="p-2 bg-secondary/50 rounded-md" />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2 font-headline">Initial Data & Notes</h3>
          <p className="text-muted-foreground whitespace-pre-wrap bg-secondary/30 p-3 rounded-md border break-words">
            {prospect.initialData}
          </p>
        </div>
         {prospect.colorCodeReasoning && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">Color Code Reasoning:</h3>
            <p className="text-xs text-muted-foreground italic break-words">{prospect.colorCodeReasoning}</p>
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-4 text-sm">
            <p className="flex items-center"><CalendarDays className="w-4 h-4 mr-1.5 text-muted-foreground"/>Created: {format(parseISO(prospect.createdAt), "PPPp")}</p>
            <p className="flex items-center"><CalendarDays className="w-4 h-4 mr-1.5 text-muted-foreground"/>Last Updated: {format(parseISO(prospect.updatedAt), "PPPp")}</p>
            {prospect.lastContactedDate && <p className="flex items-center"><CalendarDays className="w-4 h-4 mr-1.5 text-muted-foreground"/>Last Contacted: {format(parseISO(prospect.lastContactedDate), "PPP")}</p>}
            {prospect.nextFollowUpDate && <p className="flex items-center text-primary font-semibold"><CalendarDays className="w-4 h-4 mr-1.5"/>Next Follow-Up: {format(parseISO(prospect.nextFollowUpDate), "PPP")}</p>}
        </div>
      </CardContent>
      <CardFooter className="border-t pt-6">
        <p className="text-xs text-muted-foreground">Prospect ID: {prospect.id}</p>
      </CardFooter>
    </Card>
  );
}
