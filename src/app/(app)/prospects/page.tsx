import { getProspects } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusCircle, ArrowRight, Mail, Phone, CalendarDays } from "lucide-react";
import Link from "next/link";
import { FunnelProgress } from "@/components/shared/FunnelProgress";
import { ColorCodedIndicator } from "@/components/shared/ColorCodedIndicator";
import { format, parseISO } from 'date-fns';

export default async function ProspectsPage() {
  const prospects = await getProspects();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-headline">Your Prospects</h1>
        <Button asChild size="lg">
          <Link href="/prospects/add">
            <PlusCircle className="mr-2 h-5 w-5" /> Add New Prospect
          </Link>
        </Button>
      </div>

      {prospects.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Prospects Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Start by adding your first prospect to manage your follow-ups.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {prospects.map(prospect => (
            <Card key={prospect.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12 border">
                      <AvatarImage src={prospect.avatarUrl} alt={prospect.name} data-ai-hint="person face" />
                      <AvatarFallback>{prospect.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-xl font-headline">{prospect.name}</CardTitle>
                      <CardDescription className="text-sm">{prospect.email}</CardDescription>
                      {prospect.phone && <CardDescription className="text-sm flex items-center"><Phone className="w-3 h-3 mr-1"/>{prospect.phone}</CardDescription>}
                    </div>
                  </div>
                  <ColorCodedIndicator colorCode={prospect.colorCode} size="lg" />
                </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-3">
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Funnel Stage</h4>
                  <FunnelProgress currentStage={prospect.currentFunnelStage} />
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                    {prospect.lastContactedDate && (
                        <p className="flex items-center"><CalendarDays className="w-3 h-3 mr-1.5"/>Last Contacted: {format(parseISO(prospect.lastContactedDate), "MMM d, yyyy")}</p>
                    )}
                    {prospect.nextFollowUpDate && (
                        <p className="flex items-center"><CalendarDays className="w-3 h-3 mr-1.5 text-primary"/>Next Follow-Up: {format(parseISO(prospect.nextFollowUpDate), "MMM d, yyyy")}</p>
                    )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2" title={prospect.initialData}>
                  {prospect.initialData}
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/prospects/${prospect.id}`}>
                    View Details <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
