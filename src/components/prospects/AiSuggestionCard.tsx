"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, Loader2 } from "lucide-react";
import React from "react";

interface AiSuggestionCardProps {
  title: string;
  description: string;
  buttonText: string;
  onGenerate: () => Promise<void>;
  isLoading: boolean;
  suggestionResult?: React.ReactNode;
  icon?: React.ElementType;
  children?: React.ReactNode; // Added children prop
}

export function AiSuggestionCard({
  title,
  description,
  buttonText,
  onGenerate,
  isLoading,
  suggestionResult,
  icon: Icon = Lightbulb,
  children, // Destructure children
}: AiSuggestionCardProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="w-6 h-6 text-primary" />
          <CardTitle className="font-headline text-xl">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {children} {/* Render children here, before button or results */}
        {!suggestionResult && (
          <Button onClick={onGenerate} disabled={isLoading} className="w-full mt-4"> {/* Added mt-4 if children are present */}
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Lightbulb className="mr-2 h-4 w-4" />
            )}
            {buttonText}
          </Button>
        )}
        {suggestionResult && (
          <div className="mt-4 p-4 bg-secondary/50 rounded-md border space-y-2 text-sm">
            {suggestionResult}
            <Button onClick={onGenerate} disabled={isLoading} variant="outline" size="sm" className="mt-2">
             {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Regenerate
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
