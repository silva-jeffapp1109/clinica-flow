import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Stethoscope, Eye, EyeOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@gmail.com");
  const [password, setPassword] = useState("admin");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && user) return <Navigate to="/entradas" />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) { setError("Por favor, insira o e-mail."); return; }
    if (!password) { setError("Por favor, insira a senha."); return; }
    setSubmitting(true);
    try {
      const { error: signInError } = await signIn(email.trim(), password);
      if (signInError) {
        setError(
          signInError.includes("Invalid login credentials")
            ? "E-mail ou senha incorretos. Verifique as credenciais."
            : signInError
        );
        toast.error("Falha no login", { description: signInError });
      } else {
        toast.success("Bem-vindo! Redirecionando...");
        navigate({ to: "/entradas" });
      }
    } catch (err) {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-primary/20 to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary text-primary-foreground rounded-2xl p-4 mb-4 shadow-lg shadow-primary/30">
            <Stethoscope className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Clínica Flow</h1>
          <p className="text-sm text-white/50 mt-1">Sistema de gestão clínica</p>
        </div>

        <Card className="w-full p-8 shadow-2xl border-white/10 bg-white/5 backdrop-blur-sm">
          <form onSubmit={onSubmit} className="space-y-5">
            {/* Mensagem de erro */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 text-sm text-destructive font-medium">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-semibold">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                placeholder="admin@gmail.com"
                required
                autoComplete="email"
                className="h-11"
                disabled={submitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-semibold">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  placeholder="••••••"
                  required
                  autoComplete="current-password"
                  className="h-11 pr-10"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              id="btn-entrar"
              type="submit"
              className="w-full h-11 text-base font-bold shadow-lg shadow-primary/30"
              disabled={submitting || loading}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Entrando…
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          <div className="mt-6 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border/50">
            <p className="font-semibold mb-2 text-foreground/80">Credenciais de teste:</p>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => { setEmail("admin@gmail.com"); setPassword("admin"); setError(null); }}
                className="block w-full text-left hover:text-primary transition-colors font-mono"
              >
                👑 admin@gmail.com / admin
              </button>
              <button
                type="button"
                onClick={() => { setEmail("staff@gmail.com"); setPassword("staff123"); setError(null); }}
                className="block w-full text-left hover:text-primary transition-colors font-mono"
              >
                👤 staff@gmail.com / staff123
              </button>
            </div>
          </div>
        </Card>

        <p className="text-center text-xs text-white/30 mt-6">
          Clínica Flow © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
