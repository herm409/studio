
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import type { Prospect, FunnelStageType } from "@/types";
import { FunnelStages } from "@/types";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon, UploadCloud } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { storage, auth } from '@/lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

const prospectFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name must be at most 50 characters."),
  email: z.string().email("Invalid email address.").optional().or(z.literal('')),
  phone: z.string().optional().refine(val => !val || /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(val), {
    message: "Invalid phone number format.",
  }).or(z.literal('')),
  initialData: z.string().min(5, "Initial data must be at least 5 characters.").max(500, "Initial data must be at most 500 characters."),
  currentFunnelStage: z.enum(FunnelStages as [FunnelStageType, ...FunnelStageType[]], {
    required_error: "Funnel stage is required.",
  }),
  followUpStageNumber: z.coerce.number().min(1, "Must be at least 1.").max(12, "Must be at most 12."),
  avatarUrl: z.string().url("Invalid URL for avatar. Should be a valid image URL.").optional().or(z.literal('')), // Still needed for form data, but primarily set by file upload
  firstFollowUpDate: z.date({ required_error: "Initial follow-up date is required." }),
  firstFollowUpTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM).").default("10:00"),
  firstFollowUpMethod: z.enum(['Email', 'Call', 'In-Person'], { required_error: "Follow-up method is required."}).default("Call"),
  firstFollowUpNotes: z.string().max(500, "Notes are too long.").optional().default("Initial follow-up."),
});

export type ProspectFormValues = z.infer<typeof prospectFormSchema>;

interface ProspectFormProps {
  prospect?: Prospect; 
  onSubmit: (data: ProspectFormValues) => Promise<void>;
  isSubmitting?: boolean;
}

export function ProspectForm({ prospect, onSubmit, isSubmitting: parentIsSubmitting }: ProspectFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(prospect?.avatarUrl || null);
  const [internalIsSubmitting, setInternalIsSubmitting] = useState(false);
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    if (prospect?.avatarUrl) {
      setAvatarPreview(prospect.avatarUrl);
    }
  }, [prospect?.avatarUrl]);

  const defaultValues: ProspectFormValues = prospect
    ? { 
        name: prospect.name,
        email: prospect.email || "",
        phone: prospect.phone || "",
        initialData: prospect.initialData,
        currentFunnelStage: prospect.currentFunnelStage,
        followUpStageNumber: prospect.followUpStageNumber,
        avatarUrl: prospect.avatarUrl || "",
        firstFollowUpDate: new Date(), 
        firstFollowUpTime: "10:00",
        firstFollowUpMethod: "Call",
        firstFollowUpNotes: "Initial follow-up.",
      }
    : { 
        name: "",
        email: "",
        phone: "",
        initialData: "",
        currentFunnelStage: "Prospect",
        followUpStageNumber: 1,
        avatarUrl: "",
        firstFollowUpDate: new Date(), 
        firstFollowUpTime: "10:00",
        firstFollowUpMethod: "Call",
        firstFollowUpNotes: "Initial follow-up.",
      };

  const form = useForm<ProspectFormValues>({
    resolver: zodResolver(prospectFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "File too large", description: "Avatar image must be less than 5MB.", variant: "destructive" });
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (data: ProspectFormValues) => {
    if (!currentUserId) {
      toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }
    setInternalIsSubmitting(true);
    try {
      let finalAvatarUrl = data.avatarUrl; // Use existing URL if no new file
      if (avatarFile) {
        // For new prospects, we don't have an ID yet. Upload to a temp-like path.
        // For existing prospects, use prospect.id.
        const prospectIdForPath = prospect?.id || `temp_${Date.now()}`;
        const imageRef = storageRef(storage, `prospectAvatars/${currentUserId}/${prospectIdForPath}/${avatarFile.name}`);
        await uploadBytes(imageRef, avatarFile);
        finalAvatarUrl = await getDownloadURL(imageRef);
      }
      
      const dataToSubmit = { ...data, avatarUrl: finalAvatarUrl };
      await onSubmit(dataToSubmit);

    } catch (error: any) {
      console.error("Error submitting prospect form:", error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${prospect ? 'update' : 'add'} prospect.`,
        variant: "destructive",
      });
    } finally {
      setInternalIsSubmitting(false);
    }
  };
  
  const isEffectivelySubmitting = parentIsSubmitting || internalIsSubmitting;

  return (
    <Card className="max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">{prospect ? "Edit Prospect" : "Add New Prospect"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="flex flex-col items-center space-y-2">
              <Label htmlFor="avatar-upload">Prospect Avatar (Optional)</Label>
              <Avatar className="h-24 w-24 border-2">
                <AvatarImage src={avatarPreview || undefined} alt={form.getValues("name") || "Prospect"} data-ai-hint="person photo"/>
                <AvatarFallback className="text-3xl">{(form.getValues("name") || "P").charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('avatar-upload')?.click()}>
                <UploadCloud className="mr-2 h-4 w-4" /> Upload Image
              </Button>
              <Input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarFileChange} className="hidden" />
               <FormDescription>Max 5MB. JPG, PNG, GIF.</FormDescription>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name*</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="e.g. jane.doe@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="e.g. 555-123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="initialData"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Data &amp; Notes*</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Met at conference, interested in product X. Detail any past follow-ups here."
                      className="resize-y min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                   <FormDescription>
                    Background info, interests, how you met them. If prospect has prior interactions, detail them here.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="currentFunnelStage"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Current Funnel Stage*</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select funnel stage" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {FunnelStages.map(stage => (
                            <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="followUpStageNumber"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Number of Previous Follow-Ups (1-12)*</FormLabel>
                    <FormControl>
                        <Input type="number" min="1" max="12" placeholder="e.g. 1 for new, 12 for many" {...field} />
                    </FormControl>
                    <FormDescription>
                       Count of follow-ups already completed. For color-coding (1=fresh, 12=ripe) and AI context.
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            
            {!prospect && ( // Only show for new prospects
              <>
                <Separator className="my-8" />
                <div className="space-y-4">
                  <h3 className="text-lg font-medium font-headline">Schedule Initial Follow-Up</h3>
                  <FormField control={form.control} name="firstFollowUpDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date*</FormLabel>
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
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1))} />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        Every prospect should have an initial follow-up. Reminder: The first follow-up is typically most effective within 24-48 hours.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="firstFollowUpTime" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time*</FormLabel>
                        <FormControl><Input type="time" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="firstFollowUpMethod" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Method*</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {['Call', 'Email', 'In-Person'].map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="firstFollowUpNotes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl><Textarea placeholder="Initial follow-up objectives..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </>
            )}
            
            <CardFooter className="flex flex-col sm:flex-row sm:justify-end gap-3 sm:space-x-3 pt-4 px-0"> 
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isEffectivelySubmitting} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={isEffectivelySubmitting || (!form.formState.isDirty && !avatarFile && !!prospect)} className="w-full sm:w-auto">
                {isEffectivelySubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {prospect ? "Save Changes" : "Add Prospect &amp; Schedule Follow-Up"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
