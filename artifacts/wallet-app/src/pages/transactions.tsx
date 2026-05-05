import { useState } from "react";
import Layout from "@/components/layout";
import { useListTransactions } from "@workspace/api-client-react";
import type { ListTransactionsStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRightLeft, ArrowUpRight, ArrowDownLeft, Plus, Activity } from "lucide-react";

export default function TransactionsPage() {
  const [status, setStatus] = useState<ListTransactionsStatus | "ALL">("ALL");
  
  const { data, isLoading } = useListTransactions(
    status === "ALL" ? { limit: 50 } : { status, limit: 50 },
    { query: { queryKey: ["transactions", "list", status] } }
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

  const tabs = ["ALL", "INITIATED", "PROCESSING", "SUCCESS", "FAILED", "PENDING", "REVERSED"];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transaction History</h1>
          <p className="text-muted-foreground text-sm">View and filter all your wallet activity.</p>
        </div>

        <Card className="border-border bg-card/40 backdrop-blur-sm shadow-md">
          <CardHeader className="pb-2">
            <Tabs 
              value={status} 
              onValueChange={(val) => setStatus(val as any)} 
              className="w-full"
            >
              <div className="overflow-x-auto pb-2 scrollbar-none">
                <TabsList className="bg-background/50 border border-border inline-flex min-w-full">
                  {tabs.map(t => (
                    <TabsTrigger key={t} value={t} className="font-mono text-xs data-[state=active]:bg-card">
                      {t}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center justify-between p-3 border border-border/50 rounded-lg">
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
            ) : !data || data.transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Activity className="h-12 w-12 mb-4 opacity-20" />
                <p className="font-mono text-sm">No transactions found for this filter.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.transactions.map((tx) => {
                  const isCreditDisplay = tx.type === 'ADD_MONEY' || tx.type === 'REFUND' || (!tx.senderId && tx.receiverId);
                  
                  return (
                    <div key={tx.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-border bg-card/20 hover:bg-secondary/50 transition-colors gap-4">
                      <div className="flex items-center space-x-4">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background border border-border`}>
                          {getTypeIcon(tx.type, !!isCreditDisplay)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-none truncate">
                            {tx.type === 'TRANSFER' 
                              ? (tx.receiverName || tx.receiverEmail || tx.senderName || tx.senderEmail || 'Transfer')
                              : tx.type.replace('_', ' ')}
                          </p>
                          <div className="flex items-center mt-1 text-xs text-muted-foreground font-mono space-x-2">
                            <span>{new Date(tx.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline text-[10px] truncate max-w-[100px]" title={tx.id}>{tx.id}</span>
                          </div>
                          {tx.note && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">"{tx.note}"</p>
                          )}
                        </div>
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                        <span className={`text-sm font-mono font-bold ${isCreditDisplay ? 'text-primary' : ''}`}>
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
