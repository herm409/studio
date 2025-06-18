
"use client";

import { ProspectForm } from "@/components/prospects/ProspectForm";
import { addProspect as serverAddProspect } from "@/lib/data"; 
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import React from "react";
import type { FunnelStageType } from "@/types";
import * as z from "zod"; 

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
});
type ProspectFormValuesClient = z.infer<typeof prospectFormSchemaClient>;


export default function AddProspectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleAddProspect = async (data: ProspectFormValuesClient) => {
    setIsSubmitting(true);
    try {
      // The serverAddProspect function in data.ts now handles userId internally
      await serverAddProspect(data); 
      toast({
        title: "Success",
        description: "New prospect added successfully.",
      });
      router.push("/prospects");
      // router.refresh(); // Not strictly needed if list page re-fetches, but good practice
    } catch (error: any) {
      console.error("Failed to add prospect:", error);
      toast({
        title: "Error",
        description: error.message || "Could not add prospect. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return <ProspectForm onSubmit={handleAddProspect} isSubmitting={isSubmitting} />;
}
