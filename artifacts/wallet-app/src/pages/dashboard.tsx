import { useGetBalance, useListTransactions } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, Plus, ArrowUpRight, ArrowDownLeft, Activity, Bell } from "lucide-react";
import { Link } from "wouter";
import Layout from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const { data: balanceData, isLoading: isLoadingBalance } = useGetBalance({
    query: { queryKey: ["balance"] }
  });

  const { data: transactionsData, isLoading: isLoadingTransactions } = useListTransactions(
    { limit: 5 },
    { query: { queryKey: ["transactions", "recent"] } }
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <Badge className="bg-primary/20 text-primary border-primary/30 font-mono text-[10px]">SUCCESS</Badge>;
      case 'FAILED': return <Badge variant="destructive" className="font-mono text-[10px]">FAILED</Badge>;
      case 'PENDING':
      case 'PROCESSING': 
      case 'INITIATED': return <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 font-mono text-[10px]">{status}</Badge>;
      case 'REVERSED': return <Badge variant="outline" className="text-blue-400 border-blue-400/30 font-mono text-[10px]">REVERSED</Badge>;
      default: return <Badge variant="outline" className="font-mono text-[10px]">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string, isCredit: boolean) => {
    if (type === 'TRANSFER') return <ArrowRightLeft className={`h-4 w-4 ${isCredit ? 'text-primary' : 'text-destructive'}`} />;
    if (type === 'ADD_MONEY') return <Plus className="h-4 w-4 text-primary" />;
    if (type === 'WITHDRAW') return <ArrowUpRight className="h-4 w-4 text-destructive" />;
    if (type === 'REFUND') return <ArrowDownLeft className="h-4 w-4 text-primary" />;
    return <Activity className="h-4 w-4" />;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
            <p className="text-muted-foreground text-sm">Monitor your assets and activity.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/transfer" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transfer Funds
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="col-span-full lg:col-span-2 border-border shadow-md bg-card/40 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Activity className="h-32 w-32" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="uppercase tracking-wider font-mono text-xs">Total Balance</CardDescription>
              <CardTitle className="text-4xl md:text-5xl font-mono tracking-tight">
                {isLoadingBalance ? <Skeleton className="h-12 w-48" /> : formatCurrency(balanceData?.balance || 0)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingBalance ? (
                <Skeleton className="h-4 w-32 mt-4" />
              ) : (
                <div className="mt-4 flex items-center space-x-4 text-sm font-mono">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-[10px] uppercase">Daily Limit</span>
                    <span>{formatCurrency(balanceData?.dailyTransferLimit || 0)}</span>
                  </div>
                  <div className="h-8 w-px bg-border"></div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-[10px] uppercase">Used Today</span>
                    <span className="text-yellow-500">{formatCurrency(balanceData?.dailyTransferUsed || 0)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-full md:col-span-1 border-border shadow-md bg-card/40 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Link href="/transfer">
                <Button variant="outline" className="w-full justify-start font-mono text-xs h-12 border-border hover:bg-secondary hover:text-secondary-foreground">
                  <ArrowRightLeft className="mr-2 h-4 w-4 text-primary" />
                  SEND MONEY
                </Button>
              </Link>
              <Button variant="outline" className="w-full justify-start font-mono text-xs h-12 border-border hover:bg-secondary hover:text-secondary-foreground">
                <Plus className="mr-2 h-4 w-4 text-primary" />
                ADD FUNDS
              </Button>
              <Button variant="outline" className="w-full justify-start font-mono text-xs h-12 border-border hover:bg-secondary hover:text-secondary-foreground">
                <ArrowUpRight className="mr-2 h-4 w-4 text-muted-foreground" />
                WITHDRAW TO BANK
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border shadow-md bg-card/40 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <Link href="/transactions" className="text-sm font-medium text-primary hover:underline font-mono">
              VIEW ALL
            </Link>
          </CardHeader>
          <CardContent>
            {isLoadingTransactions ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : transactionsData?.transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Activity className="h-8 w-8 mb-4 opacity-20" />
                <p>No recent transactions</p>
              </div>
            ) : (
              <div className="space-y-6">
                {transactionsData?.transactions.map((tx) => {
                  const isCredit = tx.type === 'ADD_MONEY' || tx.type === 'REFUND' || (tx.type === 'TRANSFER' && tx.receiverId === 'current-user'); // We would need actual logic for receiver
                  // In a real app we check if current user is receiver
                  
                  // Rough check based on amount sign or we can just guess for UI
                  const isCreditDisplay = !!(tx.type === 'ADD_MONEY' || tx.type === 'REFUND' || (!tx.senderId && tx.receiverId));
                  
                  return (
                    <div key={tx.id} className="flex items-center justify-between group">
                      <div className="flex items-center space-x-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-secondary border border-border group-hover:bg-background transition-colors`}>
                          {getTypeIcon(tx.type, isCreditDisplay)}
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-none">
                            {tx.type === 'TRANSFER' 
                              ? (tx.receiverName || tx.receiverEmail || tx.senderName || tx.senderEmail || 'Transfer')
                              : tx.type.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono mt-1">
                            {new Date(tx.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-sm font-mono font-medium ${isCreditDisplay ? 'text-primary' : ''}`}>
                          {isCreditDisplay ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                        {getStatusBadge(tx.status)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
