import type { Interaction } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, Users, MessageSquare, CalendarCheck2 } from "lucide-react";
import { format, parseISO } from "date-fns";

interface InteractionCardProps {
  interaction: Interaction;
}

const getInteractionIcon = (type: Interaction['type']) => {
  switch (type) {
    case 'Email': return <Mail className="w-5 h-5 text-primary" />;
    case 'Call': return <Phone className="w-5 h-5 text-accent" />;
    case 'Meeting': return <Users className="w-5 h-5 text-green-500" />;
    case 'Note': return <MessageSquare className="w-5 h-5 text-purple-500" />;
    default: return <CalendarCheck2 className="w-5 h-5 text-muted-foreground" />;
  }
};

export function InteractionCard({ interaction }: InteractionCardProps) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getInteractionIcon(interaction.type)}
            <CardTitle className="text-md font-semibold">{interaction.type}</CardTitle>
          </div>
          <CardDescription className="text-xs">
            {format(parseISO(interaction.date), "MMM d, yyyy 'at' HH:mm")}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground mb-1">{interaction.summary}</p>
        {interaction.outcome && (
          <p className="text-xs text-muted-foreground italic">Outcome: {interaction.outcome}</p>
        )}
      </CardContent>
    </Card>
  );
}
