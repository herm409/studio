
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import React from "react";

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
  followUpStageNumber: z.coerce.number().min(1).max(12, "Follow-up stage must be between 1 and 12."),
  avatarUrl: z.string().url("Invalid URL format for avatar.").optional().or(z.literal('')),
});

type ProspectFormValues = z.infer<typeof prospectFormSchema>;

interface ProspectFormProps {
  prospect?: Prospect;
  onSubmit: (data: ProspectFormValues) => Promise<void>;
  isSubmitting?: boolean;
}

export function ProspectForm({ prospect, onSubmit, isSubmitting }: ProspectFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const defaultValues: ProspectFormValues = prospect
    ? {
        name: prospect.name,
        email: prospect.email || "",
        phone: prospect.phone || "",
        initialData: prospect.initialData,
        currentFunnelStage: prospect.currentFunnelStage,
        followUpStageNumber: prospect.followUpStageNumber,
        avatarUrl: prospect.avatarUrl || "",
      }
    : {
        name: "",
        email: "",
        phone: "",
        initialData: "",
        currentFunnelStage: "Prospect",
        followUpStageNumber: 1,
        avatarUrl: "",
      };

  const form = useForm<ProspectFormValues>({
    resolver: zodResolver(prospectFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const handleSubmit = async (data: ProspectFormValues) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error("Error submitting prospect form:", error);
      toast({
        title: "Error",
        description: `Failed to ${prospect ? 'update' : 'add'} prospect. Please try again.`,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">{prospect ? "Edit Prospect" : "Add New Prospect"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
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
                    <FormLabel>Email Address (Optional)</FormLabel>
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
                    <FormLabel>Phone Number (Optional)</FormLabel>
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
                  <FormLabel>Initial Data & Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Met at conference, interested in product X, budget around $5k."
                      className="resize-y min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Background information, interests, how you met them, etc.
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
                    <FormLabel>Current Funnel Stage</FormLabel>
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
                    <FormLabel>Follow-Up Stage (1-12)</FormLabel>
                    <FormControl>
                        <Input type="number" min="1" max="12" placeholder="e.g. 1 for new, 12 for very mature" {...field} />
                    </FormControl>
                    <FormDescription>
                        Used for color-coding (1=fresh, 12=ripe).
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avatar URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. https://placehold.co/100x100.png" {...field} />
                  </FormControl>
                  <FormDescription>
                    Link to an image for the prospect. If blank, a default will be used.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col sm:flex-row sm:justify-end gap-3 sm:space-x-3 pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !form.formState.isDirty && !!prospect} className="w-full sm:w-auto">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {prospect ? "Save Changes" : "Add Prospect"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
