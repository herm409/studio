
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Prospect } from '@/types';
import { getProspectById, updateProspect as serverUpdateProspect } from '@/lib/data';
import { ProspectForm, type ProspectFormValues } from '@/components/prospects/ProspectForm';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function EditProspectPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const prospectId = params.id as string;

  const [prospect, setProspect] = useState<Prospect | null | undefined>(undefined); // undefined for initial loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (prospectId) {
      setIsLoading(true);
      getProspectById(prospectId)
        .then(data => {
          if (data) {
            setProspect(data);
          } else {
            setProspect(null); // Not found
            toast({ title: "Error", description: "Prospect not found.", variant: "destructive" });
            router.push('/prospects');
          }
        })
        .catch(error => {
          console.error("Failed to fetch prospect:", error);
          setProspect(null);
          toast({ title: "Error", description: "Failed to load prospect data.", variant: "destructive" });
        })
        .finally(() => setIsLoading(false));
    }
  }, [prospectId, router, toast]);

  const handleUpdateProspect = async (data: ProspectFormValues) => {
    if (!prospect) return;
    setIsSubmitting(true);

    try {
      // Exclude firstFollowUp fields as they are not part of Prospect update
      const { 
        firstFollowUpDate, 
        firstFollowUpTime, 
        firstFollowUpMethod, 
        firstFollowUpNotes, 
        ...prospectUpdates 
      } = data;

      await serverUpdateProspect(prospect.id, prospectUpdates);
      toast({
        title: "Success",
        description: "Prospect updated successfully.",
      });
      router.push(`/prospects/${prospect.id}`); // Navigate to detail page or list
    } catch (error: any) {
      console.error("Failed to update prospect:", error);
      toast({
        title: "Error Updating Prospect",
        description: error.message || "Could not update prospect. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || prospect === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading prospect for editing...</p>
      </div>
    );
  }

  if (prospect === null) {
    // Already handled by toast and redirect, but good to have a fallback UI
    return (
        <Card>
            <CardHeader><CardTitle>Prospect Not Found</CardTitle></CardHeader>
            <CardContent><p>The requested prospect could not be found.</p></CardContent>
        </Card>
    );
  }

  return (
    <ProspectForm
      prospect={prospect}
      onSubmit={handleUpdateProspect}
      isSubmitting={isSubmitting}
    />
  );
}
