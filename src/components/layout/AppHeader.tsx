
"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Bell, UserCircle, LogOut, User, Mail, Phone, CalendarDays, AlertTriangle, Clock, Info, ArrowRight, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { hasActiveAlerts, getActiveAlertFollowUps, type AlertNotificationItem } from "@/lib/data";
import { format, parseISO, isToday, isPast } from "date-fns";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  title: string;
}

const getMethodIcon = (method?: AlertNotificationItem['followUp']['method']) => {
  switch(method) {
    case 'Email': return <Mail className="w-4 h-4 text-muted-foreground shrink-0" />;
    case 'Call': return <Phone className="w-4 h-4 text-muted-foreground shrink-0" />;
    case 'In-Person': return <UserIcon className="w-4 h-4 text-muted-foreground shrink-0" />; // Changed from User to UserIcon to avoid conflict
    default: return <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />;
  }
};

export function AppHeader({ title }: AppHeaderProps) {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();
  const [showAlertIndicator, setShowAlertIndicator] = useState(false);
  const [notifications, setNotifications] = useState<AlertNotificationItem[]>([]);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const fetchAlertData = async () => {
    if (user) {
      setShowAlertIndicator(await hasActiveAlerts());
      if (isPopoverOpen) {
        setIsNotificationsLoading(true);
        setNotifications(await getActiveAlertFollowUps());
        setIsNotificationsLoading(false);
      }
    } else {
      setShowAlertIndicator(false);
      setNotifications([]);
    }
  };

  useEffect(() => {
    fetchAlertData();
  }, [user, isPopoverOpen]);


  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur md:px-6">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      <h1 className="text-xl font-semibold md:text-2xl font-headline">{title}</h1>
      <div className="ml-auto flex items-center gap-4">
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full relative">
              <Bell className="h-5 w-5" />
              {showAlertIndicator && (
                <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-1 ring-background" />
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="p-4 border-b">
              <h3 className="text-lg font-medium font-headline">Notifications</h3>
            </div>
            <ScrollArea className="h-[300px]">
              {isNotificationsLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Loading alerts...</div>
              ) : notifications.length > 0 ? (
                <div className="p-2 space-y-1">
                  {notifications.map(item => {
                    const followUpDate = parseISO(item.followUp.date);
                    const isItemOverdue = isPast(followUpDate) && !isToday(followUpDate);
                    const isItemToday = isToday(followUpDate);
                    return (
                      <Link
                        key={item.followUp.id}
                        href={`/prospects/${item.prospectId}`}
                        className="block p-3 rounded-md hover:bg-accent transition-colors"
                        onClick={() => setIsPopoverOpen(false)}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-8 w-8 border mt-0.5 shrink-0">
                            <AvatarImage src={item.prospectAvatarUrl || `https://placehold.co/32x32.png?text=${item.prospectName.charAt(0)}`} alt={item.prospectName} data-ai-hint="person face"/>
                            <AvatarFallback>{item.prospectName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold truncate">{item.prospectName}</p>
                              {isItemOverdue && <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />}
                              {isItemToday && !isItemOverdue && <Clock className="w-4 h-4 text-primary shrink-0" />}
                            </div>
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                {getMethodIcon(item.followUp.method)} {item.followUp.method} - {format(followUpDate, "MMM d")}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{item.followUp.notes}</p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <Info className="mx-auto h-6 w-6 mb-1" />
                  No active alerts.
                </div>
              )}
            </ScrollArea>
            <Separator />
             <div className="p-2 text-center">
                <Button variant="link" size="sm" asChild onClick={() => setIsPopoverOpen(false)}>
                    <Link href="/calendar">
                        View Calendar <ArrowRight className="ml-1 h-3 w-3"/>
                    </Link>
                </Button>
             </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.photoURL || "https://placehold.co/100x100.png"} alt="User avatar" data-ai-hint="user avatar"/>
                <AvatarFallback>
                  {user?.email ? user.email.charAt(0).toUpperCase() : <UserCircle className="h-6 w-6" />}
                </AvatarFallback>
              </Avatar>
              <span className="sr-only">User menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.email || "My Account"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} disabled={loading}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

