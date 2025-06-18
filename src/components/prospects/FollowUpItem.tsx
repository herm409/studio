
import type { FollowUp } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Mail, Phone, User, CheckCircle, XCircle, AlertTriangle, Edit2 } from "lucide-react";
import { format, parseISO, isPast } from "date-fns";
import { cn } from "@/lib/utils";

interface FollowUpItemProps {
  followUp: FollowUp;
  onEdit: (followUp: FollowUp) => void;
  onStatusChange: (followUpId: string, status: FollowUp['status']) => void;
}

const getMethodIcon = (method: FollowUp['method']) => {
  switch(method) {
    case 'Email': return <Mail className="w-4 h-4 mr-2" />;
    case 'Call': return <Phone className="w-4 h-4 mr-2" />;
    case 'In-Person': return <User className="w-4 h-4 mr-2" />;
    default: return <CalendarClock className="w-4 h-4 mr-2" />;
  }
};

const getStatusBadgeVariant = (status: FollowUp['status'], date: string): "default" | "secondary" | "destructive" | "outline" => {
  const isOverdue = isPast(parseISO(date)) && status === 'Pending';
  if (isOverdue) return "destructive";
  switch (status) {
    case 'Completed': return "default"; // Default is typically primary, which is fine for success
    case 'Missed': return "destructive";
    case 'Pending': return "secondary";
    default: return "outline";
  }
};

export function FollowUpItem({ followUp, onEdit, onStatusChange }: FollowUpItemProps) {
  const isOverdue = isPast(parseISO(followUp.date)) && followUp.status === 'Pending';

  return (
    <Card className={cn("shadow-sm hover:shadow-md transition-shadow", isOverdue && "border-destructive")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
            <div className="flex items-center">
                {getMethodIcon(followUp.method)}
                <CardTitle className="text-md font-semibold">{followUp.method} Follow-Up</CardTitle>
            </div>
            <Badge variant={getStatusBadgeVariant(followUp.status, followUp.date)}>
                {isOverdue ? "Overdue" : followUp.status}
            </Badge>
        </div>
        <CardDescription className="text-xs flex items-center">
            <CalendarClock className="w-3 h-3 mr-1" />
            {format(parseISO(followUp.date), "EEE, MMM d, yyyy")} at {followUp.time}
            {followUp.aiSuggestedTone && <span className="ml-2 italic text-primary/80">(AI Tone: {followUp.aiSuggestedTone})</span>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground mb-2">{followUp.notes}</p>
        {followUp.aiSuggestedContent && (
            <div className="my-2 p-2 border-l-2 border-primary bg-primary/10 rounded-r-md">
                <p className="text-xs font-semibold text-primary">AI Suggested Content:</p>
                <p className="text-xs text-primary/90 italic whitespace-pre-wrap">{followUp.aiSuggestedContent}</p>
            </div>
        )}
        {followUp.aiSuggestedTool && (
             <p className="text-xs text-muted-foreground">AI Suggested Tool: <span className="font-medium text-accent">{followUp.aiSuggestedTool}</span></p>
        )}
        {followUp.status === 'Pending' && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => onStatusChange(followUp.id, 'Completed')}>
              <CheckCircle className="w-4 h-4 mr-1" /> Mark Completed
            </Button>
            {!isOverdue && (
                 <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50" onClick={() => onStatusChange(followUp.id, 'Missed')}>
                    <XCircle className="w-4 h-4 mr-1" /> Mark Missed
                </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => onEdit(followUp)}>
              <Edit2 className="w-4 h-4 mr-1" /> Edit
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
