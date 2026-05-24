import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { specialtyOf } from "@/lib/specialty";
import { ChevronDown, ChevronUp, Download, FileImage, FileText } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: RelatoriosPage,
});

interface Session {
  id: string;
  patient_id: string;
  session_date: string;
  value: number;
  status: string;
  created_by: string;
  created_by_name: string | null;
}
interface Patient {
  id: string;
  name: string;
}
interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  specialty: string | null;
}

const fmtBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const monthStart = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
const monthEnd = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);

function RelatoriosPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const { profile, isAdmin } = useAuth();
  const isSuperAdmin = isAdmin || profile?.email === "admin@gmail.com";
  const today = new Date();
  const [from, setFrom] = useState(monthStart(today));
  const [to, setTo] = useState(monthEnd(today));
  const [profFilter, setProfFilter] = useState<string>("all");
  const [patientFilter, setPatientFilter] = useState<string>("all");
  const [expandedProfs, setExpandedProfs] = useState<Set<string>>(new Set());

  const toggleProf = (id: string) =>
    setExpandedProfs((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  const [sessions, setSessions] = useState<Session[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [profs, setProfs] = useState<Profile[]>([]);

  const load = async () => {
    const [{ data: ss }, { data: pts }, { data: pr }] = await Promise.all([
      supabase
        .from("sessions")
        .select("id,patient_id,session_date,value,status,created_by,created_by_name")
        .gte("session_date", from)
        .lte("session_date", to),
      supabase.from("patients").select("id,name"),
      supabase.from("profiles").select("id,full_name,email,specialty"),
    ]);
    setSessions((ss as Session[]) ?? []);
    setPatients((pts as Patient[]) ?? []);
    setProfs((pr as Profile[]) ?? []);
  };
  useEffect(() => {
    load();
  }, [from, to]);

  const profById = useMemo(() => new Map(profs.map((p) => [p.id, p])), [profs]);
  const patById = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);

  const filtered = useMemo(
    () =>
      sessions.filter((s) => {
        if (!isSuperAdmin && s.created_by !== profile?.id) return false;
        return (
          (profFilter === "all" || s.created_by === profFilter) &&
          (patientFilter === "all" || s.patient_id === patientFilter)
        );
      }),
    [sessions, profFilter, patientFilter, isSuperAdmin, profile],
  );

  // Por profissional
  const byProf = useMemo(() => {
    const m = new Map<
      string,
      { presence: number; absent: number; total: number; name: string; specialty: string | null }
    >();
    filtered.forEach((s) => {
      const p = profById.get(s.created_by);
      const key = s.created_by;
      const cur = m.get(key) ?? {
        presence: 0,
        absent: 0,
        total: 0,
        name: p?.full_name ?? s.created_by_name ?? p?.email ?? "—",
        specialty: p?.specialty ?? null,
      };
      if (s.status === "presence") {
        cur.presence++;
        cur.total += Number(s.value || 0);
      } else if (s.status === "absent") cur.absent++;
      m.set(key, cur);
    });
    return Array.from(m.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.presence - a.presence);
  }, [filtered, profById]);

  // Faturamento por profissional → paciente
  const byProfPatient = useMemo(() => {
    const m = new Map<
      string,
      {
        profName: string;
        specialty: string | null;
        total: number;
        patients: Map<string, { name: string; presence: number; absent: number; total: number }>;
      }
    >();
    filtered.forEach((s) => {
      const p = profById.get(s.created_by);
      const profKey = s.created_by;
      if (!m.has(profKey))
        m.set(profKey, {
          profName: p?.full_name ?? s.created_by_name ?? p?.email ?? "—",
          specialty: p?.specialty ?? null,
          total: 0,
          patients: new Map(),
        });
      const prof = m.get(profKey)!;
      if (!prof.patients.has(s.patient_id))
        prof.patients.set(s.patient_id, {
          name: patById.get(s.patient_id)?.name ?? "—",
          presence: 0,
          absent: 0,
          total: 0,
        });
      const pat = prof.patients.get(s.patient_id)!;
      if (s.status === "presence") {
        pat.presence++;
        pat.total += Number(s.value || 0);
        prof.total += Number(s.value || 0);
      } else if (s.status === "absent") pat.absent++;
    });
    return Array.from(m.entries())
      .map(([id, v]) => ({
        id,
        ...v,
        patients: Array.from(v.patients.entries())
          .map(([pid, pv]) => ({ id: pid, ...pv }))
          .sort((a, b) => b.total - a.total),
      }))
      .sort((a, b) => b.total - a.total);
  }, [filtered, profById, patById]);

  // Por paciente
  const byPatient = useMemo(() => {
    const m = new Map<string, { presence: number; absent: number; total: number }>();
    filtered.forEach((s) => {
      const cur = m.get(s.patient_id) ?? { presence: 0, absent: 0, total: 0 };
      if (s.status === "presence") {
        cur.presence++;
        cur.total += Number(s.value || 0);
      } else if (s.status === "absent") cur.absent++;
      m.set(s.patient_id, cur);
    });
    return Array.from(m.entries())
      .map(([id, v]) => ({ id, name: patById.get(id)?.name ?? "—", ...v }))
      .sort((a, b) => b.presence - a.presence);
  }, [filtered, patById]);

  // Por dia
  const byDay = useMemo(() => {
    const m = new Map<string, { presence: number; absent: number; total: number }>();
    filtered.forEach((s) => {
      const cur = m.get(s.session_date) ?? { presence: 0, absent: 0, total: 0 };
      if (s.status === "presence") {
        cur.presence++;
        cur.total += Number(s.value || 0);
      } else if (s.status === "absent") cur.absent++;
      m.set(s.session_date, cur);
    });
    return Array.from(m.entries())
      .map(([d, v]) => ({ d, ...v }))
      .sort((a, b) => a.d.localeCompare(b.d));
  }, [filtered]);

  // Por mês
  const byMonth = useMemo(() => {
    const m = new Map<string, { presence: number; absent: number; total: number }>();
    filtered.forEach((s) => {
      const k = s.session_date.slice(0, 7);
      const cur = m.get(k) ?? { presence: 0, absent: 0, total: 0 };
      if (s.status === "presence") {
        cur.presence++;
        cur.total += Number(s.value || 0);
      } else if (s.status === "absent") cur.absent++;
      m.set(k, cur);
    });
    return Array.from(m.entries())
      .map(([d, v]) => ({ d, ...v }))
      .sort((a, b) => a.d.localeCompare(b.d));
  }, [filtered]);

  const grand = useMemo(() => {
    let p = 0,
      a = 0,
      t = 0;
    filtered.forEach((s) => {
      if (s.status === "presence") {
        p++;
        t += Number(s.value || 0);
      } else if (s.status === "absent") a++;
    });
    return { presence: p, absent: a, total: t };
  }, [filtered]);

  const exportCsv = () => {
    const rows = [["Profissional", "Especialidade", "Atendimentos", "Faltas", "Total R$"]];
    byProf.forEach((r) =>
      rows.push([
        r.name,
        specialtyOf(r.specialty).label,
        String(r.presence),
        String(r.absent),
        r.total.toFixed(2),
      ]),
    );
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${from}_a_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJpeg = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const url = canvas.toDataURL("image/jpeg", 0.95);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${from}_a_${to}.jpg`;
    a.click();
  };

  const exportPdf = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? "landscape" : "portrait",
      unit: "px",
      format: [canvas.width / 2, canvas.height / 2],
    });
    pdf.addImage(imgData, "JPEG", 0, 0, canvas.width / 2, canvas.height / 2);
    pdf.save(`relatorio-${from}_a_${to}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground text-xs">
            Soma de atendimentos por profissional, paciente, dia e mês.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button onClick={exportCsv} variant="outline" size="sm" className="h-7 text-[11px] px-2">
            <Download className="w-3 h-3 mr-1" /> CSV
          </Button>
          <Button onClick={exportJpeg} variant="outline" size="sm" className="h-7 text-[11px] px-2">
            <FileImage className="w-3 h-3 mr-1" /> JPEG
          </Button>
          <Button onClick={exportPdf} variant="outline" size="sm" className="h-7 text-[11px] px-2">
            <FileText className="w-3 h-3 mr-1" /> PDF
          </Button>
        </div>
      </div>
      <div ref={reportRef}>
        <Card className="p-2.5 grid gap-2 md:grid-cols-4">
          <div>
            <label className="text-[10px] text-muted-foreground">De</label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Até</label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          {isSuperAdmin && (
            <div>
              <label className="text-[10px] text-muted-foreground">Profissional</label>
              <Select value={profFilter} onValueChange={setProfFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {profs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name ?? p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label className="text-[10px] text-muted-foreground">Paciente</label>
            <Select value={patientFilter} onValueChange={setPatientFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Atendimentos" value={grand.presence} accent="#1E90FF" />
          <Stat label="Faltas" value={grand.absent} accent="#FF3D8B" />
          <Stat label="Total R$" value={fmtBRL(grand.total)} accent="#FF7A00" />
        </div>

        <Card className="overflow-hidden">
          <div className="px-3 py-1.5 text-sm font-semibold bg-[var(--table-header)]">
            Por profissional / especialidade
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[var(--table-header)]/60 text-left">
                <tr>
                  <Th>Profissional</Th>
                  <Th>Especialidade</Th>
                  <Th>Atend.</Th>
                  <Th>Faltas</Th>
                  <Th>Total R$</Th>
                </tr>
              </thead>
              <tbody>
                {byProf.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground text-xs">
                      Sem registros no período.
                    </td>
                  </tr>
                )}
                {byProf.map((r, i) => {
                  const sp = specialtyOf(r.specialty);
                  return (
                    <tr
                      key={r.id}
                      className={i % 2 === 0 ? "bg-card" : "bg-[var(--row-alt)]"}
                      style={{ boxShadow: `inset 3px 0 0 0 ${sp.color}` }}
                    >
                      <Td className="font-medium">{r.name}</Td>
                      <Td>
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="inline-block w-2 h-2 rounded-full"
                            style={{ background: sp.color }}
                          />
                          {sp.label}
                        </span>
                      </Td>
                      <Td>{r.presence}</Td>
                      <Td>{r.absent}</Td>
                      <Td>{fmtBRL(r.total)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Faturamento por profissional / paciente */}
        <Card className="overflow-hidden">
          <div className="px-3 py-1.5 text-sm font-semibold bg-[var(--table-header)] flex items-center justify-between">
            <span>Faturamento por profissional / paciente</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              Clique para expandir
            </span>
          </div>
          {byProfPatient.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              Sem registros no período.
            </div>
          )}
          {byProfPatient.map((prof) => {
            const sp = specialtyOf(prof.specialty);
            const isOpen = expandedProfs.has(prof.id);
            return (
              <div key={prof.id} className="border-b border-border last:border-0">
                <button
                  onClick={() => toggleProf(prof.id)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-accent/40 transition text-left"
                  style={{ borderLeft: `3px solid ${sp.color}` }}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ background: sp.color }}
                    />
                    <span className="text-sm font-medium">{prof.profName}</span>
                    <span className="text-[10px] text-muted-foreground">({sp.label})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-emerald-600">
                      {fmtBRL(prof.total)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {prof.patients.length} paciente{prof.patients.length !== 1 ? "s" : ""}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-3 h-3 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                </button>
                {isOpen && (
                  <div className="overflow-x-auto bg-accent/10">
                    <table className="w-full text-xs">
                      <thead className="bg-[var(--table-header)]/40 text-left">
                        <tr>
                          <Th>Paciente</Th>
                          <Th>Atend.</Th>
                          <Th>Faltas</Th>
                          <Th>Total R$</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {prof.patients.map((pat, i) => (
                          <tr
                            key={pat.id}
                            className={i % 2 === 0 ? "bg-card" : "bg-[var(--row-alt)]"}
                          >
                            <Td>{pat.name}</Td>
                            <Td>{pat.presence}</Td>
                            <Td>{pat.absent}</Td>
                            <Td className="font-medium">{fmtBRL(pat.total)}</Td>
                          </tr>
                        ))}
                        <tr className="bg-emerald-500/10">
                          <Td className="font-semibold">Total</Td>
                          <Td className="font-semibold">
                            {prof.patients.reduce((a, p) => a + p.presence, 0)}
                          </Td>
                          <Td className="font-semibold">
                            {prof.patients.reduce((a, p) => a + p.absent, 0)}
                          </Td>
                          <Td className="font-semibold text-emerald-600">{fmtBRL(prof.total)}</Td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </Card>

        <div className="grid gap-2 md:grid-cols-2">
          <Card className="overflow-hidden">
            <div className="px-3 py-1.5 text-sm font-semibold bg-[var(--table-header)]">
              Por paciente
            </div>
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-xs">
                <thead className="bg-[var(--table-header)]/60 text-left sticky top-0">
                  <tr>
                    <Th>Paciente</Th>
                    <Th>Atend.</Th>
                    <Th>Faltas</Th>
                    <Th>Total R$</Th>
                  </tr>
                </thead>
                <tbody>
                  {byPatient.map((r, i) => (
                    <tr key={r.id} className={i % 2 === 0 ? "bg-card" : "bg-[var(--row-alt)]"}>
                      <Td>{r.name}</Td>
                      <Td>{r.presence}</Td>
                      <Td>{r.absent}</Td>
                      <Td>{fmtBRL(r.total)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="px-3 py-1.5 text-sm font-semibold bg-[var(--table-header)]">
              Por dia
            </div>
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-xs">
                <thead className="bg-[var(--table-header)]/60 text-left sticky top-0">
                  <tr>
                    <Th>Data</Th>
                    <Th>Atend.</Th>
                    <Th>Faltas</Th>
                    <Th>Total R$</Th>
                  </tr>
                </thead>
                <tbody>
                  {byDay.map((r, i) => (
                    <tr key={r.d} className={i % 2 === 0 ? "bg-card" : "bg-[var(--row-alt)]"}>
                      <Td>{new Date(r.d + "T00:00").toLocaleDateString("pt-BR")}</Td>
                      <Td>{r.presence}</Td>
                      <Td>{r.absent}</Td>
                      <Td>{fmtBRL(r.total)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <div className="px-3 py-1.5 text-sm font-semibold bg-[var(--table-header)]">Por mês</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[var(--table-header)]/60 text-left">
                <tr>
                  <Th>Mês</Th>
                  <Th>Atend.</Th>
                  <Th>Faltas</Th>
                  <Th>Total R$</Th>
                </tr>
              </thead>
              <tbody>
                {byMonth.map((r, i) => (
                  <tr key={r.d} className={i % 2 === 0 ? "bg-card" : "bg-[var(--row-alt)]"}>
                    <Td>{r.d}</Td>
                    <Td>{r.presence}</Td>
                    <Td>{r.absent}</Td>
                    <Td>{fmtBRL(r.total)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-2 py-1.5 font-semibold text-[10px] uppercase tracking-wide border-b border-border">
      {children}
    </th>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-2 py-1.5 border-b border-border/60 ${className}`}>{children}</td>;
}
function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent: string }) {
  return (
    <Card
      className="p-2 border-l-2 bg-card transition-all duration-200 hover:shadow-xs"
      style={{ borderLeftColor: accent }}
    >
      <div className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-xs font-bold text-foreground mt-0.5">{value}</div>
    </Card>
  );
}
