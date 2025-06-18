import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Construction } from "lucide-react";

export default function CalendarPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CalendarDays className="mx-auto h-16 w-16 text-primary mb-4" />
          <CardTitle className="text-3xl font-bold font-headline">Calendar</CardTitle>
          <CardDescription>Your upcoming events and follow-ups.</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-10">
          <Construction className="mx-auto h-12 w-12 mb-4" />
          <p>This page is currently under construction.</p>
          <p className="text-sm">Check back soon for calendar integration!</p>
        </CardContent>
      </Card>
    </div>
  );
}
