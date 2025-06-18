import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Construction } from "lucide-react";

export default function AiToolsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <Bot className="mx-auto h-16 w-16 text-primary mb-4" />
          <CardTitle className="text-3xl font-bold font-headline">AI Tools Hub</CardTitle>
          <CardDescription>Explore AI-powered assistance features.</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-10">
          <Construction className="mx-auto h-12 w-12 mb-4" />
          <p>This page is currently under construction.</p>
          <p className="text-sm">More AI tools and insights are coming soon!</p>
        </CardContent>
      </Card>
    </div>
  );
}
