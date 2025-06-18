"use client";

import { ProspectForm } from "@/components/prospects/ProspectForm";
import { addProspect as serverAddProspect } from "@/lib/data"; // Renamed to avoid conflict
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import React from "react";
import type { FunnelStageType } from "@/types";
import * as z from "zod"; // Ensure Zod is imported

const prospectFormSchemaClient = z.object({ 
  name: z.string().min(2).max(50),
  email: z.string().email("Invalid email address.").optional().or(z.literal('')),
  phone: z.string().optional(), // Phone is already optional, keep as is or refine further if needed
  initialData: z.string().min(5).max(500),
  currentFunnelStage: z.custom<FunnelStageType>(), 
  followUpStageNumber: z.number().min(1).max(12),
  avatarUrl: z.string().url().optional().or(z.literal('')),
});
type ProspectFormValuesClient = z.infer<typeof prospectFormSchemaClient>;


export default function AddProspectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleAddProspect = async (data: ProspectFormValuesClient) => {
    setIsSubmitting(true);
    try {
      const prospectDataForApi = {
        ...data,
        currentFunnelStage: data.currentFunnelStage as FunnelStageType, 
        email: data.email || undefined, // Ensure empty string becomes undefined for the API
        phone: data.phone || undefined,
        avatarUrl: data.avatarUrl || undefined,
      };
      await serverAddProspect(prospectDataForApi);
      toast({
        title: "Success",
        description: "New prospect added successfully.",
      });
      router.push("/prospects");
      router.refresh(); 
    } catch (error) {
      console.error("Failed to add prospect:", error);
      toast({
        title: "Error",
        description: "Could not add prospect. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return <ProspectForm onSubmit={handleAddProspect} isSubmitting={isSubmitting} />;
}
