import Layout from "@/components/layout";
import { useGetLedger } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function LedgerPage() {
  const { data, isLoading } = useGetLedger(
    { limit: 100 },
    { query: { queryKey: ["ledger"] } }
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Immutable Ledger</h1>
          <p className="text-muted-foreground text-sm">Every credit, debit, and refund operation recorded permanently.</p>
        </div>

        <Card className="border-border bg-card/40 backdrop-blur-sm shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-primary" />
              Ledger Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !data || data.entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mb-4 opacity-20" />
                <p className="font-mono text-sm">No ledger entries found.</p>
              </div>
            ) : (
              <div className="rounded-md border border-border bg-background/50 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="font-mono text-xs uppercase">Timestamp</TableHead>
                      <TableHead className="font-mono text-xs uppercase">ID</TableHead>
                      <TableHead className="font-mono text-xs uppercase">Type</TableHead>
                      <TableHead className="font-mono text-xs uppercase">Description</TableHead>
                      <TableHead className="text-right font-mono text-xs uppercase">Amount</TableHead>
                      <TableHead className="text-right font-mono text-xs uppercase">Balance After</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.entries.map((entry) => (
                      <TableRow key={entry.id} className="border-border hover:bg-secondary/50">
                        <TableCell className="font-mono text-xs whitespace-nowrap text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleString(undefined, { 
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="font-mono text-[10px] text-muted-foreground w-24 truncate max-w-[100px]" title={entry.id}>
                          {entry.id}
                        </TableCell>
                        <TableCell>
                          <span className={`font-mono text-xs px-2 py-0.5 rounded ${
                            entry.type === 'CREDIT' || entry.type === 'REFUND' 
                              ? 'bg-primary/10 text-primary' 
                              : 'bg-destructive/10 text-destructive'
                          }`}>
                            {entry.type}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate" title={entry.description}>
                          {entry.description || "—"}
                        </TableCell>
                        <TableCell className={`text-right font-mono font-medium whitespace-nowrap ${
                          entry.type === 'CREDIT' || entry.type === 'REFUND' ? 'text-primary' : ''
                        }`}>
                          {entry.type === 'CREDIT' || entry.type === 'REFUND' ? '+' : '-'}{formatCurrency(entry.amount)}
                        </TableCell>
                        <TableCell className="text-right font-mono whitespace-nowrap">
                          {formatCurrency(entry.balanceAfter)}
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
