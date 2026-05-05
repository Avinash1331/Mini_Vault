import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useInitiateTransfer, useSearchUsers, useGetBalance } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Layout from "@/components/layout";
import { ArrowRightLeft, Search, Loader2, CheckCircle2, Copy, ShieldAlert } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

const transferSchema = z.object({
  receiverEmail: z.string().email("Enter a valid email address"),
  amount: z.coerce.number().positive("Amount must be positive"),
  note: z.string().optional(),
});

export default function TransferPage() {
  const [step, setStep] = useState<"compose" | "confirm" | "success">("compose");
  const [transferData, setTransferData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  
  const { data: balanceData } = useGetBalance({ query: { queryKey: ["balance"] } });
  
  const { data: searchResults, isLoading: isSearching } = useSearchUsers(
    { q: searchQuery },
    { query: { enabled: searchQuery.length > 2, queryKey: ["users", "search", searchQuery] } }
  );

  const transferMutation = useInitiateTransfer({
    mutation: {
      onSuccess: (data) => {
        setTransferData({ ...transferData, result: data });
        setStep("success");
      },
      onError: (error: any) => {
        toast.error(error?.data?.error || "Transfer failed");
      }
    }
  });

  const form = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      receiverEmail: "",
      amount: undefined,
      note: "",
    }
  });

  const handleReview = (data: z.infer<typeof transferSchema>) => {
    if (balanceData && data.amount > balanceData.balance) {
      form.setError("amount", { message: "Insufficient funds" });
      return;
    }
    setTransferData(data);
    setIdempotencyKey(uuidv4());
    setStep("confirm");
  };

  const handleConfirm = () => {
    transferMutation.mutate({
      data: {
        receiverEmail: transferData.receiverEmail,
        amount: transferData.amount,
        note: transferData.note,
        idempotencyKey,
      }
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transfer Funds</h1>
          <p className="text-muted-foreground text-sm">Send money securely to any VaultX user.</p>
        </div>

        {step === "compose" && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-border bg-card/40 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Compose Transfer</CardTitle>
                <CardDescription>
                  Available Balance: <span className="font-mono text-primary font-bold">{balanceData ? formatCurrency(balanceData.balance) : "..."}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleReview)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="receiverEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wider font-mono">Recipient Email</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="user@example.com" 
                              {...field} 
                              className="font-mono bg-background/50" 
                              onChange={(e) => {
                                field.onChange(e);
                                setSearchQuery(e.target.value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wider font-mono">Amount (₹)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-muted-foreground font-mono">₹</span>
                              <Input 
                                type="number" 
                                placeholder="0.00" 
                                {...field} 
                                className="font-mono pl-8 bg-background/50 text-lg" 
                                step="0.01"
                                min="0.01"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="note"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wider font-mono">Note (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Dinner split..." {...field} className="bg-background/50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full mt-4 font-mono">
                      REVIEW TRANSFER
                      <ArrowRightLeft className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="text-sm font-medium tracking-tight">Directory Search</h3>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search users..." 
                  className="pl-9 bg-card/40 border-border"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              {isSearching && (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              
              {!isSearching && searchResults?.users && searchResults.users.length > 0 && (
                <div className="space-y-2">
                  {searchResults.users.map((u) => (
                    <div 
                      key={u.id} 
                      className="flex items-center justify-between p-3 rounded-md border border-border bg-card/20 hover:bg-secondary cursor-pointer transition-colors"
                      onClick={() => {
                        form.setValue("receiverEmail", u.email);
                        setSearchQuery(u.email);
                      }}
                    >
                      <div>
                        <p className="text-sm font-medium">{u.name}</p>
                        <p className="text-xs font-mono text-muted-foreground">{u.email}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 text-xs font-mono">SELECT</Button>
                    </div>
                  ))}
                </div>
              )}
              
              {!isSearching && searchQuery.length > 2 && searchResults?.users?.length === 0 && (
                <div className="text-center p-4 text-sm text-muted-foreground">
                  No users found matching "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        )}

        {step === "confirm" && (
          <Card className="border-primary/50 shadow-[0_0_20px_rgba(20,184,166,0.1)] bg-card/80 backdrop-blur-md">
            <CardHeader className="border-b border-border bg-card/50">
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" />
                Confirm Transaction
              </CardTitle>
              <CardDescription>Please review the details before confirming.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex flex-col items-center justify-center p-6 bg-background rounded-lg border border-border">
                <span className="text-sm text-muted-foreground uppercase font-mono tracking-widest mb-2">Sending Amount</span>
                <span className="text-5xl font-mono tracking-tight text-primary">{formatCurrency(transferData.amount)}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-muted-foreground font-mono text-xs uppercase">Recipient</span>
                  <p className="font-medium">{transferData.receiverEmail}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground font-mono text-xs uppercase">Note</span>
                  <p className="font-medium">{transferData.note || "—"}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <span className="text-muted-foreground font-mono text-xs uppercase">Idempotency Key (Safety)</span>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs truncate bg-secondary px-2 py-1 rounded w-full">{idempotencyKey}</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex gap-4 border-t border-border pt-6 bg-card/50">
              <Button variant="outline" className="flex-1 font-mono" onClick={() => setStep("compose")} disabled={transferMutation.isPending}>
                CANCEL
              </Button>
              <Button className="flex-1 font-mono" onClick={handleConfirm} disabled={transferMutation.isPending}>
                {transferMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRightLeft className="h-4 w-4 mr-2" />}
                CONFIRM TRANSFER
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === "success" && (
          <Card className="border-primary bg-primary/5 text-center">
            <CardContent className="pt-12 pb-8 flex flex-col items-center space-y-6">
              <div className="h-20 w-20 bg-primary/20 rounded-full flex items-center justify-center border-2 border-primary">
                <CheckCircle2 className="h-10 w-10 text-primary" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-primary">Transfer Initiated</h2>
                <p className="text-muted-foreground">The transaction has been successfully processed.</p>
              </div>
              
              <div className="bg-background p-4 rounded-lg border border-border w-full max-w-sm space-y-3 text-left">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-mono">Amount</span>
                  <span className="font-mono font-bold">{formatCurrency(transferData.amount)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-mono">Recipient</span>
                  <span className="font-medium truncate ml-4">{transferData.receiverEmail}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-mono">Status</span>
                  <span className="font-mono text-xs bg-primary/20 text-primary px-2 py-0.5 rounded uppercase">
                    {transferData.result?.status || "PROCESSING"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm pt-3 border-t border-border/50">
                  <span className="text-muted-foreground font-mono text-xs">Txn ID</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs truncate w-32">{transferData.result?.transactionId}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 w-full max-w-sm pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1 font-mono text-xs"
                  onClick={() => {
                    setStep("compose");
                    form.reset();
                  }}
                >
                  NEW TRANSFER
                </Button>
                <Button 
                  className="flex-1 font-mono text-xs"
                  onClick={() => window.location.href = "/transactions"}
                >
                  VIEW HISTORY
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
