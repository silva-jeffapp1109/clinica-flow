import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar,
  Users,
  UserCog,
  CheckCircle2,
  XCircle,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { specialtyOf } from "@/lib/specialty";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/home")({
  component: HomePage,
});

interface ProfileItem {
  id: string;
  specialty: string | null;
  full_name: string | null;
  email: string;
}

interface SessionItem {
  status: string;
  value: number;
  created_by: string;
}

function HomePage() {
  const { profile, isAdmin } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);
  const [stats, setStats] = useState({ patients: 0, presences: 0, absences: 0, total: 0 });
  const [bySpecialty, setBySpecialty] = useState<
    Array<{ key: string; presence: number; total: number; profs: Set<string> }>
  >([]);
  const [meMonth, setMeMonth] = useState({ presence: 0, absent: 0, total: 0 });

  useEffect(() => {
    (async () => {
      const [{ count: patients }, { data: sess }, { data: monthSess }, { data: profs }] =
        await Promise.all([
          supabase.from("patients").select("*", { count: "exact", head: true }),
          supabase.from("sessions").select("status,value").eq("session_date", today),
          supabase
            .from("sessions")
            .select("status,value,created_by")
            .gte("session_date", monthStartStr)
            .lte("session_date", today),
          supabase.from("profiles").select("id,specialty,full_name,email"),
        ]);
      const presences =
        (sess as SessionItem[] | null)?.filter((s) => s.status === "presence").length ?? 0;
      const absences =
        (sess as SessionItem[] | null)?.filter((s) => s.status === "absent").length ?? 0;
      const total = ((sess as SessionItem[]) ?? []).reduce(
        (a, s) => a + (s.status === "presence" ? Number(s.value) : 0),
        0,
      );
      setStats({ patients: patients ?? 0, presences, absences, total });

      const profMap = new Map<string, string | null>();
      const profNameMap = new Map<string, string>();
      ((profs as ProfileItem[]) ?? []).forEach((p) => {
        profMap.set(p.id, p.specialty);
        const name = p.full_name
          ? p.full_name.split(" ")[0]
          : p.email
            ? p.email.split("@")[0]
            : "Prof";
        profNameMap.set(p.id, name);
      });
      const m = new Map<string, { presence: number; total: number; profs: Set<string> }>();
      ((monthSess as SessionItem[]) ?? []).forEach((s) => {
        const sp = profMap.get(s.created_by) ?? "outro";
        const cur = m.get(sp) ?? { presence: 0, total: 0, profs: new Set<string>() };
        if (s.status === "presence") {
          cur.presence++;
          cur.total += Number(s.value || 0);
        }
        const profName = profNameMap.get(s.created_by);
        if (profName) {
          cur.profs.add(profName);
        }
        m.set(sp, cur);
      });
      setBySpecialty(
        Array.from(m.entries())
          .map(([key, v]) => ({ key, ...v }))
          .sort((a, b) => b.presence - a.presence),
      );

      if (profile) {
        const mine = ((monthSess as SessionItem[]) ?? []).filter(
          (s) => s.created_by === profile.id,
        );
        const mp = mine.filter((s) => s.status === "presence").length;
        const ma = mine.filter((s) => s.status === "absent").length;
        const mt = mine.reduce(
          (a: number, s) => a + (s.status === "presence" ? Number(s.value || 0) : 0),
          0,
        );
        setMeMonth({ presence: mp, absent: ma, total: mt });
      }
    })();
  }, [today, monthStartStr, profile?.id]);

  const mySpec = specialtyOf(profile?.specialty);

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ background: mySpec.color }}
            />
            Olá, {profile?.full_name || profile?.email?.split("@")[0] || "bem-vindo"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mySpec.label} ·{" "}
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
          </p>
        </div>
        <Link to="/relatorios">
          <Button size="sm" className="gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Relatório
          </Button>
        </Link>
      </div>

      {/* Cards de Estatísticas - 60% menores */}
      <div className="grid grid-cols-4 gap-1">
        <StatCard
          to="/pacientes"
          icon={<Users className="w-3 h-3" />}
          label="Pacientes"
          value={stats.patients}
          tone="primary"
        />
        <StatCard
          to="/entradas"
          icon={<CheckCircle2 className="w-3 h-3" />}
          label="Presenças"
          value={stats.presences}
          tone="success"
        />
        <StatCard
          to="/entradas"
          icon={<XCircle className="w-3 h-3" />}
          label="Faltas"
          value={stats.absences}
          tone="destructive"
        />
        <StatCard
          to="/entradas"
          icon={<DollarSign className="w-3 h-3" />}
          label="Faturamento"
          value={stats.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          tone="warning"
        />
      </div>

      {/* Meus números do mês */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground mb-1.5">
          Meu mês — {profile?.full_name ?? profile?.email}
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <SpecCard accent={mySpec.color} label="Atendimentos" value={meMonth.presence} />
          <SpecCard accent={mySpec.color} label="Faltas" value={meMonth.absent} />
          <SpecCard
            accent={mySpec.color}
            label="Total R$"
            value={meMonth.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          />
        </div>
      </div>

      {/* Por especialidade no mês */}
      {(isAdmin || profile?.email === "admin@gmail.com") && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground mb-1.5">
            Atendimentos por especialidade
          </h2>
          {bySpecialty.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              Nenhum atendimento registrado este mês.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {bySpecialty.map((s) => {
                const meta = specialtyOf(s.key);
                const profsList = Array.from(s.profs).join(", ");
                return (
                  <Link
                    key={s.key}
                    to="/relatorios"
                    className="rounded-xl p-2 border hover:shadow-md transition-all duration-200 hover:scale-[1.01] flex items-center justify-between gap-2.5"
                    style={{
                      backgroundColor: `${meta.color}0a`,
                      borderColor: `${meta.color}33`,
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                          style={{ backgroundColor: meta.color }}
                        />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                          {meta.label}
                        </span>
                        {profsList && (
                          <span className="text-[9px] text-muted-foreground/60 font-medium truncate">
                            · {profsList}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground/80 font-medium">
                        {s.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </div>
                    </div>
                    <div
                      className="text-xl font-bold font-mono tracking-tight shrink-0"
                      style={{ color: meta.color }}
                    >
                      {s.presence}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div>
        <h2 className="text-xs font-semibold text-muted-foreground mb-1.5">Ações rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <ActionCard
            to="/entradas"
            icon={<Calendar className="w-4 h-4" />}
            title="Agenda do dia"
            desc="Marcar presença e valores"
          />
          <ActionCard
            to="/pacientes"
            icon={<Users className="w-4 h-4" />}
            title="Pacientes"
            desc="Cadastrar e organizar"
          />
          <ActionCard
            to="/relatorios"
            icon={<BarChart3 className="w-4 h-4" />}
            title="Relatórios"
            desc="Totais por dia / mês / profissional"
          />
          {isAdmin && (
            <ActionCard
              to="/usuarios"
              icon={<UserCog className="w-4 h-4" />}
              title="Usuários"
              desc="Gerenciar equipe"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SpecCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent: string;
}) {
  return (
    <div
      className="bg-card border border-border/50 rounded-xl p-3 border-l-2 transition-all duration-200 hover:shadow-xs hover:border-l-[3px]"
      style={{ borderLeftColor: accent }}
    >
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
      <div className="text-sm font-bold text-foreground mt-1">{value}</div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: "primary" | "success" | "destructive" | "warning";
  to?: string;
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/8 text-primary border border-primary/15",
    success: "bg-emerald-500/8 text-emerald-600 border border-emerald-500/15",
    destructive: "bg-destructive/8 text-destructive border border-destructive/15",
    warning: "bg-amber-500/8 text-amber-600 border border-amber-500/15",
  };
  const inner = (
    <>
      <div className={`rounded p-0.5 shrink-0 ${tones[tone]}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
          {label}
        </div>
        <div className="text-sm font-bold text-foreground truncate">{value}</div>
      </div>
    </>
  );
  const cls = `bg-card border border-border/50 rounded-lg px-2 py-2 gap-1 flex items-center hover:border-primary/30 hover:shadow-sm hover:scale-[1.01] transition-all duration-200 cursor-pointer h-full`;
  if (to)
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    );
  return <div className={cls}>{inner}</div>;
}

function ActionCard({
  to,
  icon,
  title,
  desc,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="group bg-card border border-border/50 rounded-xl p-2 flex items-center gap-2 hover:border-primary/30 hover:shadow-sm hover:scale-[1.01] transition-all duration-200 active:scale-98"
    >
      <div className="rounded-lg p-1.5 bg-primary/8 text-primary border border-primary/10 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-transparent transition-all duration-200 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-[11px] text-foreground group-hover:text-primary transition-colors truncate">
          {title}
        </div>
        <div className="text-[9px] text-muted-foreground truncate mt-0.5">{desc}</div>
      </div>
    </Link>
  );
}
