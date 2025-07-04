
"use client";
import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Prospect, Interaction, FollowUp, FunnelStageType } from '@/types';
import { 
  getProspectById, 
  getFollowUpsForProspect, 
  addInteraction as serverAddInteraction, 
  addFollowUp as serverAddFollowUp, 
  updateFollowUp as serverUpdateFollowUp, 
  updateProspect as serverUpdateProspect,
  deleteFollowUp as serverDeleteFollowUp 
} from '@/lib/data';
import { Button } from "@/components/ui/button";
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, PlusCircle, Loader2, Bot, MessageCircle, Users2, Video, ExternalLink, Phone, Presentation, MessageSquareText, ListChecks } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ProspectDetailCard } from '@/components/prospects/ProspectDetailCard';
import { InteractionCard } from '@/components/prospects/InteractionCard';
import { FollowUpItem } from '@/components/prospects/FollowUpItem';
import { AiSuggestionCard } from '@/components/prospects/AiSuggestionCard';
import { useAuth } from '@/context/AuthContext';

import { suggestFollowUpMessage } from '@/ai/flows/suggest-follow-up-message';
import type { SuggestFollowUpMessageOutput } from '@/ai/flows/suggest-follow-up-message';
import { scheduleFollowUp } from '@/ai/flows/schedule-follow-up';
import type { ScheduleFollowUpOutput } from '@/ai/flows/schedule-follow-up';
import { suggestTools } from '@/ai/flows/suggest-tools';
import type { SuggestToolsOutput } from '@/ai/flows/suggest-tools';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const interactionSchema = z.object({
  type: z.enum(['Email', 'Call', 'Meeting', 'Note', 'Text Message']),
  summary: z.string().min(5, "Summary is too short.").max(500, "Summary is too long."),
  outcome: z.string().optional(),
});
type InteractionFormData = z.infer<typeof interactionSchema>;

const followUpSchema = z.object({
  method: z.enum(['Email', 'Call', 'In-Person']),
  date: z.date({ required_error: "Date is required." }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)."),
  notes: z.string().min(5, "Notes are too short.").max(500, "Notes are too long."),
});
type FollowUpFormData = z.infer<typeof followUpSchema>;


export default function ProspectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const prospectId = params.id as string;

  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);

  const [aiToneSuggestion, setAiToneSuggestion] = useState<SuggestFollowUpMessageOutput | null>(null);
  const [isToneLoading, setIsToneLoading] = useState(false);
  const [prospectObjections, setProspectObjections] = useState<string>('');

  const [aiScheduleSuggestion, setAiScheduleSuggestion] = useState<ScheduleFollowUpOutput | null>(null);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);
  const [isApplyingScheduleLoading, setIsApplyingScheduleLoading] = useState(false);

  const [aiToolSuggestions, setAiToolSuggestions] = useState<SuggestToolsOutput | null>(null);
  const [isToolsLoading, setIsToolsLoading] = useState(false);

  const [isUpdatingStage, setIsUpdatingStage] = useState(false); 

  const interactionForm = useForm<InteractionFormData>({ 
    resolver: zodResolver(interactionSchema), 
    defaultValues: { 
      type: 'Note', 
      summary: '',
      outcome: '' // Added default empty string for outcome
    } 
  });
  const followUpForm = useForm<FollowUpFormData>({ resolver: zodResolver(followUpSchema), defaultValues: { method: 'Email', time: '10:00', notes: '' } });

  useEffect(() => {
    if (prospectId && user) { 
      fetchProspectData();
    }
  }, [prospectId, user]); 
  
  const fetchProspectData = async () => {
    if (!user) return; 
    setIsLoading(true);
    try {
      const [pData, fuData] = await Promise.all([
        getProspectById(prospectId), 
        getFollowUpsForProspect(prospectId) 
      ]);
      if (pData) {
        setProspect(pData);
        setFollowUps(fuData.sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime() ));
      } else {
        toast({ title: "Error", description: "Prospect not found or not authorized.", variant: "destructive" });
        router.push('/prospects');
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to load prospect data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddInteraction = async (data: InteractionFormData) => {
    if (!prospect || !user) return;
    try {
      await serverAddInteraction(prospect.id, { ...data, prospectId: prospect.id, date: new Date().toISOString() });
      toast({ title: "Success", description: "Interaction logged." });
      fetchProspectData(); 
      setIsInteractionModalOpen(false);
      interactionForm.reset({type: 'Note', summary: '', outcome: ''});
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to log interaction.", variant: "destructive" });
    }
  };
  
  const handleSaveFollowUp = async (data: FollowUpFormData) => {
    if (!prospect || !user) return;

    const followUpPayloadBase: Omit<FollowUp, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'aiSuggestedTone' | 'aiSuggestedContent' | 'aiSuggestedTool'> = {
      prospectId: prospect.id,
      method: data.method,
      date: format(data.date, "yyyy-MM-dd"),
      time: data.time,
      notes: data.notes,
      status: 'Pending' as FollowUp['status'],
    };
    
    const aiTone = editingFollowUp?.aiSuggestedTone || aiToneSuggestion?.tone;
    const aiContent = editingFollowUp?.aiSuggestedContent || aiToneSuggestion?.content;
    const aiTool = editingFollowUp?.aiSuggestedTool || aiToneSuggestion?.suggestedTool;

    const followUpPayload: Omit<FollowUp, 'id' | 'createdAt' | 'updatedAt' | 'userId'> = { ...followUpPayloadBase };

    if (aiTone) followUpPayload.aiSuggestedTone = aiTone;
    if (aiContent) followUpPayload.aiSuggestedContent = aiContent;
    if (aiTool) followUpPayload.aiSuggestedTool = aiTool;
    
    try {
      if (editingFollowUp) {
        await serverUpdateFollowUp(editingFollowUp.id, followUpPayload);
        toast({ title: "Success", description: "Follow-up updated." });
      } else {
        await serverAddFollowUp(followUpPayload);
        toast({ title: "Success", description: "Follow-up scheduled." });
      }
      fetchProspectData();
      setIsFollowUpModalOpen(false);
      followUpForm.reset({ method: 'Email', time: '10:00', notes: '' });
      setEditingFollowUp(null);
      setAiToneSuggestion(null); 
    } catch (error: any) {
      toast({ title: "Error", description: error.message || `Failed to ${editingFollowUp ? 'update' : 'schedule'} follow-up.`, variant: "destructive" });
    }
  };

  const handleEditFollowUp = (followUp: FollowUp) => {
    setEditingFollowUp(followUp);
    followUpForm.reset({
      method: followUp.method,
      date: parseISO(followUp.date),
      time: followUp.time,
      notes: followUp.notes,
    });
    setAiToneSuggestion({ 
      tone: followUp.aiSuggestedTone || '', 
      content: followUp.aiSuggestedContent || '', 
      suggestedTool: followUp.aiSuggestedTool || '' 
    });
    setIsFollowUpModalOpen(true);
  };

  const handleFollowUpStatusChange = async (followUpId: string, status: FollowUp['status']) => {
    try {
      await serverUpdateFollowUp(followUpId, { status }); 
      toast({ title: "Success", description: `Follow-up marked as ${status}.` });
      fetchProspectData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update follow-up status.", variant: "destructive" });
    }
  };

  const handleDeleteFollowUp = async (followUpId: string) => {
    try {
      await serverDeleteFollowUp(followUpId);
      toast({ title: "Success", description: "Follow-up deleted." });
      fetchProspectData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete follow-up.", variant: "destructive" });
    }
  };

  const generateToneSuggestion = async () => {
    if (!prospect) return;
    setIsToneLoading(true);
    try {
      const completedFollowUpsCount = followUps.filter(f => f.status === 'Completed').length;
      const nextFollowUpNumber = completedFollowUpsCount + 1;

      const result = await suggestFollowUpMessage({
        prospectData: prospect.initialData,
        previousInteractions: prospect.interactionHistory.map(i => `${format(parseISO(i.date), 'PPp')}: ${i.summary} (${i.outcome || 'no outcome'})`).join('\n'),
        followUpNumber: nextFollowUpNumber, 
        funnelStage: prospect.currentFunnelStage,
        prospectObjections: prospectObjections,
      });
      setAiToneSuggestion(result);
      followUpForm.setValue('notes', result.content, { shouldValidate: true }); 
    } catch (error: any) {
      toast({ title: "AI Error", description: error.message || "Failed to get tone suggestion.", variant: "destructive" });
    } finally {
      setIsToneLoading(false);
    }
  };
  
  const generateScheduleSuggestion = async () => {
    if (!prospect) return;
    setIsScheduleLoading(true);
    setAiScheduleSuggestion(null); 
    try {
      const today = new Date();
      const currentDateFormatted = format(today, "yyyy-MM-dd");

      const result = await scheduleFollowUp({
        prospectData: `${prospect.name}${prospect.email ? `, ${prospect.email}` : ''}`,
        interactionHistory: prospect.interactionHistory.map(i => i.summary).join('; '),
        currentFunnelStage: prospect.currentFunnelStage,
        userPreferences: "Prefer morning follow-ups, avoid Mondays.",
        currentDate: currentDateFormatted, 
      });
      setAiScheduleSuggestion(result);
    } catch (error: any) {
      toast({ title: "AI Error", description: error.message || "Failed to get schedule suggestion.", variant: "destructive" });
    } finally {
      setIsScheduleLoading(false);
    }
  };

  const handleApplySchedule = async () => {
    if (!prospect || !aiScheduleSuggestion || !aiScheduleSuggestion.followUpSchedule || aiScheduleSuggestion.followUpSchedule.length === 0) {
      toast({ title: "Info", description: "No AI schedule to apply or AI did not suggest any follow-ups.", variant: "default" });
      return;
    }
    setIsApplyingScheduleLoading(true);
    try {
      const firstSuggestedFu = aiScheduleSuggestion.followUpSchedule[0];
      await serverAddFollowUp({
        prospectId: prospect.id,
        method: firstSuggestedFu.method as 'Email' | 'Call' | 'In-Person', 
        date: firstSuggestedFu.date, 
        time: firstSuggestedFu.time,
        notes: firstSuggestedFu.notes,
        status: 'Pending',
      });
      
      toast({ title: "Success", description: "Next suggested follow-up has been scheduled." });
      fetchProspectData(); 
      
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to apply the next suggested follow-up.", variant: "destructive" });
    } finally {
      setIsApplyingScheduleLoading(false);
    }
  };

  const generateToolSuggestions = async () => {
    if (!prospect) return;
    setIsToolsLoading(true);
    try {
      const result = await suggestTools({
        prospectName: prospect.name,
        funnelStage: prospect.currentFunnelStage,
        prospectInfo: prospect.initialData,
        previousInteractions: prospect.interactionHistory.map(i => i.summary).join('; '),
      });
      setAiToolSuggestions(result);
    } catch (error: any) {
      toast({ title: "AI Error", description: error.message || "Failed to get tool suggestions.", variant: "destructive" });
    } finally {
      setIsToolsLoading(false);
    }
  };

  const handleFunnelStageChange = async (newStage: FunnelStageType) => {
    if (!prospect || !user) return;
    setIsUpdatingStage(true);
    try {
      await serverUpdateProspect(prospect.id, { currentFunnelStage: newStage });
      toast({ title: "Success", description: `Prospect stage updated to "${newStage}".` });
      fetchProspectData(); 
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update prospect stage.", variant: "destructive" });
    } finally {
      setIsUpdatingStage(false);
    }
  };
  
  const sortedInteractions = useMemo(() => 
    prospect?.interactionHistory?.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime() ) || [], 
  [prospect?.interactionHistory]);

  const sortedFollowUps = useMemo(() =>
    followUps.sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()),
  [followUps]);


  if (isLoading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading prospect details...</span></div>;
  if (!prospect) return <div className="text-center text-muted-foreground">Prospect not found or you might not have access.</div>;

  return (
    <div className="space-y-8">
      <ProspectDetailCard 
        prospect={prospect} 
        onStageChange={handleFunnelStageChange}
        isUpdatingStage={isUpdatingStage}
      />

      <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6">
        <AiSuggestionCard
          title="AI Message Helper"
          description="Get AI suggestions for follow-up tone, content, and handling objections. Enter any objections below."
          buttonText="Suggest Message"
          onGenerate={generateToneSuggestion}
          isLoading={isToneLoading}
          suggestionResult={aiToneSuggestion && (
            <>
              <div><strong>Tone:</strong> <Badge variant="outline">{aiToneSuggestion.tone}</Badge></div>
              <div className="whitespace-pre-wrap break-words"><strong>Content:</strong> <em>{aiToneSuggestion.content}</em></div>
              {aiToneSuggestion.suggestedTool && <div className="break-words"><strong>Tool:</strong> {aiToneSuggestion.suggestedTool}</div>}
            </>
          )}
          icon={MessageCircle}
        >
          {!aiToneSuggestion && (
            <div className="space-y-2 mb-4">
              <Label htmlFor="prospectObjections">Prospect Objections (Optional)</Label>
              <Textarea
                id="prospectObjections"
                placeholder="e.g., 'Price is too high', 'Not the right time'"
                value={prospectObjections}
                onChange={(e) => setProspectObjections(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          )}
        </AiSuggestionCard>
        <AiSuggestionCard
          title="AI Smart Scheduler"
          description="Let AI suggest an optimal follow-up schedule. Only the first step will be scheduled."
          buttonText="Suggest Schedule"
          onGenerate={generateScheduleSuggestion}
          isLoading={isScheduleLoading || isApplyingScheduleLoading}
          suggestionResult={aiScheduleSuggestion && (
            <>
              <div className="font-semibold mb-1">Suggested Follow-up Roadmap:</div>
              <ul className="space-y-2 text-sm max-h-60 overflow-y-auto pr-2">
                {aiScheduleSuggestion.followUpSchedule.map((fu, idx) => (
                  <li key={idx} className="p-2 border rounded-md bg-background/70">
                    <div className="font-medium">{format(parseISO(fu.date), "MMM d, yyyy")} at {fu.time} ({fu.method})</div>
                    <p className="text-xs text-muted-foreground break-words">{fu.notes}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-2 text-xs text-muted-foreground italic break-words"><strong>Reasoning:</strong> {aiScheduleSuggestion.reasoning}</div>
              {aiScheduleSuggestion.followUpSchedule.length > 0 && (
                <Button 
                  onClick={handleApplySchedule} 
                  disabled={isApplyingScheduleLoading || isScheduleLoading} 
                  className="w-full mt-3"
                  size="sm"
                >
                  {isApplyingScheduleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListChecks className="mr-2 h-4 w-4" />}
                  Apply Next Suggested Follow-Up
                </Button>
              )}
            </>
          )}
          icon={CalendarIcon}
        />
        <AiSuggestionCard
          title="AI Tool Advisor"
          description="Discover 3rd party tools to engage your prospect."
          buttonText="Suggest Tools"
          onGenerate={generateToolSuggestions}
          isLoading={isToolsLoading}
          suggestionResult={aiToolSuggestions && (
            <ul className="space-y-3">
              {aiToolSuggestions.toolSuggestions.map((tool, idx) => (
                <li key={idx} className="p-2 border rounded-md bg-background">
                  <div className="font-semibold flex items-center break-words">
                    {tool.toolType === 'Prospect by LegalShield' && <Video className="w-4 h-4 mr-1.5 text-blue-500 shrink-0"/>}
                    {tool.toolType === 'Live Presentation' && <Presentation className="w-4 h-4 mr-1.5 text-purple-500 shrink-0"/>}
                    {tool.toolType === '3-way call' && <Phone className="w-4 h-4 mr-1.5 text-green-500 shrink-0"/>}
                    {tool.toolName} <Badge variant="secondary" className="ml-2 shrink-0">{tool.toolType}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground break-words">{tool.reasoning}</div>
                  {tool.details && <div className="text-xs text-accent flex items-center break-words"><ExternalLink className="w-3 h-3 mr-1 shrink-0"/> {tool.details}</div>}
                </li>
              ))}
            </ul>
          )}
          icon={Bot}
        />
      </div>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="font-headline text-xl">Interaction History</CardTitle>
            <CardDescription>Logged communications and notes.</CardDescription>
          </div>
          <Dialog open={isInteractionModalOpen} onOpenChange={setIsInteractionModalOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Log Interaction</span>
                <span className="sm:hidden">Log</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Log New Interaction</DialogTitle></DialogHeader>
              <Form {...interactionForm}>
                <form onSubmit={interactionForm.handleSubmit(handleAddInteraction)} className="space-y-4">
                  <FormField control={interactionForm.control} name="type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {['Email', 'Call', 'Meeting', 'Note', 'Text Message'].map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={interactionForm.control} name="summary" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Summary</FormLabel>
                      <FormControl><Textarea placeholder="Interaction details..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={interactionForm.control} name="outcome" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Outcome (Optional)</FormLabel>
                      <FormControl><Input placeholder="e.g., Scheduled demo, sent proposal" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                    <Button type="submit" disabled={interactionForm.formState.isSubmitting}>
                        {interactionForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Interaction
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedInteractions.length > 0 ? sortedInteractions.map(int => <InteractionCard key={int.id} interaction={int} />)
            : <div className="text-muted-foreground">No interactions logged yet.</div>}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="font-headline text-xl">Scheduled Follow-Ups</CardTitle>
            <CardDescription>Upcoming and past follow-up tasks.</CardDescription>
          </div>
          <Dialog open={isFollowUpModalOpen} onOpenChange={(isOpen) => { setIsFollowUpModalOpen(isOpen); if (!isOpen) { setEditingFollowUp(null); followUpForm.reset({ method: 'Email', time: '10:00', notes: '' }); setAiToneSuggestion(null); }}}>
            <DialogTrigger asChild>
              <Button variant="default" className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Schedule Follow-Up</span>
                <span className="sm:hidden">Schedule</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader><DialogTitle>{editingFollowUp ? "Edit" : "Schedule New"} Follow-Up</DialogTitle></DialogHeader>
              <Form {...followUpForm}>
                <form onSubmit={followUpForm.handleSubmit(handleSaveFollowUp)} className="space-y-4 py-4">
                   {aiToneSuggestion && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
                        <div className="font-semibold text-blue-700">AI Suggestion:</div>
                        <div><strong>Tone:</strong> {aiToneSuggestion.tone}</div>
                        <div className="mt-1 break-words"><strong>Content:</strong> <em className="whitespace-pre-wrap">{aiToneSuggestion.content}</em></div>
                        {aiToneSuggestion.suggestedTool && <div className="mt-1 break-words"><strong>Tool:</strong> {aiToneSuggestion.suggestedTool}</div>}
                    </div>
                    )}
                  <div className="flex items-end gap-2">
                    <FormField control={followUpForm.control} name="method" render={({ field }) => (
                        <FormItem className="flex-1">
                        <FormLabel>Method</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger></FormControl>
                            <SelectContent>
                            {['Email', 'Call', 'In-Person'].map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )} />
                     <Button type="button" variant="outline" size="icon" onClick={generateToneSuggestion} disabled={isToneLoading} title="Get AI Suggestion">
                        {isToneLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                    </Button>
                  </div>
                  <FormField control={followUpForm.control} name="date" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant={"outline"} className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}>
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={followUpForm.control} name="time" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl><Input type="time" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={followUpForm.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl><Textarea placeholder="Follow-up objectives, talking points..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                    <Button type="submit" disabled={followUpForm.formState.isSubmitting}>
                        {followUpForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingFollowUp ? "Save Changes" : "Schedule"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedFollowUps.length > 0 ? sortedFollowUps.map(fu => (
            <FollowUpItem key={fu.id} followUp={fu} onEdit={handleEditFollowUp} onStatusChange={handleFollowUpStatusChange} onDelete={handleDeleteFollowUp} />
          )) : <div className="text-muted-foreground">No follow-ups scheduled yet.</div>}
        </CardContent>
      </Card>
    </div>
  );
}

