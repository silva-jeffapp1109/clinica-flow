import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import {
  CalendarDays,
  User,
  Mail,
  Clock,
  MessageSquare,
  Stethoscope,
  ChevronRight,
  LogIn,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { loading, user } = useAuth();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [hora, setHora] = useState("");
  const [sintomas, setSintomas] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Carregando portal…</span>
        </div>
      </div>
    );
  }

  // Se já estiver logado, redireciona para a home
  if (user) {
    return <Navigate to="/home" />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Simulação premium de agendamento
    setTimeout(() => {
      setSubmitting(false);
      toast.success("Solicitação recebida!", {
        description: `Olá ${nome.split(" ")[0]}, entraremos em contato no e-mail ${email} para confirmar seu horário das ${hora}.`,
        duration: 6000,
      });
      setNome("");
      setEmail("");
      setHora("");
      setSintomas("");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-indigo-950 to-slate-950 text-slate-100 flex items-center justify-center p-4 selection:bg-violet-500 selection:text-white relative overflow-hidden">
      {/* Luzes decorativas de fundo */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none"></div>

      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-10 w-full max-w-lg shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-violet-500/20 z-10">
        {/* Glow de Borda Gradiente */}
        <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/5 via-transparent to-amber-500/5 pointer-events-none"></div>

        {/* Cabeçalho */}
        <header className="relative flex flex-col items-center text-center mb-8">
          <div className="w-full flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-violet-400 to-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Clínica Flow
              </span>
            </div>

            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-violet-500/25 bg-violet-500/5 text-violet-400 hover:text-white hover:bg-violet-500/20 text-xs font-semibold tracking-wide transition-all duration-300"
            >
              <LogIn className="w-3.5 h-3.5" />
              Profissional
            </Link>
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-violet-400 bg-clip-text text-transparent">
            Agende sua Consulta
          </h2>
          <p className="text-xs md:text-sm text-slate-400 mt-2">
            Escolha seu horário e descreva os sintomas de forma rápida.
          </p>
        </header>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-5 relative">
          <div className="space-y-1">
            <label
              htmlFor="nome"
              className="text-xs font-semibold text-slate-300 flex items-center gap-2"
            >
              <User className="w-3.5 h-3.5 text-slate-400" />
              Nome Completo
            </label>
            <input
              type="text"
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite seu nome completo"
              required
              className="w-full bg-slate-950/60 border border-white/10 focus:border-violet-500/60 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="email"
              className="text-xs font-semibold text-slate-300 flex items-center gap-2"
            >
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              E-mail
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              required
              className="w-full bg-slate-950/60 border border-white/10 focus:border-violet-500/60 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="hora"
                  className="text-xs font-semibold text-slate-300 flex items-center gap-2"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Horário Desejado
                </label>
                <span className="bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md text-[9px] font-semibold text-amber-400 flex items-center gap-1 shrink-0">
                  Agendamento Online ✅
                </span>
              </div>
              <input
                type="time"
                id="hora"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                required
                className="w-full bg-slate-950/60 border border-white/10 focus:border-violet-500/60 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="sintomas"
              className="text-xs font-semibold text-slate-300 flex items-center gap-2"
            >
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              Sintomas ou Observações (opcional)
            </label>
            <textarea
              id="sintomas"
              value={sintomas}
              onChange={(e) => setSintomas(e.target.value)}
              placeholder="Descreva brevemente os sintomas ou histórico..."
              className="w-full bg-slate-950/60 border border-white/10 focus:border-violet-500/60 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 min-h-[90px] resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 mt-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-semibold transition-all duration-300 transform active:scale-98 shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <CalendarDays className="w-4 h-4" />
                Confirmar Pré-Agendamento
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
