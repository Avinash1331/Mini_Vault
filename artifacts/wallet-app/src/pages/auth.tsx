import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLogin, useRegister } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, ShieldCheck } from "lucide-react";

export default function AuthPage({ defaultTab = "login" }: { defaultTab?: "login" | "register" }) {
  const [tab, setTab] = useState<"login" | "register">(defaultTab);
  const [, setLocation] = useLocation();
  const { login } = useAuth();

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.token);
        toast.success("Welcome back");
        setLocation("/dashboard");
      },
      onError: (error: any) => {
        toast.error(error?.data?.error || "Login failed");
      },
    },
  });

  const registerMutation = useRegister({
    mutation: {
      onSuccess: (data) => {
        login(data.token);
        toast.success("Account created successfully");
        setLocation("/dashboard");
      },
      onError: (error: any) => {
        toast.error(error?.data?.error || "Registration failed");
      },
    },
  });

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, "Password is required"),
  });

  const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email(),
    password: z.string().min(6, "Password must be at least 6 characters"),
  });

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background"></div>
      
      <div className="w-full max-w-md z-10 relative">
        <div className="mb-8 flex flex-col items-center">
          <div className="h-12 w-12 bg-primary/20 rounded-xl flex items-center justify-center mb-4 border border-primary/50 shadow-[0_0_15px_rgba(20,184,166,0.3)]">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-mono font-bold tracking-tight">VAULT<span className="text-primary">X</span></h1>
          <p className="text-muted-foreground mt-2 text-sm">Precision financial infrastructure</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50 border border-border">
            <TabsTrigger value="login" className="data-[state=active]:bg-card">Access</TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-card">Initialize</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <Card className="border-border bg-card/50 backdrop-blur-sm shadow-2xl">
              <CardHeader>
                <CardTitle className="text-xl">System Access</CardTitle>
                <CardDescription>Enter your credentials to access your wallet.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate({ data }))} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wider font-mono">Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="admin@example.com" {...field} className="bg-background/50 font-mono text-sm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wider font-mono">Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} className="bg-background/50 font-mono text-sm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full mt-6" disabled={loginMutation.isPending}>
                      {loginMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      AUTHENTICATE
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card className="border-border bg-card/50 backdrop-blur-sm shadow-2xl">
              <CardHeader>
                <CardTitle className="text-xl">Initialize Wallet</CardTitle>
                <CardDescription>Create a new digital wallet profile.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate({ data }))} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wider font-mono">Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} className="bg-background/50 font-mono text-sm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wider font-mono">Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="john@example.com" {...field} className="bg-background/50 font-mono text-sm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wider font-mono">Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} className="bg-background/50 font-mono text-sm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full mt-6" disabled={registerMutation.isPending}>
                      {registerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      INITIALIZE
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="mt-8 text-center text-xs text-muted-foreground font-mono">
          <p>SECURE CONNECTION ESTABLISHED</p>
          <p className="opacity-50">v1.0.4 • TLS 1.3</p>
        </div>
      </div>
    </div>
  );
}
