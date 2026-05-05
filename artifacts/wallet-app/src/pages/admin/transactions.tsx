import Layout from "@/components/layout";
import { useListAdminTransactions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ListOrdered } from "lucide-react";

export default function AdminTransactionsPage() {
  const { data, isLoading } = useListAdminTransactions(
    { limit: 50 },
    { query: { queryKey: ["admin", "transactions", "all"] } }
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

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-destructive">Global Transactions</h1>
          <p className="text-muted-foreground text-sm">System-wide transaction monitoring with fraud indicators.</p>
        </div>

        <Card className="border-border bg-card/40 backdrop-blur-sm shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ListOrdered className="h-5 w-5 text-primary" />
              Transaction Ledger
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !data || data.transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <ListOrdered className="h-12 w-12 mb-4 opacity-20" />
                <p className="font-mono text-sm">No transactions found.</p>
              </div>
            ) : (
              <div className="rounded-md border border-border bg-background/50 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="font-mono text-xs uppercase w-[180px]">Timestamp</TableHead>
                      <TableHead className="font-mono text-xs uppercase">ID</TableHead>
                      <TableHead className="font-mono text-xs uppercase">Type / Sender → Receiver</TableHead>
                      <TableHead className="font-mono text-xs uppercase text-right">Amount</TableHead>
                      <TableHead className="font-mono text-xs uppercase text-center">Status</TableHead>
                      <TableHead className="font-mono text-xs uppercase text-center">Flags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.transactions.map((tx) => (
                      <TableRow key={tx.id} className={`border-border hover:bg-secondary/50 ${tx.isFlagged ? 'bg-destructive/5' : ''}`}>
                        <TableCell className="font-mono text-xs whitespace-nowrap text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleString(undefined, { 
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="font-mono text-[10px] text-muted-foreground w-20 truncate max-w-[80px]" title={tx.id}>
                          {tx.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-[10px] uppercase text-muted-foreground">{tx.type}</span>
                            <span className="text-sm truncate max-w-[250px]">
                              {tx.type === 'TRANSFER' 
                                ? `${tx.senderEmail || '?'} → ${tx.receiverEmail || '?'}`
                                : (tx.senderEmail || tx.receiverEmail || 'System')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium whitespace-nowrap">
                          {formatCurrency(tx.amount)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(tx.status)}
                        </TableCell>
                        <TableCell className="text-center">
                          {tx.isFlagged ? (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 font-mono text-[9px]" title={tx.flagReason}>
                              <ShieldAlert className="h-3 w-3 mr-1" /> FLAG
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground opacity-30 font-mono text-xs">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
