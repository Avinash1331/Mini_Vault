import Layout from "@/components/layout";
import { useListAdminUsers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, ShieldAlert } from "lucide-react";

export default function AdminUsersPage() {
  const { data, isLoading } = useListAdminUsers({
    query: { queryKey: ["admin", "users"] }
  });

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
          <h1 className="text-2xl font-bold tracking-tight text-destructive">User Directory</h1>
          <p className="text-muted-foreground text-sm">System users, balances, and risk profiles.</p>
        </div>

        <Card className="border-border bg-card/40 backdrop-blur-sm shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Registered Entities
              {data?.total && <Badge className="ml-2 bg-primary/20 text-primary border-primary/30 font-mono text-[10px]">{data.total} TOTAL</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !data || data.users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Users className="h-12 w-12 mb-4 opacity-20" />
                <p className="font-mono text-sm">No users found.</p>
              </div>
            ) : (
              <div className="rounded-md border border-border bg-background/50 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="font-mono text-xs uppercase">User</TableHead>
                      <TableHead className="font-mono text-xs uppercase">Role</TableHead>
                      <TableHead className="font-mono text-xs uppercase">Joined</TableHead>
                      <TableHead className="font-mono text-xs uppercase text-right">Txn Count</TableHead>
                      <TableHead className="font-mono text-xs uppercase text-right">Wallet Balance</TableHead>
                      <TableHead className="font-mono text-xs uppercase text-center">Risk Profile</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.users.map((user) => (
                      <TableRow key={user.id} className={`border-border hover:bg-secondary/50 ${user.isFlagged ? 'bg-destructive/5' : ''}`}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{user.name}</span>
                            <span className="font-mono text-xs text-muted-foreground">{user.email}</span>
                            <span className="font-mono text-[9px] text-muted-foreground/50 truncate w-24" title={user.id}>{user.id}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`font-mono text-[10px] ${user.role === 'admin' ? 'bg-destructive/10 text-destructive border-destructive/30' : ''}`}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {user.totalTransactions}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium whitespace-nowrap">
                          {formatCurrency(user.walletBalance)}
                        </TableCell>
                        <TableCell className="text-center">
                          {user.isFlagged ? (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 font-mono text-[9px]">
                              <ShieldAlert className="h-3 w-3 mr-1" /> HIGH RISK
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-primary/5 text-primary/70 border-primary/20 font-mono text-[9px]">
                              NORMAL
                            </Badge>
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
