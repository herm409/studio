"use client";

import { ProspectForm } from "@/components/prospects/ProspectForm";
import { addProspect as serverAddProspect } from "@/lib/data"; // Renamed to avoid conflict
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import React from "react";
import type { FunnelStageType } from "@/types";

const prospectFormSchemaClient = z.object({ // Define Zod schema for client-side use if needed, or import if shared
  name: z.string().min(2).max(50),
  email: z.string().email(),
  phone: z.string().optional(),
  initialData: z.string().min(5).max(500),
  currentFunnelStage: z.custom<FunnelStageType>(), // Use z.custom for enum types from '@/types'
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
      // Explicitly cast FunnelStageType as it's checked by Zod
      const prospectDataForApi = {
        ...data,
        currentFunnelStage: data.currentFunnelStage as FunnelStageType, 
      };
      await serverAddProspect(prospectDataForApi);
      toast({
        title: "Success",
        description: "New prospect added successfully.",
      });
      router.push("/prospects");
      router.refresh(); // Ensures the prospects list is updated
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

// Need to import Zod for client-side schema if not already.
import * as z from "zod";
