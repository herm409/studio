
"use client";
import type { Prospect, FunnelStageType } from "@/types";
import { FunnelStages } from "@/types"; // Import FunnelStages
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FunnelProgress } from "@/components/shared/FunnelProgress";
import { ColorCodedIndicator } from "@/components/shared/ColorCodedIndicator";
import { Mail, Phone, Edit, CalendarDays, ChevronDownSquare, Loader2 } from "lucide-react"; // Added Loader2
import Link from "next/link";
import { format, parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Added Select
import { Label } from "@/components/ui/label"; // Added Label

interface ProspectDetailCardProps {
  prospect: Prospect;
  onStageChange: (newStage: FunnelStageType) => Promise<void>; // New prop
  isUpdatingStage: boolean; // New prop
}

export function ProspectDetailCard({ prospect, onStageChange, isUpdatingStage }: ProspectDetailCardProps) {
  return (
    <Card className="shadow-xl">
      <CardHeader className="border-b">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4 min-w-0">
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-primary shrink-0">
              <AvatarImage src={prospect.avatarUrl} alt={prospect.name} data-ai-hint="person face"/>
              <AvatarFallback className="text-xl sm:text-2xl">{prospect.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl sm:text-3xl font-headline flex items-center">
                <span className="break-words min-w-0">{prospect.name}</span>
                <ColorCodedIndicator colorCode={prospect.colorCode} size="lg" className="ml-3 shrink-0" />
              </CardTitle>
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-muted-foreground mt-1">
                {prospect.email && <span className="flex items-center text-sm break-all min-w-0"><Mail className="w-4 h-4 mr-1.5 shrink-0" /> {prospect.email}</span>}
                {prospect.phone && <span className="flex items-center text-sm mt-1 sm:mt-0 break-all min-w-0"><Phone className="w-4 h-4 mr-1.5 shrink-0" /> {prospect.phone}</span>}
              </div>
            </div>
          </div>
          <Button variant="outline" asChild className="w-full md:w-auto shrink-0">
            <Link href={`/prospects/${prospect.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" /> Edit Prospect
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6 grid gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-2 font-headline text-center md:text-left">Funnel Stage</h3>
          <FunnelProgress currentStage={prospect.currentFunnelStage} className="p-2 bg-secondary/50 rounded-md" />
          <div className="mt-4 pt-4 border-t">
            <Label htmlFor="funnel-stage-select" className="text-sm font-medium text-muted-foreground">Change Stage:</Label>
            <div className="flex items-center gap-2 mt-1">
              <Select
                value={prospect.currentFunnelStage}
                onValueChange={(value) => onStageChange(value as FunnelStageType)}
                disabled={isUpdatingStage}
              >
                <SelectTrigger id="funnel-stage-select" className="flex-1">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {FunnelStages.map(stage => (
                    <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isUpdatingStage && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            </div>
          </div>
        </div>
        <div className="max-w-full overflow-x-hidden">
          <h3 className="text-lg font-semibold mb-2 font-headline">Initial Data & Notes</h3>
          <div className="text-muted-foreground whitespace-pre-wrap bg-secondary/30 p-3 rounded-md border break-words max-w-full">
            {prospect.initialData}
          </div>
        </div>
         {prospect.colorCodeReasoning && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">Color Code Reasoning:</h3>
            <p className="text-xs text-muted-foreground italic break-words">{prospect.colorCodeReasoning}</p>
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-4 text-sm">
            <p className="flex items-center break-words"><CalendarDays className="w-4 h-4 mr-1.5 text-muted-foreground shrink-0"/>Created: {format(parseISO(prospect.createdAt), "PPPp")}</p>
            <p className="flex items-center break-words"><CalendarDays className="w-4 h-4 mr-1.5 text-muted-foreground shrink-0"/>Last Updated: {format(parseISO(prospect.updatedAt), "PPPp")}</p>
            {prospect.lastContactedDate && <p className="flex items-center break-words"><CalendarDays className="w-4 h-4 mr-1.5 text-muted-foreground shrink-0"/>Last Contacted: {format(parseISO(prospect.lastContactedDate), "PPP")}</p>}
            {prospect.nextFollowUpDate && <p className="flex items-center text-primary font-semibold break-words"><CalendarDays className="w-4 h-4 mr-1.5 shrink-0"/>Next Follow-Up: {format(parseISO(prospect.nextFollowUpDate), "PPP")}</p>}
        </div>
      </CardContent>
      <CardFooter className="border-t pt-6">
        <p className="text-xs text-muted-foreground break-all">Prospect ID: {prospect.id}</p>
      </CardFooter>
    </Card>
  );
}
