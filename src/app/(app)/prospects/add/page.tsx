
"use client";

import { ProspectForm } from "@/components/prospects/ProspectForm";
import type { ProspectFormValues as ProspectFormValuesType } from "@/components/prospects/ProspectForm"; // Import the type
import { addProspect as serverAddProspect, addFollowUp as serverAddFollowUp } from "@/lib/data"; 
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import React from "react";
import type { FunnelStageType } from "@/types";
import * as z from "zod"; 
import { format } from "date-fns";

// This schema must match the one in ProspectForm.tsx
const prospectFormSchemaClient = z.object({ 
  name: z.string().min(2).max(50),
  email: z.string().email("Invalid email address.").optional().or(z.literal('')),
  phone: z.string().optional().refine(val => !val || /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(val), {
    message: "Invalid phone number format.",
  }),
  initialData: z.string().min(5).max(500),
  currentFunnelStage: z.custom<FunnelStageType>(), 
  followUpStageNumber: z.coerce.number().min(1).max(12),
  avatarUrl: z.string().url("Invalid URL for avatar.").optional().or(z.literal('')),
  firstFollowUpDate: z.date({ required_error: "Initial follow-up date is required." }),
  firstFollowUpTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM).").default("10:00"),
  firstFollowUpMethod: z.enum(['Email', 'Call', 'In-Person'], { required_error: "Follow-up method is required."}).default("Call"),
  firstFollowUpNotes: z.string().max(500, "Notes are too long.").optional().default("Initial follow-up."),
});
// Use the imported type for values
type ProspectFormValuesClient = ProspectFormValuesType;


export default function AddProspectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleAddProspect = async (data: ProspectFormValuesClient) => {
    setIsSubmitting(true);
    try {
      const prospectDataForCreation = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        initialData: data.initialData,
        currentFunnelStage: data.currentFunnelStage,
        followUpStageNumber: data.followUpStageNumber,
        avatarUrl: data.avatarUrl,
      };
      // The serverAddProspect function in data.ts now handles userId internally
      const newProspect = await serverAddProspect(prospectDataForCreation); 
      toast({
        title: "Success",
        description: "New prospect added successfully.",
      });

      // Schedule the initial follow-up
      if (newProspect && data.firstFollowUpDate) {
        try {
          await serverAddFollowUp({
            prospectId: newProspect.id,
            date: format(data.firstFollowUpDate, "yyyy-MM-dd"),
            time: data.firstFollowUpTime,
            method: data.firstFollowUpMethod,
            notes: data.firstFollowUpNotes || "Initial follow-up.", // Ensure notes is a string
            status: 'Pending',
          });
          toast({
            title: "Follow-up Scheduled",
            description: "Initial follow-up has been scheduled.",
          });
        } catch (followUpError: any) {
          console.error("Failed to schedule initial follow-up:", followUpError);
          toast({
            title: "Follow-up Error",
            description: followUpError.message || "Could not schedule initial follow-up.",
            variant: "destructive",
          });
        }
      }
      router.push("/prospects");
    } catch (error: any) {
      console.error("Failed to add prospect:", error);
      toast({
        title: "Error Adding Prospect",
        description: error.message || "Could not add prospect. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return <ProspectForm onSubmit={handleAddProspect} isSubmitting={isSubmitting} />;
}
