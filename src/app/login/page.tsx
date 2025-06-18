import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GanttChartSquare } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <GanttChartSquare className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="text-3xl font-bold font-headline">Welcome to Follow-Up Flow</CardTitle>
          <CardDescription>Please sign in to continue (Demo)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" placeholder="user@example.com" defaultValue="demo@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" defaultValue="password" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" asChild>
            {/* In a real app, this would handle authentication */}
            <Link href="/dashboard">Sign In (Demo)</Link>
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            This is a demo application. No actual login is performed.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
