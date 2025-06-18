
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, MessageCircle, CalendarClock, Lightbulb, Palette, ExternalLink } from "lucide-react";
import Link from "next/link";

const aiFeatures = [
  {
    title: "AI Message Helper",
    icon: MessageCircle,
    description: "Get AI-powered suggestions for the tone and content of your follow-up messages. Tailors recommendations based on prospect data, interaction history, and funnel stage.",
    location: "Available on the Prospect Detail page.",
    link: "/prospects",
  },
  {
    title: "AI Smart Scheduler",
    icon: CalendarClock,
    description: "Let AI analyze prospect interactions and user preferences to suggest an optimal follow-up schedule, aiming to maximize engagement and conversion.",
    location: "Available on the Prospect Detail page.",
    link: "/prospects",
  },
  {
    title: "AI Tool Advisor",
    icon: Lightbulb, // Using Lightbulb as a general "advisor" icon
    description: "Receive intelligent recommendations for 3rd party tools (like informational videos, expert calls, or live presentations) to effectively engage your prospect and move them through the funnel.",
    location: "Available on the Prospect Detail page.",
    link: "/prospects",
  },
  {
    title: "Prospect Color Coding",
    icon: Palette,
    description: "Automatically assigns a visual color code (e.g., green for fresh, red for ripe) to prospects based on their follow-up stage number, helping you quickly assess their status.",
    location: "Applied on the Prospects list and Prospect Detail pages.",
    link: "/prospects",
  }
];

export default function AiToolsPage() {
  return (
    <div className="space-y-8">
      <header className="text-center">
        <Bot className="mx-auto h-16 w-16 text-primary mb-2" />
        <h1 className="text-4xl font-bold font-headline text-primary">AI Tools Hub</h1>
        <p className="text-lg text-muted-foreground mt-1">
          Explore the AI-powered features designed to enhance your prospecting and follow-up efficiency.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        {aiFeatures.map((feature) => (
          <Card key={feature.title} className="shadow-lg hover:shadow-xl transition-shadow flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <feature.icon className="h-8 w-8 text-accent" />
                <CardTitle className="text-2xl font-headline">{feature.title}</CardTitle>
              </div>
              <CardDescription className="text-sm">{feature.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-xs text-muted-foreground italic">{feature.location}</p>
            </CardContent>
            {feature.link && (
                 <CardContent className="pt-0">
                    <Link href={feature.link} className="text-sm text-primary hover:underline flex items-center">
                        Go to relevant section <ExternalLink className="ml-1 h-4 w-4" />
                    </Link>
                 </CardContent>
            )}
          </Card>
        ))}
      </div>
       <Card className="mt-8 shadow-md">
        <CardHeader>
          <CardTitle className="font-headline">More to Come!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            We are continuously working on expanding our AI capabilities. Stay tuned for more tools and insights to supercharge your workflow!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

