import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Construction } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold font-headline">Settings</h1>
        <p className="text-muted-foreground">Manage your application preferences and account details.</p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Profile Information</CardTitle>
          <CardDescription>Update your personal details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" defaultValue="Demo User" />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" defaultValue="demo@example.com" disabled />
            </div>
          </div>
          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <Input id="timezone" defaultValue="America/New_York (Placeholder)" disabled />
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>

      <Separator />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Notification Preferences</CardTitle>
          <CardDescription>Choose how you want to be notified.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="emailNotifications" defaultChecked />
            <Label htmlFor="emailNotifications">Email notifications for upcoming follow-ups</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="inAppNotifications" defaultChecked />
            <Label htmlFor="inAppNotifications">In-app notifications for mentions and tasks</Label>
          </div>
           <div className="flex items-center space-x-2">
            <Checkbox id="gamificationNotifications" />
            <Label htmlFor="gamificationNotifications">Gamification milestone notifications</Label>
          </div>
          <Button>Save Preferences</Button>
        </CardContent>
      </Card>
      
      <Separator />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Funnel Stages & Calendar</CardTitle>
          <CardDescription>Customization options (coming soon).</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-10">
          <Construction className="mx-auto h-12 w-12 mb-4" />
          <p>Custom Funnel Stage management and Calendar Integration settings will be available here in a future update.</p>
        </CardContent>
      </Card>
    </div>
  );
}
