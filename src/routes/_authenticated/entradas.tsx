import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Users, User, Plus, X, ChevronDown, ChevronRight, Paperclip, Check } from "lucide-react";
import { specialtyOf } from "@/lib/specialty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/entradas")({
  component: EntradasPage,
});

/* ─── Interfaces ─────────────────────────────────────────────── */
interface Patient {
  id: string;
  name: string;
  pathology: string | null;
  category_id: string;
}
interface Session {
  id: string;
  patient_id: string;
  session_date: string;
  session_time: string | null;
  value: number;
  status: string;
  created_by: string;
  created_by_name: string | null;
  notes: string | null;
}
interface Schedule {
  id: string;
  patient_id: string;
  weekday: number | null;
  schedule_date: string | null;
  schedule_time: string;
  created_by: string;
}
interface ProfileLite {
  id: string;
  full_name: string | null;
  email: string;
  specialty: string | null;
}
interface SlotMeta {
  authorized: boolean;
  responsibleId: string;
  executorId: string;
  room: string;
  procedure: string;
  text: string;
}
interface Slot {
  key: string;
  scheduleId?: string;
  sessionId?: string;
  patientId: string;
  patient: Patient;
  time: string; // "HH:MM - HH:MM"
  status: string;
  meta: SlotMeta;
  value: number;
  dateStr: string;
  weekdayIndex: number;
  type: "recurrent" | "pontual";
}

/* ─── Helpers ────────────────────────────────────────────────── */
function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}
function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function shortDate(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}
function parseNotes(notes: string | null): SlotMeta {
  const base: SlotMeta = { authorized: false, responsibleId: "", executorId: "", room: "", procedure: "", text: "" };
  if (!notes) return base;
  base.authorized = notes.includes("[authorized:true]");
  const rm = notes.match(/\[responsible_id:([^\]]+)\]/); if (rm) base.responsibleId = rm[1];
  const em = notes.match(/\[executor_id:([^\]]+)\]/); if (em) base.executorId = em[1];
  const om = notes.match(/\[room:([^\]]+)\]/); if (om) base.room = om[1];
  const pm = notes.match(/\[procedure:([^\]]+)\]/); if (pm) base.procedure = pm[1];
  base.text = notes
    .replace(/\[authorized:(true|false)\]/g, "")
    .replace(/\[responsible_id:[^\]]+\]/g, "")
    .replace(/\[executor_id:[^\]]+\]/g, "")
    .replace(/\[room:[^\]]+\]/g, "")
    .replace(/\[procedure:[^\]]+\]/g, "")
    .trim();
  return base;
}
function serializeNotes(m: SlotMeta): string {
  let s = m.text || "";
  if (m.authorized) s += " [authorized:true]";
  if (m.responsibleId) s += ` [responsible_id:${m.responsibleId}]`;
  if (m.executorId) s += ` [executor_id:${m.executorId}]`;
  if (m.room) s += ` [room:${m.room}]`;
  if (m.procedure) s += ` [procedure:${m.procedure}]`;
  return s.trim();
}

const DAY_NAMES = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const ROOMS = ["Sala 1", "Sala 2", "Sala 3", "Sala 4", "Sala 5", "Sala 6"];

/* ─── Month mini-calendar ────────────────────────────────────── */
function MiniCal({ selected, onSelect }: { selected: Date; onSelect: (d: Date) => void }) {
  const [view, setView] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1));

  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const firstDow = new Date(view.getFullYear(), view.getMonth(), 1).getDay(); // 0=Sun
  const startOffset = firstDow === 0 ? 6 : firstDow - 1; // shift to Mon-start

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const today = new Date();
  const todayIso = isoDate(today);
  const selIso = isoDate(selected);

  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  return (
    <div className="select-none px-1 pb-2">
      <div className="flex items-center justify-between mb-1 px-0.5">
        <button
          className="text-[11px] font-bold text-muted-foreground hover:text-foreground px-1"
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
        >‹</button>
        <span className="text-[11px] font-bold text-foreground">
          {monthNames[view.getMonth()]} {view.getFullYear()}
        </span>
        <button
          className="text-[11px] font-bold text-muted-foreground hover:text-foreground px-1"
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
        >›</button>
      </div>
      <div className="grid grid-cols-7 gap-0">
        {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
          <div key={i} className="text-[9px] text-center text-muted-foreground font-semibold py-0.5">{d}</div>
        ))}
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />;
          const cellIso = `${view.getFullYear()}-${String(view.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isToday = cellIso === todayIso;
          const isSel = cellIso === selIso;
          return (
            <button
              key={idx}
              onClick={() => onSelect(new Date(view.getFullYear(), view.getMonth(), day))}
              className={`text-[11px] w-full aspect-square flex items-center justify-center rounded-full transition-colors
                ${isSel ? "bg-primary text-primary-foreground font-bold" :
                  isToday ? "border border-primary text-primary font-bold" :
                  "text-foreground hover:bg-accent"}`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── FilterSection (colapsável) ─────────────────────────────── */
function FilterSection({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/40">
      <button
        className="w-full flex items-center justify-between py-2 px-1 text-[11px] font-semibold text-foreground hover:text-primary transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2">
          {icon}
          {label}
        </span>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {open && <div className="pb-2 px-1 space-y-1">{children}</div>}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
function EntradasPage() {
  const { profile, isAdmin } = useAuth();
  const isSuperAdmin = isAdmin || profile?.email === "admin@gmail.com";

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [profs, setProfs] = useState<ProfileLite[]>([]);

  // Filtros sidebar
  const [selectAll, setSelectAll] = useState(true);
  const [filterResp, setFilterResp] = useState("all");
  const [filterExec, setFilterExec] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRoom, setFilterRoom] = useState("all");
  const [filterProc, setFilterProc] = useState("all");
  const [filterPatient, setFilterPatient] = useState("all");

  // Tooltip / popover
  const [activeSlot, setActiveSlot] = useState<Slot | null>(null);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  const popupRef = useRef<HTMLDivElement>(null);

  // Modal de edição / criação
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSlot, setModalSlot] = useState<Slot | null>(null);
  const [modalDay, setModalDay] = useState<{ weekday: number; dateStr: string } | null>(null);
  const [form, setForm] = useState({
    patientId: "", weekday: 1, dateStr: "", isRecurrent: true,
    startTime: "08:00", endTime: "08:45",
    responsibleId: "", executorId: "", room: "Sala 1",
    procedure: "", value: 0, status: "pending", authorized: false, text: "",
  });
  const [patientFiles, setPatientFiles] = useState<{ name: string; url: string }[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);

  /* semana */
  const weekDays = useMemo(() => {
    const mon = getMonday(selectedDate);
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  const mondayStr = useMemo(() => isoDate(weekDays[0]), [weekDays]);
  const saturdayStr = useMemo(() => isoDate(weekDays[5]), [weekDays]);

  /* carga */
  const load = async () => {
    const [{ data: pts }, { data: ss }, { data: sch }, { data: pr }] = await Promise.all([
      supabase.from("patients").select("*"),
      supabase.from("sessions").select("*").gte("session_date", mondayStr).lte("session_date", saturdayStr),
      supabase.from("patient_schedules").select("*"),
      supabase.from("profiles").select("id,full_name,email,specialty"),
    ]);
    setPatients((pts as Patient[]) ?? []);
    setSessions((ss as Session[]) ?? []);
    setSchedules((sch as Schedule[]) ?? []);
    setProfs((pr as ProfileLite[]) ?? []);
  };

  useEffect(() => { load(); }, [mondayStr, saturdayStr]);

  /* mapas */
  const profById = useMemo(() => {
    const m = new Map<string, ProfileLite>();
    profs.forEach(p => m.set(p.id, p));
    return m;
  }, [profs]);

  /* fechar popup ao clicar fora */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setActiveSlot(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* upsert sessão */
  const upsertSession = async (
    patientId: string, sessionDate: string, patch: Partial<Session> & { notes?: string }
  ) => {
    if (!profile) return null;
    const existing = sessions.find(s => s.patient_id === patientId && s.session_date === sessionDate);
    if (existing) {
      const { data, error } = await supabase.from("sessions").update(patch).eq("id", existing.id).select().single();
      if (error) { toast.error(error.message); return null; }
      return data;
    } else {
      const { data, error } = await supabase.from("sessions").insert({
        patient_id: patientId, owner_id: profile.owner_id,
        created_by: patch.created_by || profile.id,
        created_by_name: patch.created_by_name || profile.full_name || profile.email,
        session_date: sessionDate, session_time: patch.session_time || nowTime(),
        value: patch.value ?? 0, status: patch.status || "pending", notes: patch.notes || null,
      }).select().single();
      if (error) { toast.error(error.message); return null; }
      return data;
    }
  };

  /* slots por dia */
  const slotsByDay = useMemo(() => {
    return weekDays.map((dayDate, i) => {
      const dateStr = isoDate(dayDate);
      const wdIdx = i + 1; // 1=Seg…6=Sab
      const daySch = schedules.filter(s => s.weekday === wdIdx);
      const daySess = sessions.filter(s => s.session_date === dateStr);

      const slots: Slot[] = [];

      daySch.forEach(sched => {
        const patient = patients.find(p => p.id === sched.patient_id);
        if (!patient) return;
        const session = daySess.find(s => s.patient_id === sched.patient_id);
        const meta = parseNotes(session?.notes ?? null);
        if (!meta.responsibleId) meta.responsibleId = sched.created_by;
        if (!meta.executorId) meta.executorId = session?.created_by || sched.created_by;

        slots.push({
          key: `r-${sched.id}-${dateStr}`,
          scheduleId: sched.id,
          sessionId: session?.id,
          patientId: sched.patient_id, patient,
          time: sched.schedule_time || "08:00",
          status: session?.status || "pending",
          meta, value: session?.value || 0, dateStr, weekdayIndex: wdIdx, type: "recurrent",
        });
      });

      daySess.forEach(sess => {
        if (slots.some(s => s.patientId === sess.patient_id)) return;
        const patient = patients.find(p => p.id === sess.patient_id);
        if (!patient) return;
        const meta = parseNotes(sess.notes);
        if (!meta.responsibleId) meta.responsibleId = sess.created_by;
        if (!meta.executorId) meta.executorId = sess.created_by;

        slots.push({
          key: `p-${sess.id}`,
          sessionId: sess.id,
          patientId: sess.patient_id, patient,
          time: sess.session_time || "08:00",
          status: sess.status || "pending",
          meta, value: sess.value || 0, dateStr, weekdayIndex: wdIdx, type: "pontual",
        });
      });

      slots.sort((a, b) => a.time.localeCompare(b.time));

      return slots.filter(slot => {
        if (!isSuperAdmin && profile) {
          if (slot.meta.responsibleId !== profile.id && slot.meta.executorId !== profile.id) return false;
        }
        if (filterResp !== "all" && slot.meta.responsibleId !== filterResp) return false;
        if (filterExec !== "all" && slot.meta.executorId !== filterExec) return false;
        if (filterStatus !== "all" && slot.status !== filterStatus) return false;
        if (filterRoom !== "all" && slot.meta.room !== filterRoom) return false;
        if (filterProc !== "all" && slot.meta.procedure !== filterProc) return false;
        if (filterPatient !== "all" && slot.patientId !== filterPatient) return false;
        return true;
      });
    });
  }, [weekDays, schedules, sessions, patients, profile, isSuperAdmin,
    filterResp, filterExec, filterStatus, filterRoom, filterProc, filterPatient]);

  /* quick status button */
  const quickStatus = async (slot: Slot, newStatus: string) => {
    const result = await upsertSession(slot.patientId, slot.dateStr, {
      status: newStatus,
      notes: serializeNotes({ ...slot.meta, authorized: slot.meta.authorized }),
      created_by: slot.meta.executorId || profile?.id,
    });
    if (result) { toast.success("Status atualizado!"); load(); setActiveSlot(null); }
  };

  /* toggle autorização */
  const toggleAuth = async (slot: Slot) => {
    const newMeta = { ...slot.meta, authorized: !slot.meta.authorized };
    const result = await upsertSession(slot.patientId, slot.dateStr, {
      notes: serializeNotes(newMeta), status: slot.status,
      created_by: newMeta.executorId || profile?.id,
    });
    if (result) {
      toast.success(newMeta.authorized ? "Autorização concedida!" : "Autorização revogada!");
      load(); setActiveSlot(null);
    }
  };

  /* abrir modal de criação */
  const openNew = (weekday: number, dateStr: string) => {
    if (!isSuperAdmin) { toast.error("Apenas administradores podem criar agendamentos."); return; }
    setModalSlot(null);
    setModalDay({ weekday, dateStr });
    setForm({
      patientId: patients[0]?.id || "", weekday, dateStr, isRecurrent: true,
      startTime: "08:00", endTime: "08:45",
      responsibleId: profile?.id || "", executorId: profile?.id || "",
      room: "Sala 1", procedure: "", value: 0, status: "pending", authorized: false, text: "",
    });
    setModalOpen(true);
  };

  /* abrir modal de edição */
  const openEdit = (slot: Slot) => {
    let start = "08:00", end = "08:45";
    if (slot.time?.includes(" - ")) { [start, end] = slot.time.split(" - "); }
    else if (slot.time) {
      start = slot.time.slice(0, 5);
      const [h, m] = start.split(":").map(Number);
      const ed = new Date(); ed.setHours(h); ed.setMinutes(m + 45);
      end = `${String(ed.getHours()).padStart(2,"0")}:${String(ed.getMinutes()).padStart(2,"0")}`;
    }
    setModalSlot(slot);
    setModalDay(null);
    setForm({
      patientId: slot.patientId, weekday: slot.weekdayIndex, dateStr: slot.dateStr,
      isRecurrent: slot.type === "recurrent",
      startTime: start, endTime: end,
      responsibleId: slot.meta.responsibleId || "", executorId: slot.meta.executorId || "",
      room: slot.meta.room || "Sala 1", procedure: slot.meta.procedure || "",
      value: slot.value, status: slot.status,
      authorized: slot.meta.authorized, text: slot.meta.text || "",
    });
    setActiveSlot(null);
    setModalOpen(true);
  };

  /* salvar modal */
  const saveForm = async () => {
    if (!profile || !form.patientId) { toast.error("Selecione o paciente."); return; }
    const timeStr = `${form.startTime} - ${form.endTime}`;
    const meta: SlotMeta = {
      authorized: form.authorized, responsibleId: form.responsibleId,
      executorId: form.executorId, room: form.room, procedure: form.procedure, text: form.text,
    };
    const notesSer = serializeNotes(meta);

    if (modalSlot) {
      // edição
      if (modalSlot.type === "recurrent" && modalSlot.scheduleId && isSuperAdmin) {
        const { error } = await supabase.from("patient_schedules").update({
          weekday: form.weekday, schedule_time: timeStr, patient_id: form.patientId,
        }).eq("id", modalSlot.scheduleId);
        if (error) { toast.error(error.message); return; }
      }
      const r = await upsertSession(form.patientId, form.dateStr, {
        session_time: timeStr, status: form.status, value: form.value, notes: notesSer,
        created_by: form.executorId || profile.id,
      });
      if (r) { toast.success("Salvo!"); setModalOpen(false); load(); }
    } else {
      // criação
      if (form.isRecurrent) {
        const { error } = await supabase.from("patient_schedules").insert({
          patient_id: form.patientId, weekday: form.weekday, schedule_time: timeStr,
          owner_id: profile.owner_id, created_by: form.responsibleId || profile.id,
        });
        if (error) { toast.error(error.message); return; }
      }
      const r = await upsertSession(form.patientId, form.dateStr, {
        session_time: timeStr, status: form.status, value: form.value, notes: notesSer,
        created_by: form.executorId || profile.id,
      });
      if (r) { toast.success("Agendamento criado!"); setModalOpen(false); load(); }
    }
  };

  /* excluir slot */
  const deleteSlot = async () => {
    if (!modalSlot || !isSuperAdmin) return;
    if (!confirm("Excluir este agendamento?")) return;
    if (modalSlot.sessionId) {
      const { error } = await supabase.from("sessions").delete().eq("id", modalSlot.sessionId);
      if (error) { toast.error(error.message); return; }
    }
    if (modalSlot.scheduleId && modalSlot.type === "recurrent") {
      const { error } = await supabase.from("patient_schedules").delete().eq("id", modalSlot.scheduleId);
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Excluído!"); setModalOpen(false); load();
  };

  /* upload de anexos */
  const loadFiles = async (patientId: string) => {
    if (!profile) return;
    setFilesLoading(true);
    const folder = `${profile.owner_id}/${patientId}/`;
    const { data } = await supabase.storage.from("patient-documents").list(folder, { limit: 20 });
    setPatientFiles((data ?? []).map(f => ({
      name: f.name,
      url: supabase.storage.from("patient-documents").getPublicUrl(`${folder}${f.name}`).data.publicUrl,
    })));
    setFilesLoading(false);
  };

  useEffect(() => {
    if (modalOpen && form.patientId) loadFiles(form.patientId);
    else setPatientFiles([]);
  }, [modalOpen, form.patientId]);

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !profile || !form.patientId) return;
    const file = e.target.files[0];
    const folder = `${profile.owner_id}/${form.patientId}/`;
    const id = toast.loading("Enviando...");
    const { error } = await supabase.storage.from("patient-documents").upload(`${folder}${Date.now()}_${file.name}`, file);
    if (error) { toast.error(error.message, { id }); return; }
    toast.success("Anexo enviado!", { id });
    loadFiles(form.patientId);
  };

  const deleteFile = async (name: string) => {
    if (!profile || !form.patientId) return;
    await supabase.storage.from("patient-documents").remove([`${profile.owner_id}/${form.patientId}/${name}`]);
    toast.success("Removido!"); loadFiles(form.patientId);
  };

  /* ─ Tooltip popup de slot ─ */
  const handleSlotClick = (slot: Slot, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveSlot(prev => prev?.key === slot.key ? null : slot);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopupPos({ x: rect.left + window.scrollX, y: rect.bottom + window.scrollY + 4 });
  };

  /* ─ Cor do card por status ─ */
  const cardStyle = (slot: Slot) => {
    if (slot.status === "absent") return "bg-[#fce4ec] border-l-[3px] border-l-red-400";
    if (slot.status === "presence") return "bg-[#e8f5e9] border-l-[3px] border-l-emerald-400";
    return "bg-slate-50 dark:bg-slate-900 border-l-[3px] border-l-blue-400"; // pending = neutro/cinza/azul
  };

  const execSpec = (slot: Slot) => specialtyOf(profById.get(slot.meta.executorId)?.specialty);

  /* ─ Render ─────────────────────────────────────────────────── */
  return (
    <div className="flex bg-background text-foreground text-xs relative" style={{ height: "calc(100vh - 3.5rem)", overflow: "hidden" }}>

      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <aside
        className="w-40 shrink-0 bg-card border-r border-border flex flex-col"
        style={{ height: "calc(100vh - 3.5rem)", overflowY: "auto" }}
      >
        {/* Mini calendário */}
        <div className="p-1 border-b border-border">
          <MiniCal selected={selectedDate} onSelect={setSelectedDate} />
        </div>

        {/* Botão filtrar */}
        <div className="px-2 py-1 border-b border-border">
          <button
            className="w-full flex items-center justify-center gap-1 text-[10px] font-semibold text-foreground/70 bg-muted rounded py-1 hover:bg-accent transition-colors"
            onClick={() => { setFilterResp("all"); setFilterExec("all"); setFilterStatus("all"); setFilterRoom("all"); setFilterProc("all"); setFilterPatient("all"); setSelectAll(true); }}
          >
            ☰ Filtrar
          </button>
        </div>

        {/* Selecionar todos */}
        <div className="px-2 py-1 border-b border-border flex items-center gap-1.5">
          <Checkbox
            id="selAll"
            checked={selectAll}
            onCheckedChange={(v) => {
              setSelectAll(!!v);
              if (v) { setFilterResp("all"); setFilterExec("all"); setFilterStatus("all"); setFilterRoom("all"); setFilterProc("all"); setFilterPatient("all"); }
            }}
          />
          <label htmlFor="selAll" className="text-[10px] font-medium cursor-pointer">Selecionar todos</label>
        </div>

        {/* Filtros colapsáveis */}
        <div className="flex-1 overflow-y-auto px-1.5 py-0.5">
          <FilterSection label="Profissional Responsável" icon={<User className="w-3 h-3" />}>
            <Select value={filterResp} onValueChange={v => { setFilterResp(v); setSelectAll(false); }}>
              <SelectTrigger className="h-7 text-[11px]"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {profs.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.email.split("@")[0]}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterSection>

          <FilterSection label="Profissional Executor" icon={<Users className="w-3 h-3" />}>
            <Select value={filterExec} onValueChange={v => { setFilterExec(v); setSelectAll(false); }}>
              <SelectTrigger className="h-7 text-[11px]"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {profs.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.email.split("@")[0]}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterSection>

          <FilterSection label="Status">
            <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setSelectAll(false); }}>
              <SelectTrigger className="h-7 text-[11px]"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Agendado</SelectItem>
                <SelectItem value="presence">Presente</SelectItem>
                <SelectItem value="absent">Faltou</SelectItem>
              </SelectContent>
            </Select>
          </FilterSection>

          <FilterSection label="Salas">
            <Select value={filterRoom} onValueChange={v => { setFilterRoom(v); setSelectAll(false); }}>
              <SelectTrigger className="h-7 text-[11px]"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {ROOMS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterSection>

          <FilterSection label="Procedimentos">
            <Input
              placeholder="Filtrar proc..."
              value={filterProc === "all" ? "" : filterProc}
              onChange={e => { setFilterProc(e.target.value || "all"); setSelectAll(false); }}
              className="h-7 text-[11px]"
            />
          </FilterSection>

          <FilterSection label="Pacientes" icon={<User className="w-3 h-3" />}>
            <Select value={filterPatient} onValueChange={v => { setFilterPatient(v); setSelectAll(false); }}>
              <SelectTrigger className="h-7 text-[11px]"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterSection>
        </div>
      </aside>

      {/* ── GRADE SEMANAL ───────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-x-auto" style={{ height: "calc(100vh - 3.5rem)" }}>
        <div className="flex" style={{ minWidth: 600, height: "100%" }}>
          {weekDays.map((dayDate, i) => {
            const dateStr = isoDate(dayDate);
            const wdIdx = i + 1;
            const slots = slotsByDay[i] ?? [];
            const isToday = isoDate(new Date()) === dateStr;

            return (
              <div
                key={wdIdx}
                className={`flex-1 min-w-0 border-r border-border flex flex-col ${isToday ? "bg-primary/5" : "bg-background"}`}
                style={{ height: "100%" }}
              >
                {/* Cabeçalho do dia */}
                <div
                  className={`px-1 py-0.5 border-b border-border text-center shrink-0 ${isToday ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}
                >
                  <div className="text-[9px] font-bold uppercase tracking-wide leading-tight">{DAY_NAMES[i]}</div>
                  <div className="text-[10px] font-semibold leading-tight">{shortDate(dayDate)}</div>
                </div>

                {/* Slots */}
                <div className="flex flex-col gap-0.5 p-0.5 overflow-y-auto" style={{ flex: 1 }}>
                  {slots.map((slot) => {
                    const sp = execSpec(slot);
                    const respName = profById.get(slot.meta.responsibleId)?.full_name?.split(" ")[0] ?? (slot.meta.responsibleId ? slot.meta.responsibleId.slice(0, 6) : "—");
                    const execName = profById.get(slot.meta.executorId)?.full_name?.split(" ")[0] ?? (slot.meta.executorId ? slot.meta.executorId.slice(0, 6) : "—");

                    return (
                      <div
                        key={slot.key}
                        className={`relative group rounded border border-border/40 px-1 pt-0.5 pb-1 cursor-pointer transition-shadow hover:shadow-sm ${cardStyle(slot)}`}
                        onClick={(e) => handleSlotClick(slot, e)}
                      >
                        {/* Horário + badge autorizado */}
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-foreground/80 leading-tight">{slot.time}</span>
                          {slot.meta.authorized && (
                            <span className="text-[7px] bg-teal-600 text-white px-0.5 rounded font-bold leading-none">Aut.</span>
                          )}
                        </div>

                        {/* Responsável */}
                        <div className="flex items-center gap-0.5 text-[8px] text-foreground/55 leading-tight">
                          <User className="w-2 h-2 shrink-0" />
                          <span className="truncate">Resp: <span className="font-medium text-foreground/70">{respName}</span></span>
                        </div>

                        {/* Executor */}
                        <div className="flex items-center gap-0.5 text-[8px] text-foreground/55 leading-tight">
                          <User className="w-2 h-2 shrink-0" />
                          <span className="truncate">Exec: <span className="font-medium text-foreground/70">{execName}</span></span>
                        </div>

                        {/* Nome do paciente */}
                        <div className="text-[9px] font-bold text-foreground truncate leading-tight">{slot.patient.name}</div>

                        {/* Botão + (adicionar) apenas para admin */}
                        {isSuperAdmin && (
                          <button
                            className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white/70 border border-border/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary hover:text-primary-foreground hover:border-transparent shadow"
                            onClick={(e) => { e.stopPropagation(); openEdit(slot); }}
                            title="Editar agendamento"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Botão adicionar novo slot na coluna */}
                  {isSuperAdmin && (
                    <button
                      className="mt-0.5 w-full flex items-center justify-center gap-0.5 text-[9px] text-muted-foreground border border-dashed border-border/40 rounded py-0.5 hover:border-primary hover:text-primary transition-colors"
                      onClick={() => openNew(wdIdx, dateStr)}
                    >
                      <Plus className="w-2.5 h-2.5" /> novo
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ── POPUP / TOOLTIP DE DETALHES ─────────────────────── */}
      {activeSlot && (() => {
        const slot = activeSlot;
        const respFull = profById.get(slot.meta.responsibleId)?.full_name ?? (slot.meta.responsibleId || "—");
        const execFull = profById.get(slot.meta.executorId)?.full_name ?? (slot.meta.executorId || "—");
        return (
          <div
            ref={popupRef}
            className="fixed z-50 bg-gray-900 text-white rounded-xl shadow-2xl p-4 w-72 text-xs border border-white/10"
            style={{ left: Math.min(popupPos.x, window.innerWidth - 300), top: popupPos.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-white/50 hover:text-white"
              onClick={() => setActiveSlot(null)}
            ><X className="w-3.5 h-3.5" /></button>

            <div className="font-bold text-sm mb-2">{slot.time}</div>

            <div className="space-y-1 mb-3">
              <Row label="Responsável:" value={respFull} />
              <Row label="Executor:" value={execFull} italic />
              <Row label="Paciente:" value={slot.patient.name} />
              {slot.meta.procedure && <Row label="Procedimento:" value={slot.meta.procedure} />}
              {slot.meta.room && <Row label="Sala:" value={slot.meta.room} />}
              <Row label="Status:" value={
                slot.status === "presence" ? "Presente" :
                  slot.status === "absent" ? "Faltou" : "Agendado"
              } />
              <Row label="Autorização:" value={slot.meta.authorized ? "Autorizado" : "Pendente"} />
              {slot.meta.text && <Row label="Obs:" value={slot.meta.text} />}
            </div>

            {/* Ações rápidas */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                className="col-span-2 flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 rounded-lg py-1.5 text-[10px] font-bold transition-colors"
                onClick={() => openEdit(slot)}
              >
                <span>✏️</span> Editar Agendamento
              </button>
              <button
                className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-[10px] font-bold transition-colors ${slot.status === "presence" ? "bg-emerald-600 text-white" : "bg-white/10 hover:bg-emerald-600 hover:text-white"}`}
                onClick={() => quickStatus(slot, "presence")}
              >
                <Check className="w-3 h-3" /> Presente
              </button>
              <button
                className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-[10px] font-bold transition-colors ${slot.status === "absent" ? "bg-red-600 text-white" : "bg-white/10 hover:bg-red-600 hover:text-white"}`}
                onClick={() => quickStatus(slot, "absent")}
              >
                <X className="w-3 h-3" /> Faltou
              </button>
              <button
                className="col-span-2 flex items-center justify-center gap-1 bg-white/10 hover:bg-teal-600 hover:text-white rounded-lg py-1.5 text-[10px] font-bold transition-colors"
                onClick={() => toggleAuth(slot)}
              >
                {slot.meta.authorized ? "🔓 Revogar Autorização" : "🔒 Autorizar"}
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── MODAL EDIÇÃO / CRIAÇÃO ───────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {modalSlot ? "Editar Agendamento" : "Novo Agendamento"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Paciente */}
            <div className="col-span-2">
              <Label className="text-[11px] font-bold mb-1 block">Paciente *</Label>
              {modalSlot ? (
                <Input value={modalSlot.patient.name} disabled className="h-8 text-xs" />
              ) : (
                <Select value={form.patientId} onValueChange={v => setForm({ ...form, patientId: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Recorrência */}
            {!modalSlot && (
              <div className="col-span-2 flex items-center gap-2">
                <Checkbox id="recurrent" checked={form.isRecurrent} onCheckedChange={v => setForm({ ...form, isRecurrent: !!v })} />
                <label htmlFor="recurrent" className="text-[11px] cursor-pointer">Repetir toda semana (recorrente)</label>
              </div>
            )}

            {/* Dia da semana */}
            <div>
              <Label className="text-[11px] font-bold mb-1 block">Dia da Semana</Label>
              <Select
                value={String(form.weekday)}
                onValueChange={v => setForm({ ...form, weekday: Number(v) })}
                disabled={!isSuperAdmin}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((n, i) => <SelectItem key={i + 1} value={String(i + 1)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Data */}
            <div>
              <Label className="text-[11px] font-bold mb-1 block">Data</Label>
              <Input
                type="date" value={form.dateStr}
                onChange={e => setForm({ ...form, dateStr: e.target.value })}
                className="h-8 text-xs" disabled={!isSuperAdmin}
              />
            </div>

            {/* Horário */}
            <div>
              <Label className="text-[11px] font-bold mb-1 block">Hora Início</Label>
              <Input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} className="h-8 text-xs" disabled={!isSuperAdmin} />
            </div>
            <div>
              <Label className="text-[11px] font-bold mb-1 block">Hora Fim</Label>
              <Input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} className="h-8 text-xs" disabled={!isSuperAdmin} />
            </div>

            {/* Responsável / Executor */}
            <div>
              <Label className="text-[11px] font-bold mb-1 block">Responsável</Label>
              <Select value={form.responsibleId} onValueChange={v => setForm({ ...form, responsibleId: v })} disabled={!isSuperAdmin}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {profs.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.email.split("@")[0]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] font-bold mb-1 block">Executor (Staff)</Label>
              <Select value={form.executorId} onValueChange={v => setForm({ ...form, executorId: v })} disabled={!isSuperAdmin}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {profs.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.email.split("@")[0]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Sala / Procedimento */}
            <div>
              <Label className="text-[11px] font-bold mb-1 block">Sala</Label>
              <Select value={form.room} onValueChange={v => setForm({ ...form, room: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROOMS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] font-bold mb-1 block">Procedimento</Label>
              <Input value={form.procedure} onChange={e => setForm({ ...form, procedure: e.target.value })} className="h-8 text-xs" placeholder="Ex: Sessão Fono - UGF" />
            </div>

            {/* Valor / Status */}
            <div>
              <Label className="text-[11px] font-bold mb-1 block">Valor (R$)</Label>
              <Input type="number" step="0.01" value={form.value} onChange={e => setForm({ ...form, value: Number(e.target.value) })} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[11px] font-bold mb-1 block">Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Agendado</SelectItem>
                  <SelectItem value="presence">Presente</SelectItem>
                  <SelectItem value="absent">Faltou</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Autorização */}
            <div className="col-span-2 flex items-center gap-2">
              <Checkbox id="auth" checked={form.authorized} onCheckedChange={v => setForm({ ...form, authorized: !!v })} />
              <label htmlFor="auth" className="text-[11px] cursor-pointer">Atendimento Autorizado</label>
            </div>

            {/* Observações */}
            <div className="col-span-2">
              <Label className="text-[11px] font-bold mb-1 block">Observações / Evolução</Label>
              <textarea
                value={form.text}
                onChange={e => setForm({ ...form, text: e.target.value })}
                rows={3}
                className="w-full border border-input bg-background rounded-lg px-2 py-1.5 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Notas da sessão..."
              />
            </div>

            {/* Anexos */}
            {modalSlot && (
              <div className="col-span-2 border-t pt-3 space-y-2">
                <Label className="text-[11px] font-bold block">Documentos do Paciente</Label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-full border border-primary/50 text-primary px-3 py-1 text-[10px] font-bold hover:bg-primary/10">
                  <Paperclip className="w-3 h-3" /> Anexar arquivo
                  <input type="file" className="hidden" onChange={uploadFile} />
                </label>
                {filesLoading ? <div className="text-[10px] text-muted-foreground animate-pulse">Carregando...</div> :
                  patientFiles.length > 0 ? (
                    <div className="space-y-1">
                      {patientFiles.map(f => (
                        <div key={f.name} className="flex items-center justify-between bg-muted/40 rounded px-2 py-1 text-[10px]">
                          <a href={f.url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate max-w-[200px]">
                            {f.name.substring(f.name.indexOf("_") + 1)}
                          </a>
                          <button onClick={() => deleteFile(f.name)} className="text-destructive ml-2"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  ) : <div className="text-[10px] text-muted-foreground italic">Nenhum anexo.</div>}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2">
            {modalSlot && isSuperAdmin && (
              <Button variant="destructive" onClick={deleteSlot} className="sm:mr-auto rounded-xl text-xs h-8">Excluir</Button>
            )}
            <Button variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl text-xs h-8">Cancelar</Button>
            <Button onClick={saveForm} className="rounded-xl text-xs h-8">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─ Helper: linha no popup ─ */
function Row({ label, value, italic }: { label: string; value: string; italic?: boolean }) {
  return (
    <div className="flex items-start gap-1.5">
      <span className="text-white/50 shrink-0 min-w-[80px]">{label}</span>
      <span className={`text-white font-medium truncate ${italic ? "italic" : ""}`}>{value}</span>
    </div>
  );
}
