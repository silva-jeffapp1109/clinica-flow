import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Stethoscope } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@gmail.com");
  const [password, setPassword] = useState("admin");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/entradas" />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      toast.error("Falha no login", { description: error });
    } else {
      toast.success("Bem-vindo!");
      navigate({ to: "/entradas" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary to-accent/40 p-4">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-primary text-primary-foreground rounded-2xl p-3 mb-3">
            <Stethoscope className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold">Clínica MVP</h1>
          <p className="text-sm text-muted-foreground">Controle de pacientes e sessões</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Entrando…" : "Entrar"}
          </Button>
        </form>
        <div className="mt-6 text-xs text-muted-foreground bg-muted p-3 rounded-md">
          <p className="font-semibold mb-1">Acesso de teste:</p>
          <p>admin@gmail.com / admin</p>
          <p>staff@gmail.com / staff</p>
        </div>
      </Card>
    </div>
  );
}