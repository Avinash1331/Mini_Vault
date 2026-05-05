import Layout from "@/components/layout";
import { useGetNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Mail, MessageSquare, Smartphone, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useGetNotifications({ 
    query: { queryKey: ["notifications"] } 
  });

  const markReadMutation = useMarkNotificationRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }
    }
  });

  const markAllReadMutation = useMarkAllNotificationsRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }
    }
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'EMAIL': return <Mail className="h-4 w-4" />;
      case 'SMS': return <Smartphone className="h-4 w-4" />;
      case 'IN_APP': return <MessageSquare className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Alerts & Notifications</h1>
            <p className="text-muted-foreground text-sm">System messages, simulated SMS, and email alerts.</p>
          </div>
          {data?.unreadCount ? (
            <Button 
              variant="outline" 
              size="sm" 
              className="font-mono text-xs border-border"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              MARK ALL READ
            </Button>
          ) : null}
        </div>

        <Card className="border-border bg-card/40 backdrop-blur-sm shadow-md">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Inbox</CardTitle>
            {data?.unreadCount ? (
              <Badge className="ml-2 bg-primary/20 text-primary border-primary/30 font-mono text-[10px]">{data.unreadCount} UNREAD</Badge>
            ) : null}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : !data || data.notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Bell className="h-12 w-12 mb-4 opacity-20" />
                <p className="font-mono text-sm">No notifications.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`flex gap-4 p-4 rounded-lg border ${
                      notif.status !== 'READ' 
                        ? 'bg-card border-primary/30 shadow-[0_0_10px_rgba(20,184,166,0.05)]' 
                        : 'bg-background/50 border-border/50'
                    } transition-colors`}
                  >
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      notif.status !== 'READ' ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'
                    }`}>
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{notif.type}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {new Date(notif.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className={`text-sm ${notif.status !== 'READ' ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                        {notif.message}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-2">
                        <Badge variant="outline" className={`font-mono text-[9px] ${
                          notif.status === 'FAILED' ? 'text-destructive border-destructive/30' : ''
                        }`}>
                          {notif.status}
                        </Badge>
                        {notif.status !== 'READ' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-[10px] font-mono px-2"
                            onClick={() => markReadMutation.mutate({ notificationId: notif.id })}
                            disabled={markReadMutation.isPending}
                          >
                            MARK READ
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
