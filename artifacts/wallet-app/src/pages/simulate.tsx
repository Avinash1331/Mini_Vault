import { useState } from "react";
import { ArrowRightLeft, TerminalSquare, Database, Copy, MailX, Clock, Loader2, Play, CheckCircle2, XCircle } from "lucide-react";
import Layout from "@/components/layout";
import { 
  useSimulateDbFailure, 
  useSimulateDuplicatePayment, 
  useSimulateNotificationFailure, 
  useSimulateKafkaDelay 
} from "@workspace/api-client-react";
import type { SimulationResult } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

interface SimResultProps {
  result: SimulationResult | null;
  isLoading: boolean;
}

function ResultDisplay({ result, isLoading }: SimResultProps) {
  if (isLoading) {
    return (
      <div className="mt-4 p-4 rounded bg-background border border-border flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 font-mono text-xs">EXECUTING SIMULATION...</span>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="mt-4 p-4 rounded bg-background border border-border space-y-3 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <span className="font-mono text-xs font-bold uppercase">{result.scenario}</span>
        <Badge variant={result.outcome === 'success' || result.outcome === 'failed_gracefully' ? 'outline' : 'destructive'} 
               className={`font-mono text-[9px] ${result.outcome === 'failed_gracefully' ? 'text-primary border-primary/30 bg-primary/10' : ''}`}>
          {result.outcome.replace('_', ' ')}
        </Badge>
      </div>
      
      <p className="text-xs text-muted-foreground font-mono">{result.description}</p>
      
      <div className="space-y-2 mt-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
        {result.steps?.map((step: string, idx: number) => {
          const isError = step.toLowerCase().includes('fail') || step.toLowerCase().includes('error');
          const isComp = step.toLowerCase().includes('compensat') || step.toLowerCase().includes('rollback');
          
          return (
            <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-5 h-5 rounded-full border border-background bg-card shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ml-0.5 md:ml-0">
                {isError ? (
                  <XCircle className="h-3 w-3 text-destructive" />
                ) : isComp ? (
                  <ArrowRightLeft className="h-3 w-3 text-yellow-500" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                )}
              </div>
              <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-2 rounded border border-border bg-card/50 text-[10px] font-mono text-muted-foreground truncate" title={step}>
                {step}
              </div>
            </div>
          );
        })}
      </div>

      {result.compensationApplied !== undefined && (
        <div className="mt-4 pt-3 border-t border-border/50 flex justify-between items-center text-xs font-mono">
          <span className="text-muted-foreground">Saga Compensation:</span>
          <span className={result.compensationApplied ? "text-primary" : "text-muted-foreground"}>
            {result.compensationApplied ? "APPLIED (Data consistent)" : "NOT REQUIRED"}
          </span>
        </div>
      )}
    </div>
  );
}

export default function SimulatePage() {
  const [dbResult, setDbResult] = useState<SimulationResult | null>(null);
  const [dupResult, setDupResult] = useState<SimulationResult | null>(null);
  const [notifResult, setNotifResult] = useState<SimulationResult | null>(null);
  const [kafkaResult, setKafkaResult] = useState<SimulationResult | null>(null);

  const [dupKey, setDupKey] = useState(() => uuidv4());
  const [dupAmount, setDupAmount] = useState("500");
  const [kafkaDelay, setKafkaDelay] = useState("5000");

  const dbSim = useSimulateDbFailure({
    mutation: {
      onSuccess: (data) => setDbResult(data),
      onError: () => toast.error("Simulation failed to execute")
    }
  });

  const dupSim = useSimulateDuplicatePayment({
    mutation: {
      onSuccess: (data) => setDupResult(data),
      onError: () => toast.error("Simulation failed to execute")
    }
  });

  const notifSim = useSimulateNotificationFailure({
    mutation: {
      onSuccess: (data) => setNotifResult(data),
      onError: () => toast.error("Simulation failed to execute")
    }
  });

  const kafkaSim = useSimulateKafkaDelay({
    mutation: {
      onSuccess: (data) => setKafkaResult(data),
      onError: () => toast.error("Simulation failed to execute")
    }
  });

  return (
    <Layout>
      <div className="space-y-6 pb-20">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <TerminalSquare className="h-6 w-6 text-primary" />
            System Resilience Lab
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Trigger deliberate infrastructure failures to verify saga patterns, idempotency, and graceful degradation.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* DB Failure */}
          <Card className="border-border bg-card/40 backdrop-blur-sm shadow-md flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5 text-destructive" />
                Database Commit Failure
              </CardTitle>
              <CardDescription>
                Simulates a database crash mid-transaction to verify the Saga orchestration rollback mechanisms.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ResultDisplay result={dbResult} isLoading={dbSim.isPending} />
            </CardContent>
            <CardFooter className="pt-0">
              <Button 
                variant="destructive" 
                className="w-full font-mono text-xs bg-destructive/20 text-destructive hover:bg-destructive hover:text-white border border-destructive/30"
                onClick={() => { setDbResult(null); dbSim.mutate(); }}
                disabled={dbSim.isPending}
              >
                <Play className="h-3 w-3 mr-2" /> TRIGGER DB CRASH
              </Button>
            </CardFooter>
          </Card>

          {/* Duplicate Payment */}
          <Card className="border-border bg-card/40 backdrop-blur-sm shadow-md flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Copy className="h-5 w-5 text-yellow-500" />
                Duplicate Submission
              </CardTitle>
              <CardDescription>
                Simulates a user double-clicking "Pay" or a network retry sending the exact same payload twice.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] font-mono uppercase text-muted-foreground">Idempotency Key</Label>
                  <Input 
                    value={dupKey} 
                    onChange={(e) => setDupKey(e.target.value)} 
                    className="font-mono text-xs h-8 bg-background/50" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-mono uppercase text-muted-foreground">Amount</Label>
                  <Input 
                    type="number" 
                    value={dupAmount} 
                    onChange={(e) => setDupAmount(e.target.value)} 
                    className="font-mono text-xs h-8 bg-background/50" 
                  />
                </div>
              </div>
              <Button variant="outline" size="sm" className="h-6 text-[10px] font-mono px-2" onClick={() => setDupKey(uuidv4())}>
                GENERATE NEW KEY
              </Button>
              <ResultDisplay result={dupResult} isLoading={dupSim.isPending} />
            </CardContent>
            <CardFooter className="pt-0">
              <Button 
                variant="outline" 
                className="w-full font-mono text-xs border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10"
                onClick={() => { setDupResult(null); dupSim.mutate({ data: { idempotencyKey: dupKey, amount: Number(dupAmount) } }); }}
                disabled={dupSim.isPending}
              >
                <Play className="h-3 w-3 mr-2" /> SUBMIT DUPLICATE
              </Button>
            </CardFooter>
          </Card>

          {/* Notification Failure */}
          <Card className="border-border bg-card/40 backdrop-blur-sm shadow-md flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MailX className="h-5 w-5 text-orange-500" />
                Notification Provider Down
              </CardTitle>
              <CardDescription>
                Simulates an external SMS/Email provider API outage to verify transactions succeed despite notification failures.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ResultDisplay result={notifResult} isLoading={notifSim.isPending} />
            </CardContent>
            <CardFooter className="pt-0">
              <Button 
                variant="outline" 
                className="w-full font-mono text-xs border-orange-500/30 text-orange-500 hover:bg-orange-500/10"
                onClick={() => { setNotifResult(null); notifSim.mutate(); }}
                disabled={notifSim.isPending}
              >
                <Play className="h-3 w-3 mr-2" /> DROP NOTIFICATIONS
              </Button>
            </CardFooter>
          </Card>

          {/* Kafka Delay */}
          <Card className="border-border bg-card/40 backdrop-blur-sm shadow-md flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-400" />
                Event Bus Latency
              </CardTitle>
              <CardDescription>
                Simulates high latency in the Kafka cluster causing asynchronous processing (ledger, stats) to lag.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="space-y-1 w-1/2">
                <Label className="text-[10px] font-mono uppercase text-muted-foreground">Delay (MS)</Label>
                <Input 
                  type="number" 
                  value={kafkaDelay} 
                  onChange={(e) => setKafkaDelay(e.target.value)} 
                  className="font-mono text-xs h-8 bg-background/50" 
                  min="100"
                  max="10000"
                />
              </div>
              <ResultDisplay result={kafkaResult} isLoading={kafkaSim.isPending} />
            </CardContent>
            <CardFooter className="pt-0">
              <Button 
                variant="outline" 
                className="w-full font-mono text-xs border-blue-400/30 text-blue-400 hover:bg-blue-400/10"
                onClick={() => { setKafkaResult(null); kafkaSim.mutate({ data: { delayMs: Number(kafkaDelay) } }); }}
                disabled={kafkaSim.isPending}
              >
                <Play className="h-3 w-3 mr-2" /> INDUCE LATENCY
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
