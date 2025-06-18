
"use client";

import { useEffect, useState, useMemo } from 'react';
import { getProspects } from "@/lib/data";
import type { Prospect } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, ArrowRight, Mail, Phone, CalendarDays, Search, Filter, SortAsc, SortDesc, MessageSquareText, AlertTriangle, Info } from "lucide-react";
import Link from "next/link";
import { FunnelProgress } from "@/components/shared/FunnelProgress";
import { ColorCodedIndicator } from "@/components/shared/ColorCodedIndicator";
import { format, parseISO, isPast, isValid, isToday } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

type SortOption = "name-asc" | "name-desc" | "nextFollowUp-asc" | "nextFollowUp-desc" | "followUpCount-asc" | "followUpCount-desc" | "lastContacted-asc" | "lastContacted-desc";

export default function ProspectsPage() {
  const { user } = useAuth();
  const [allProspects, setAllProspects] = useState<Prospect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("name-asc");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [filterFollowUpCount, setFilterFollowUpCount] = useState<string>("all"); 

  useEffect(() => {
    async function loadProspects() {
      if (!user) {
        setIsLoading(false); 
        return;
      }
      setIsLoading(true);
      try {
        const prospectsData = await getProspects();
        setAllProspects(prospectsData);
      } catch (error) {
        console.error("Failed to load prospects:", error);
        // TODO: Add toast notification for error
      } finally {
        setIsLoading(false);
      }
    }
    loadProspects();
  }, [user]);

  const filteredAndSortedProspects = useMemo(() => {
    let prospects = [...allProspects];

    // Search
    if (searchTerm) {
      prospects = prospects.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        p.initialData.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter: Overdue
    if (showOverdueOnly) {
      prospects = prospects.filter(p => {
        if (!p.nextFollowUpDate) return false;
        const nextFollowUp = parseISO(p.nextFollowUpDate);
        return isValid(nextFollowUp) && isPast(nextFollowUp) && !isToday(nextFollowUp); 
      });
    }
    
    // Filter: Follow-Up Count
    if (filterFollowUpCount && filterFollowUpCount !== "all") { 
        const countNum = parseInt(filterFollowUpCount, 10);
        prospects = prospects.filter(p => p.followUpStageNumber === countNum);
    }

    // Sort
    prospects.sort((a, b) => {
      switch (sortOption) {
        case "name-asc": return a.name.localeCompare(b.name);
        case "name-desc": return b.name.localeCompare(a.name);
        case "nextFollowUp-asc": {
          const dateA = a.nextFollowUpDate ? parseISO(a.nextFollowUpDate).getTime() : Infinity;
          const dateB = b.nextFollowUpDate ? parseISO(b.nextFollowUpDate).getTime() : Infinity;
          if (dateA === Infinity && dateB === Infinity) return 0;
          return dateA - dateB;
        }
        case "nextFollowUp-desc": {
          const dateA = a.nextFollowUpDate ? parseISO(a.nextFollowUpDate).getTime() : -Infinity;
          const dateB = b.nextFollowUpDate ? parseISO(b.nextFollowUpDate).getTime() : -Infinity;
          if (dateA === -Infinity && dateB === -Infinity) return 0;
          return dateB - dateA;
        }
        case "followUpCount-asc": return a.followUpStageNumber - b.followUpStageNumber;
        case "followUpCount-desc": return b.followUpStageNumber - a.followUpStageNumber;
        case "lastContacted-asc": {
          const dateA = a.lastContactedDate ? parseISO(a.lastContactedDate).getTime() : Infinity;
          const dateB = b.lastContactedDate ? parseISO(b.lastContactedDate).getTime() : Infinity;
          if (dateA === Infinity && dateB === Infinity) return 0;
          return dateA - dateB;
        }
        case "lastContacted-desc": {
          const dateA = a.lastContactedDate ? parseISO(a.lastContactedDate).getTime() : -Infinity;
          const dateB = b.lastContactedDate ? parseISO(b.lastContactedDate).getTime() : -Infinity;
          if (dateA === -Infinity && dateB === -Infinity) return 0;
          return dateB - dateA;
        }
        default: return 0;
      }
    });

    return prospects;
  }, [allProspects, searchTerm, sortOption, showOverdueOnly, filterFollowUpCount]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading prospects...</p>
      </div>
    );
  }
  
  if (!user && !isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground">Please log in to view your prospects.</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Your Prospects</h1>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href="/prospects/add">
            <PlusCircle className="mr-2 h-5 w-5" />
            <span className="hidden sm:inline">Add New Prospect</span>
            <span className="sm:hidden">Add</span>
          </Link>
        </Button>
      </div>

      {/* Search and Filters Bar */}
      <Card className="p-4 sm:p-6 shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2 lg:col-span-1">
            <Label htmlFor="search-prospects" className="text-sm font-medium">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="search-prospects"
                type="text"
                placeholder="Search by name, email, notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="sort-prospects" className="text-sm font-medium">Sort By</Label>
            <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
              <SelectTrigger id="sort-prospects">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="nextFollowUp-asc">Next Follow-Up (Soonest)</SelectItem>
                <SelectItem value="nextFollowUp-desc">Next Follow-Up (Latest)</SelectItem>
                <SelectItem value="followUpCount-asc">Follow-Ups Done (Low-High)</SelectItem>
                <SelectItem value="followUpCount-desc">Follow-Ups Done (High-Low)</SelectItem>
                <SelectItem value="lastContacted-asc">Last Contacted (Oldest)</SelectItem>
                <SelectItem value="lastContacted-desc">Last Contacted (Newest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center"><Filter className="w-4 h-4 mr-1.5"/>Filters</Label>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="overdue-filter" checked={showOverdueOnly} onCheckedChange={(checked) => setShowOverdueOnly(Boolean(checked))} />
                <Label htmlFor="overdue-filter" className="text-sm font-normal">Overdue</Label>
              </div>
              <div className="flex-1 min-w-[150px]"> {/* Increased min-width for longer label */}
                 <Select value={filterFollowUpCount} onValueChange={setFilterFollowUpCount}>
                    <SelectTrigger id="followup-count-filter" className="h-9 text-xs">
                        <SelectValue placeholder="Follow-Ups Done (1-12)" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Follow-Up Counts</SelectItem>
                        {Array.from({length: 12}, (_, i) => i + 1).map(countNum => (
                            <SelectItem key={countNum} value={String(countNum)}> {countNum} Follow-Up{countNum === 1 ? "" : "s"} Done</SelectItem>
                        ))}
                    </SelectContent>
                 </Select>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {filteredAndSortedProspects.length === 0 && !isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>No Prospects Found</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center text-center py-10">
            <Info className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No prospects match your current search or filters.
              {allProspects.length > 0 ? " Try adjusting your criteria." : " Start by adding your first prospect!"}
            </p>
            {allProspects.length === 0 && (
                 <Button asChild size="sm" className="mt-4">
                    <Link href="/prospects/add">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Prospect
                    </Link>
                 </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAndSortedProspects.map(prospect => {
            const isOverdue = prospect.nextFollowUpDate && isValid(parseISO(prospect.nextFollowUpDate)) && isPast(parseISO(prospect.nextFollowUpDate)) && !isToday(parseISO(prospect.nextFollowUpDate));
            return (
              <Card key={prospect.id} className={`flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 ${isOverdue ? 'border-destructive' : ''}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 min-w-0"> {/* Added min-w-0 for the container of avatar and text */}
                      <Avatar className="h-12 w-12 border shrink-0">
                        <AvatarImage src={prospect.avatarUrl} alt={prospect.name} data-ai-hint="person face"/>
                        <AvatarFallback>{prospect.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0"> {/* Added min-w-0 here */}
                        <CardTitle className="text-lg font-headline break-words">{prospect.name}</CardTitle>
                        {prospect.email && <CardDescription className="text-xs flex items-center break-words"><Mail className="w-3 h-3 mr-1 shrink-0"/>{prospect.email}</CardDescription>}
                      </div>
                    </div>
                    <ColorCodedIndicator colorCode={prospect.colorCode} size="md" />
                  </div>
                  {prospect.phone && (
                    <div className="flex items-center space-x-2 mt-2">
                       <Button variant="outline" size="xs" asChild className="flex-1">
                            <a href={`tel:${prospect.phone}`} aria-label={`Call ${prospect.name}`}>
                                <Phone className="w-3.5 h-3.5 mr-1.5" /> Call
                            </a>
                        </Button>
                        <Button variant="outline" size="xs" asChild className="flex-1">
                            <a href={`sms:${prospect.phone}`} aria-label={`Text ${prospect.name}`}>
                                <MessageSquareText className="w-3.5 h-3.5 mr-1.5" /> Text
                            </a>
                        </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="flex-grow space-y-3">
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Funnel Stage</h4>
                    <FunnelProgress currentStage={prospect.currentFunnelStage} />
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                      {prospect.lastContactedDate && isValid(parseISO(prospect.lastContactedDate)) && (
                          <p className="flex items-center"><CalendarDays className="w-3 h-3 mr-1.5"/>Last Contact: {format(parseISO(prospect.lastContactedDate), "MMM d, yy")}</p>
                      )}
                      {prospect.nextFollowUpDate && isValid(parseISO(prospect.nextFollowUpDate)) ? (
                          <p className={`flex items-center font-medium ${isOverdue ? 'text-destructive' : 'text-primary'}`}>
                            {isOverdue && <AlertTriangle className="w-3 h-3 mr-1"/>}
                            <CalendarDays className="w-3 h-3 mr-1.5"/>Next Follow-Up: {format(parseISO(prospect.nextFollowUpDate), "MMM d, yy")}
                          </p>
                      ) : (
                         <p className="flex items-center text-muted-foreground/70"><CalendarDays className="w-3 h-3 mr-1.5"/>No upcoming follow-up</p>
                      )}
                      <div className="text-xs">Follow-Ups Done: <Badge variant="secondary" className="px-1.5 py-0 text-xs">{prospect.followUpStageNumber}</Badge></div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 break-words" title={prospect.initialData}>
                    {prospect.initialData}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="default" className="w-full">
                    <Link href={`/prospects/${prospect.id}`}>
                      View Details <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
