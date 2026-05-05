import Layout from "@/components/layout";
import { useGetFraudAlerts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminFraudPage() {
  const { data, isLoading } = useGetFraudAlerts({
    query: { queryKey: ["admin", "fraud"] }
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'HIGH': return <ShieldAlert className="h-5 w-5 text-destructive" />;
      case 'MEDIUM': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default: return <Info className="h-5 w-5 text-blue-400" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'HIGH': return <Badge variant="destructive" className="font-mono text-[10px]">HIGH SEVERITY</Badge>;
      case 'MEDIUM': return <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 font-mono text-[10px]">MEDIUM SEVERITY</Badge>;
      default: return <Badge variant="outline" className="text-blue-400 border-blue-400/30 font-mono text-[10px]">LOW SEVERITY</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-destructive">Fraud Intelligence</h1>
          <p className="text-muted-foreground text-sm">Automated risk detection and anomaly flagging.</p>
        </div>

        <Card className="border-border bg-card/40 backdrop-blur-sm shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-destructive" />
                Alert Feed
              </CardTitle>
              <CardDescription>Real-time detection engine events</CardDescription>
            </div>
            {data?.total ? (
              <Badge variant="destructive" className="font-mono text-xs">{data.total} ACTIVE THREATS</Badge>
            ) : null}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : !data || data.alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <ShieldAlert className="h-12 w-12 mb-4 opacity-20" />
                <p className="font-mono text-sm">No fraud alerts detected.</p>
                <p className="text-xs mt-1">System parameters nominal.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.alerts.map((alert) => (
                  <div key={alert.id} className={`flex flex-col md:flex-row gap-4 p-4 rounded-lg border bg-background/50 transition-colors ${
                    alert.severity === 'HIGH' ? 'border-destructive/50 shadow-[0_0_15px_rgba(220,38,38,0.1)]' : 'border-border'
                  }`}>
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background border ${
                        alert.severity === 'HIGH' ? 'border-destructive/30' : 'border-border'
                      }`}>
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div className="space-y-1 w-full">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">{alert.type.replace('_', ' ')}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {new Date(alert.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {alert.description}
                        </p>
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/50 text-[10px] font-mono text-muted-foreground">
                          <div>
                            <span className="uppercase">Entity: </span>
                            <span className="text-foreground">{alert.userName || alert.userEmail || alert.userId}</span>
                          </div>
                          {alert.transactionId && (
                            <div className="text-right">
                              <span className="uppercase">Txn Ref: </span>
                              <span className="text-foreground truncate w-24 inline-block align-bottom" title={alert.transactionId}>{alert.transactionId}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-2 shrink-0 md:w-32 border-t md:border-t-0 md:border-l border-border/50 pt-4 md:pt-0 md:pl-4">
                      {getSeverityBadge(alert.severity)}
                      <Button variant="outline" size="sm" className="h-7 text-[10px] font-mono w-full border-border">
                        INVESTIGATE
                      </Button>
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
