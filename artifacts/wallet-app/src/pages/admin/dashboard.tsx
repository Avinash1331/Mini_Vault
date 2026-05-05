import Layout from "@/components/layout";
import { useGetAdminDashboard, useGetKafkaStats, useGetTransactionChart } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Users, AlertTriangle, Database, BarChart3, TrendingUp, ArrowRightLeft, ShieldAlert } from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboardPage() {
  const { data: dashboard, isLoading: isLoadingDashboard } = useGetAdminDashboard({
    query: { queryKey: ["admin", "dashboard"] }
  });

  const { data: kafkaStats, isLoading: isLoadingKafka } = useGetKafkaStats({
    query: { queryKey: ["admin", "kafka"] }
  });

  const { data: chartData, isLoading: isLoadingChart } = useGetTransactionChart({
    query: { queryKey: ["admin", "chart"] }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-destructive">Command Center</h1>
          <p className="text-muted-foreground text-sm">System overview and administrative controls.</p>
        </div>

        {/* Top Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border bg-card/40 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium uppercase font-mono tracking-wider text-muted-foreground">System Volume</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoadingDashboard ? <Skeleton className="h-8 w-24" /> : (
                <>
                  <div className="text-2xl font-bold font-mono">{formatCurrency(dashboard?.totalVolume || 0)}</div>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    {formatNumber(dashboard?.totalTransactions || 0)} total transactions
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card/40 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium uppercase font-mono tracking-wider text-muted-foreground">Active Users</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoadingDashboard ? <Skeleton className="h-8 w-24" /> : (
                <>
                  <div className="text-2xl font-bold font-mono">{formatNumber(dashboard?.activeUsers || 0)}</div>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    of {formatNumber(dashboard?.totalUsers || 0)} total registered
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-destructive/30 bg-destructive/5 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium uppercase font-mono tracking-wider text-destructive">Fraud Alerts</CardTitle>
              <ShieldAlert className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {isLoadingDashboard ? <Skeleton className="h-8 w-24" /> : (
                <>
                  <div className="text-2xl font-bold font-mono text-destructive">{formatNumber(dashboard?.fraudAlerts || 0)}</div>
                  <p className="text-xs text-destructive/70 font-mono mt-1">
                    Requires immediate review
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card/40 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium uppercase font-mono tracking-wider text-muted-foreground">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoadingDashboard ? <Skeleton className="h-8 w-24" /> : (
                <>
                  <div className="text-2xl font-bold font-mono text-primary">{((dashboard?.successRate || 0) * 100).toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    {formatNumber(dashboard?.failedTransactions || 0)} failed txns
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts & Infrastructure */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="col-span-2 border-border bg-card/40 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
                Transaction Volume (7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingChart ? (
                <Skeleton className="h-[300px] w-full" />
              ) : !chartData?.data || chartData.data.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground font-mono text-sm border border-dashed border-border rounded">
                  No data available
                </div>
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={10} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        yAxisId="left"
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={10} 
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `₹${value / 1000}k`}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={10} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        itemStyle={{ fontFamily: 'var(--app-font-mono)', fontSize: '12px' }}
                        labelStyle={{ fontFamily: 'var(--app-font-mono)', fontSize: '12px', color: 'hsl(var(--muted-foreground))', marginBottom: '8px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', fontFamily: 'var(--app-font-mono)' }} />
                      <Bar yAxisId="left" dataKey="volume" name="Volume (₹)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="successful" name="Count" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card/40 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-5 w-5 text-primary" />
                Kafka Event Bus
              </CardTitle>
              <CardDescription>Real-time message queue status</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingKafka ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : !kafkaStats ? (
                <div className="text-center py-8 text-muted-foreground font-mono text-sm">Offline</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-sm font-medium">Total Messages</span>
                    <span className="font-mono font-bold text-primary">{formatNumber(kafkaStats.totalMessages)}</span>
                  </div>
                  
                  <div className="space-y-3">
                    {kafkaStats.topics.map(topic => (
                      <div key={topic.name} className="p-3 bg-background/50 rounded-lg border border-border">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-mono font-bold text-muted-foreground truncate" title={topic.name}>
                            {topic.name.replace('wallet.', '').toUpperCase()}
                          </span>
                          {topic.pendingCount > 0 ? (
                            <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 text-[9px] px-1 py-0 h-4">
                              {topic.pendingCount} LAG
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-primary border-primary/30 text-[9px] px-1 py-0 h-4">
                              SYNCED
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                          <div>
                            <span className="text-muted-foreground uppercase mr-1">Processed:</span>
                            <span className="text-foreground">{formatNumber(topic.processedCount)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground uppercase mr-1">Total:</span>
                            <span className="text-foreground">{formatNumber(topic.messageCount)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
