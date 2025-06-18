
"use client";

import { ProspectForm } from "@/components/prospects/ProspectForm";
import type { ProspectFormValues as ProspectFormValuesType } from "@/components/prospects/ProspectForm"; 
import { addProspect as serverAddProspect, addFollowUp as serverAddFollowUp, updateProspect as serverUpdateProspect } from "@/lib/data"; 
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import React from "react";
import { format } from "date-fns";


export default function AddProspectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleAddProspect = async (data: ProspectFormValuesType) => {
    setIsSubmitting(true);
    try {
      const prospectDataForCreation = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        initialData: data.initialData,
        currentFunnelStage: data.currentFunnelStage,
        followUpStageNumber: data.followUpStageNumber,
        avatarUrl: data.avatarUrl, // This URL is now from ProspectForm's internal upload logic
      };
      
      const newProspect = await serverAddProspect(prospectDataForCreation); 
      toast({
        title: "Success",
        description: "New prospect added successfully.",
      });

      if (newProspect && data.firstFollowUpDate) {
        try {
          await serverAddFollowUp({
            prospectId: newProspect.id,
            date: format(data.firstFollowUpDate, "yyyy-MM-dd"),
            time: data.firstFollowUpTime,
            method: data.firstFollowUpMethod,
            notes: data.firstFollowUpNotes || "Initial follow-up.",
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
