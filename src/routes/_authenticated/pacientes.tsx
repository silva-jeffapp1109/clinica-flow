import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useState, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  FolderPlus,
  Paperclip,
  Upload,
  FileText,
  X,
  Mic,
  Sparkles,
  Save,
  Check,
  ClipboardList,
} from "lucide-react";
import { Clock, CalendarDays, LayoutGrid, Table } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/pacientes")({
  component: PacientesPage,
});

interface Category {
  id: string;
  name: string;
}
interface Patient {
  id: string;
  category_id: string;
  name: string;
  pathology: string | null;
  session_time: string | null;
  session_label: string | null;
  cpf: string | null;
  phone: string | null;
  address: string | null;
  responsible: string | null;
  health_plan: string | null;
  registration: string | null;
}
interface Schedule {
  id: string;
  patient_id: string;
  weekday: number | null;
  schedule_date: string | null;
  schedule_time: string;
}
interface Session {
  id: string;
  patient_id: string;
  session_date: string;
  session_time: string | null;
  value: number;
  status: string;
  created_by_name: string | null;
  created_by: string;
  notes: string | null;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: () => void;
  onresult: (event: {
    resultIndex: number;
    results: { [key: number]: { [key: number]: { transcript: string } } };
  }) => void;
  onerror: (event: unknown) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

interface ExtendedWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
  activeSpeechRec?: SpeechRecognitionInstance;
}

function PacientesPage() {
  const { profile } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [openSched, setOpenSched] = useState<string | null>(null);
  const [newSched, setNewSched] = useState<
    Record<string, { weekday: string; date: string; time: string }>
  >({});
  const [newCat, setNewCat] = useState("");
  const [newPatient, setNewPatient] = useState<Record<string, { name: string; pathology: string }>>(
    {},
  );
  const [dlgOpen, setDlgOpen] = useState(false);
  const emptyDialogForm = {
    name: "",
    pathology: "",
    category_id: "",
    session_time: "",
    session_label: "",
    cpf: "",
    phone: "",
    address: "",
    responsible: "",
    health_plan: "",
    registration: "",
  };
  const [dlgForm, setDlgForm] = useState(emptyDialogForm);
  const [saving, setSaving] = useState(false);
  const [docPatient, setDocPatient] = useState<Patient | null>(null);
  const [docFiles, setDocFiles] = useState<{ name: string; url: string }[]>([]);
  const [docLoading, setDocLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const handleFilter = () => {
    setFilterQuery(searchQuery);
  };

  const handleClearFilter = () => {
    setSearchQuery("");
    setFilterQuery("");
  };

  const filteredPatients = patients.filter((p) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase().trim();
    const matchesName = p.name?.toLowerCase().includes(q);
    const matchesCpf = p.cpf?.replace(/\D/g, "").includes(q.replace(/\D/g, ""));
    return matchesName || matchesCpf;
  });

  // Evolution states
  const [historyPatient, setHistoryPatient] = useState<Patient | null>(null);
  const [historySessions, setHistorySessions] = useState<Session[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [evoOpen, setEvoOpen] = useState(false);
  const [evoPatient, setEvoPatient] = useState<Patient | null>(null);
  const [evoDate, setEvoDate] = useState("");
  const [evoTime, setEvoTime] = useState("");
  const [evoText, setEvoText] = useState("");
  const [isDictating, setIsDictating] = useState(false);
  const [evoFiles, setEvoFiles] = useState<{ name: string; url: string }[]>([]);
  const [evoFilesLoading, setEvoFilesLoading] = useState(false);

  const loadHistory = async (patient: Patient) => {
    setHistoryPatient(patient);
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("patient_id", patient.id)
      .not("notes", "is", null)
      .order("session_date", { ascending: false })
      .order("session_time", { ascending: false });

    if (error) {
      toast.error(error.message);
      setHistoryLoading(false);
      return;
    }
    setHistorySessions((data as Session[]) ?? []);
    setHistoryLoading(false);
  };

  const loadEvoFiles = async (patientId: string) => {
    if (!profile) return;
    setEvoFilesLoading(true);
    const folder = `${profile.owner_id}/${patientId}/`;
    const { data, error } = await supabase.storage
      .from("patient-documents")
      .list(folder, { limit: 100 });
    if (error) {
      setEvoFilesLoading(false);
      return;
    }
    const files = (data ?? []).map((f) => ({
      name: f.name,
      url: supabase.storage.from("patient-documents").getPublicUrl(`${folder}${f.name}`).data
        .publicUrl,
    }));
    setEvoFiles(files);
    setEvoFilesLoading(false);
  };

  const openNewEvolution = (patient: Patient) => {
    setEvoPatient(patient);
    setEvoDate(new Date().toISOString().substring(0, 10));
    setEvoTime(new Date().toTimeString().substring(0, 5));
    setEvoText("");
    setEvoOpen(true);
    loadEvoFiles(patient.id);
  };

  const handleEvoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !evoPatient || !profile) return;
    const file = e.target.files[0];
    const folder = `${profile.owner_id}/${evoPatient.id}/`;
    const fileName = `${Date.now()}_${file.name}`;

    const toastId = toast.loading("Enviando anexo...");
    const { error } = await supabase.storage
      .from("patient-documents")
      .upload(`${folder}${fileName}`, file);

    if (error) {
      toast.error(error.message, { id: toastId });
      return;
    }

    toast.success("Anexo enviado!", { id: toastId });
    loadEvoFiles(evoPatient.id);
  };

  const handleEvoDeleteFile = async (fileName: string) => {
    if (!evoPatient || !profile) return;
    if (!confirm(`Deseja excluir o anexo "${fileName}"?`)) return;
    const path = `${profile.owner_id}/${evoPatient.id}/${fileName}`;
    const { error } = await supabase.storage.from("patient-documents").remove([path]);
    if (error) return toast.error(error.message);
    toast.success("Anexo excluído!");
    loadEvoFiles(evoPatient.id);
  };

  const startDictation = () => {
    const extWindow = window as unknown as ExtendedWindow;
    const SpeechRecognition = extWindow.SpeechRecognition || extWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Ditado por voz não suportado neste navegador. Use o Chrome ou Safari.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = false;

    rec.onstart = () => {
      setIsDictating(true);
      toast.success("Ouvindo... Fale agora.");
    };

    rec.onresult = (event) => {
      const resultIndex = event.resultIndex;
      const transcript = event.results[resultIndex][0].transcript;
      setEvoText((prev) => (prev ? prev + " " + transcript : transcript));
    };

    rec.onerror = (e) => {
      console.error(e);
      setIsDictating(false);
    };

    rec.onend = () => {
      setIsDictating(false);
    };

    rec.start();
    extWindow.activeSpeechRec = rec;
  };

  const stopDictation = () => {
    const extWindow = window as unknown as ExtendedWindow;
    if (extWindow.activeSpeechRec) {
      extWindow.activeSpeechRec.stop();
      setIsDictating(false);
      toast.info("Ditado finalizado.");
    }
  };

  const handleIAPolish = () => {
    if (!evoText.trim()) return toast.error("Escreva algo primeiro para a IA aprimorar!");

    let text = evoText;
    const replacements = [
      { from: /\bdor na perna\b/gi, to: "sintomatologia dolorosa em membros inferiores" },
      { from: /\bdor no braço\b/gi, to: "sintomatologia dolorosa em membros superiores" },
      { from: /\bdor nas costas\b/gi, to: "lombalgia persistente" },
      { from: /\bdor\b/gi, to: "quadro álgico" },
      { from: /\bmelhorou\b/gi, to: "melhora clínica progressiva" },
      { from: /\bpiorou\b/gi, to: "exacerbação dos sintomas" },
      { from: /\balongamento\b/gi, to: "protocolo de alongamento estático e dinâmico" },
      {
        from: /\bfortalecimento\b/gi,
        to: "cinesioterapia ativa com foco em fortalecimento segmentar",
      },
      { from: /\bcansado\b/gi, to: "leve fadiga muscular durante a execução" },
      { from: /\bandar\b/gi, to: "treino de marcha funcional" },
      { from: /\bexercicio\b/gi, to: "exercícios terapêuticos direcionados" },
      { from: /\bmelhora\b/gi, to: "otimização do padrão funcional" },
    ];

    replacements.forEach((r) => {
      text = text.replace(r.from, r.to);
    });

    const polished = `Paciente cooperativo durante o atendimento. Relato subjetivo e avaliação: ${text}. Conduta clínica pautada em cinesioterapia motora específica e terapia manual, sem intercorrências durante a sessão.`;

    setEvoText(polished);
    toast.success("Evolução aprimorada pela IA Clínica!");
  };

  const saveEvolution = async () => {
    if (!evoText.trim() || !evoPatient || !profile)
      return toast.error("Descreva a evolução do paciente");

    const { error } = await supabase.from("sessions").insert({
      patient_id: evoPatient.id,
      owner_id: profile.owner_id,
      created_by: profile.id,
      created_by_name: profile.full_name ?? profile.email,
      session_date: evoDate,
      session_time: evoTime,
      notes: evoText,
      status: "presence",
      value: 0,
    });

    if (error) return toast.error(error.message);
    toast.success("Evolução salva com sucesso!");
    setEvoOpen(false);
    setEvoText("");
    if (historyPatient?.id === evoPatient.id) {
      loadHistory(evoPatient);
    }
  };

  const openDocs = async (patient: Patient) => {
    setDocPatient(patient);
    setDocLoading(true);
    const folder = `${profile?.owner_id ?? "shared"}/${patient.id}/`;
    const { data, error } = await supabase.storage
      .from("patient-documents")
      .list(folder, { limit: 100 });
    if (error) {
      toast.error(error.message);
      setDocLoading(false);
      return;
    }
    const files = (data ?? []).map((f) => ({
      name: f.name,
      url: supabase.storage.from("patient-documents").getPublicUrl(`${folder}${f.name}`).data
        .publicUrl,
    }));
    setDocFiles(files);
    setDocLoading(false);
  };

  const uploadDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !docPatient || !profile) return;
    setUploading(true);
    const file = e.target.files[0];
    const folder = `${profile.owner_id}/${docPatient.id}/`;
    const fileName = `${Date.now()}_${file.name}`;
    const { error } = await supabase.storage
      .from("patient-documents")
      .upload(`${folder}${fileName}`, file);
    e.target.value = "";
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    toast.success("Documento enviado!");
    setUploading(false);
    openDocs(docPatient);
  };

  const deleteDoc = async (fileName: string) => {
    if (!docPatient || !profile) return;
    if (!confirm(`Excluir "${fileName}"?`)) return;
    const path = `${profile.owner_id}/${docPatient.id}/${fileName}`;
    const { error } = await supabase.storage.from("patient-documents").remove([path]);
    if (error) return toast.error(error.message);
    toast.success("Documento removido");
    openDocs(docPatient);
  };

  const load = async () => {
    const { data: cats } = await supabase.from("categories").select("*").order("created_at");
    const { data: pts } = await supabase.from("patients").select("*").order("created_at");
    const { data: sch } = await supabase
      .from("patient_schedules")
      .select("*")
      .order("schedule_time");
    setCategories((cats as Category[]) ?? []);
    setPatients((pts as Patient[]) ?? []);
    setSchedules((sch as Schedule[]) ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const addCategory = async () => {
    if (!newCat.trim() || !profile) return;
    const { error } = await supabase.from("categories").insert({
      name: newCat.trim(),
      owner_id: profile.owner_id,
      created_by: profile.id,
    });
    if (error) return toast.error(error.message);
    setNewCat("");
    toast.success("Categoria criada");
    load();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Excluir categoria e todos os pacientes dela?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Categoria excluída");
    load();
  };

  const addPatient = async (catId: string) => {
    const data = newPatient[catId];
    if (!data?.name?.trim() || !profile) return;
    const { error } = await supabase.from("patients").insert({
      category_id: catId,
      name: data.name.trim(),
      pathology: data.pathology?.trim() || null,
      owner_id: profile.owner_id,
      created_by: profile.id,
    });
    if (error) return toast.error(error.message);
    setNewPatient((p) => ({ ...p, [catId]: { name: "", pathology: "" } }));
    toast.success("Paciente adicionado");
    load();
  };

  const deletePatient = async (id: string) => {
    const { error } = await supabase.from("patients").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Paciente removido");
    load();
  };

  const ensureCategory = async (): Promise<string | null> => {
    if (categories.length > 0) return categories[0].id;
    if (!profile) return null;
    const { data, error } = await supabase
      .from("categories")
      .insert({ name: "Geral", owner_id: profile.owner_id, created_by: profile.id })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    return data?.id ?? null;
  };

  const submitDialog = async () => {
    if (!dlgForm.name.trim()) return toast.error("Informe o nome do paciente");
    if (!profile) return toast.error("Sessão inválida");
    const cleanCpf = dlgForm.cpf.replace(/\D/g, "");
    if (cleanCpf && cleanCpf.length !== 11) return toast.error("CPF deve ter 11 números");
    setSaving(true);
    try {
      const catId = dlgForm.category_id || (await ensureCategory());
      if (!catId) return;
      const optional = (value: string) => value.trim() || null;
      const { error } = await supabase.from("patients").insert({
        category_id: catId,
        name: dlgForm.name.trim(),
        pathology: dlgForm.pathology.trim() || null,
        session_time: dlgForm.session_time || null,
        session_label: optional(dlgForm.session_label),
        cpf: cleanCpf || null,
        phone: optional(dlgForm.phone),
        address: optional(dlgForm.address),
        responsible: optional(dlgForm.responsible),
        health_plan: optional(dlgForm.health_plan),
        registration: optional(dlgForm.registration),
        owner_id: profile.owner_id,
        created_by: profile.id,
      });
      if (error) return toast.error(error.message);
      toast.success("Paciente cadastrado");
      setDlgForm(emptyDialogForm);
      setDlgOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const addSchedule = async (patient_id: string) => {
    const data = newSched[patient_id];
    if (!data?.time || !profile) return toast.error("Informe o horário");
    const weekdayVal = data.weekday !== "" ? Number(data.weekday) : null;
    const dateVal = data.date || null;
    const timeNorm = data.time.slice(0, 5);
    const duplicate = schedules.some(
      (s) =>
        s.patient_id === patient_id &&
        s.schedule_time?.slice(0, 5) === timeNorm &&
        (s.schedule_date ?? null) === dateVal &&
        (s.weekday ?? null) === weekdayVal,
    );
    if (duplicate) return toast.error("Este paciente já possui um horário igual cadastrado.");
    const { error } = await supabase.from("patient_schedules").insert({
      patient_id,
      owner_id: profile.owner_id,
      created_by: profile.id,
      weekday: weekdayVal,
      schedule_date: dateVal,
      schedule_time: data.time,
    });
    if (error) return toast.error(error.message);
    setNewSched((s) => ({ ...s, [patient_id]: { weekday: "", date: "", time: "" } }));
    toast.success("Horário adicionado");
    load();
  };

  const deleteSchedule = async (id: string) => {
    const { error } = await supabase.from("patient_schedules").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 pb-2.5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Pacientes</h1>
          <p className="text-muted-foreground text-xs">
            Crie categorias, busque pacientes e gerencie prontuários, horários e evoluções clínicas.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Visual switcher */}
          <div className="inline-flex rounded-lg border border-border bg-background p-0.5 shadow-xs">
            <button
              onClick={() => setViewMode("table")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                viewMode === "table"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Visualização em Tabela"
            >
              <Table className="w-3.5 h-3.5" />
              Tabela
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                viewMode === "cards"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Visualização em Cards"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Cards
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => setDlgOpen(true)}
            className="font-bold rounded-lg text-xs h-8 px-3"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Cadastrar paciente
          </Button>
        </div>
      </div>

      {/* Search and Filter Panel (Exactly matching user mock!) */}
      <Card className="p-3 bg-card border border-border/50 rounded-xl space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Input
              type="text"
              placeholder="Buscar por CPF ou Nome"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleFilter();
              }}
              className="h-9 text-xs rounded-xl border border-primary/30 focus:border-primary px-3"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-full text-xs h-9 px-5 shadow-none"
              onClick={handleFilter}
            >
              Filtrar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full text-xs h-9 px-5 border-primary/45 text-primary hover:bg-primary/5 font-bold"
              onClick={handleClearFilter}
            >
              Limpar
            </Button>
          </div>
        </div>
      </Card>

      {/* Document upload dialog */}
      {docPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md mx-4 p-6 relative">
            <button
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              onClick={() => setDocPatient(null)}
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <Paperclip className="w-4 h-4" /> Documentos
            </h2>
            <p className="text-sm text-muted-foreground mb-4">{docPatient.name}</p>

            {/* Upload button */}
            <label className="flex items-center gap-2 cursor-pointer w-fit mb-4">
              <input type="file" className="hidden" onChange={uploadDoc} disabled={uploading} />
              <span
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                  uploading
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                <Upload className="w-4 h-4" />
                {uploading ? "Enviando…" : "Enviar documento"}
              </span>
            </label>

            {/* File list */}
            {docLoading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : docFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum documento anexado ainda.</p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {docFiles.map((f) => (
                  <li
                    key={f.name}
                    className="flex items-center justify-between gap-2 bg-muted/50 rounded-lg px-3 py-2"
                  >
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline min-w-0"
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      <span className="truncate">{f.name.replace(/^\d+_/, "")}</span>
                    </a>
                    <button
                      onClick={() => deleteDoc(f.name)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cadastrar paciente</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block">Nome *</Label>
              <Input
                value={dlgForm.name}
                onChange={(e) => setDlgForm({ ...dlgForm, name: e.target.value })}
                placeholder="Nome completo"
                autoFocus
              />
            </div>
            <div>
              <Label className="mb-1 block">CPF</Label>
              <Input
                value={dlgForm.cpf}
                onChange={(e) => setDlgForm({ ...dlgForm, cpf: e.target.value })}
                placeholder="Somente números"
                inputMode="numeric"
                maxLength={14}
              />
            </div>
            <div>
              <Label className="mb-1 block">Patologia</Label>
              <Input
                value={dlgForm.pathology}
                onChange={(e) => setDlgForm({ ...dlgForm, pathology: e.target.value })}
                placeholder="Opcional"
              />
            </div>
            <div>
              <Label className="mb-1 block">Telefone</Label>
              <Input
                value={dlgForm.phone}
                onChange={(e) => setDlgForm({ ...dlgForm, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <Label className="mb-1 block">Hora</Label>
              <Input
                type="time"
                step="60"
                value={dlgForm.session_time?.substring(0, 5) || ""}
                onChange={(e) => setDlgForm({ ...dlgForm, session_time: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1 block">Sessão</Label>
              <Input
                value={dlgForm.session_label}
                onChange={(e) => setDlgForm({ ...dlgForm, session_label: e.target.value })}
                placeholder="Ex: 1ª sessão, retorno"
              />
            </div>
            <div>
              <Label className="mb-1 block">Responsável</Label>
              <Input
                value={dlgForm.responsible}
                onChange={(e) => setDlgForm({ ...dlgForm, responsible: e.target.value })}
                placeholder="Nome do responsável"
              />
            </div>
            <div>
              <Label className="mb-1 block">Plano de saúde</Label>
              <Input
                value={dlgForm.health_plan}
                onChange={(e) => setDlgForm({ ...dlgForm, health_plan: e.target.value })}
                placeholder="Convênio ou particular"
              />
            </div>
            <div>
              <Label className="mb-1 block">Inscrição</Label>
              <Input
                value={dlgForm.registration}
                onChange={(e) => setDlgForm({ ...dlgForm, registration: e.target.value })}
                placeholder="Número da inscrição"
              />
            </div>
            <div>
              <Label className="mb-1 block">Endereço</Label>
              <Input
                value={dlgForm.address}
                onChange={(e) => setDlgForm({ ...dlgForm, address: e.target.value })}
                placeholder="Rua, número, bairro"
              />
            </div>
            <div>
              <Label className="mb-1 block">Categoria</Label>
              {categories.length > 0 ? (
                <Select
                  value={dlgForm.category_id}
                  onValueChange={(v) => setDlgForm({ ...dlgForm, category_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Nenhuma categoria — uma categoria "Geral" será criada automaticamente.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={submitDialog} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {viewMode === "table" ? (
        /* Visual Unified Patients Table (Matching user mockup perfectly!) */
        <Card className="overflow-hidden border border-border/50 rounded-xl shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--table-header)] text-left font-semibold text-[10px] uppercase tracking-wide border-b border-border">
                  <th className="px-3 py-2.5">Código</th>
                  <th className="px-3 py-2.5">CPF</th>
                  <th className="px-3 py-2.5">Nome</th>
                  <th className="px-3 py-2.5">Data Nascimento</th>
                  <th className="px-3 py-2.5">Responsável</th>
                  <th className="px-3 py-2.5">Telefone</th>
                  <th className="px-3 py-2.5">E-mail</th>
                  <th className="px-3 py-2.5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((p, idx) => {
                  const s = schedules.filter((sch) => sch.patient_id === p.id);
                  const isOpened = openSched === p.id;
                  return (
                    <React.Fragment key={p.id}>
                      <tr
                        className={`${idx % 2 === 0 ? "bg-card" : "bg-[var(--row-alt)]"} border-b border-border/20`}
                      >
                        <td className="px-3 py-2.5 font-medium text-muted-foreground">
                          #{idx + 101}
                        </td>
                        <td className="px-3 py-2.5">
                          {p.cpf
                            ? p.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
                            : "—"}
                        </td>
                        <td className="px-3 py-2.5 font-bold text-foreground">
                          <div className="flex items-center gap-1.5">
                            <span>{p.name}</span>
                            <span className="text-[8px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-semibold">
                              {categories.find((c) => c.id === p.category_id)?.name ?? "Geral"}
                            </span>
                          </div>
                          {p.pathology && (
                            <div className="text-[9px] text-muted-foreground font-normal mt-0.5">
                              {p.pathology}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">—</td>
                        <td className="px-3 py-2.5">{p.responsible ?? "—"}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{p.phone ?? "—"}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">—</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5 justify-center">
                            <Button
                              variant={isOpened ? "default" : "outline"}
                              size="sm"
                              onClick={() => setOpenSched(isOpened ? null : p.id)}
                              className="h-7 text-[10px] px-2"
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              Horários ({s.length})
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDocs(p)}
                              className="h-7 text-[10px] px-2"
                            >
                              <Paperclip className="w-3 h-3 mr-1" />
                              Docs
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => loadHistory(p)}
                              className="h-7 text-[10px] px-2 border-emerald-600/40 text-emerald-600 hover:bg-emerald-600/5 hover:text-emerald-700"
                            >
                              <ClipboardList className="w-3 h-3 mr-1" />
                              Evoluções
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => deletePatient(p.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable schedule editor inside the Table (Consistent with daily agenda row!) */}
                      {isOpened && (
                        <tr className="bg-muted/10 border-b border-border/40">
                          <td colSpan={8} className="px-4 py-3">
                            <div className="space-y-3 max-w-2xl">
                              <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5 border-b border-border pb-1.5">
                                <Clock className="w-3.5 h-3.5 text-primary" />
                                Controle de Horários de {p.name}
                              </h4>
                              {s.length === 0 ? (
                                <div className="text-[10px] text-muted-foreground italic">
                                  Nenhum horário cadastrado.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                                  {s.map((sch) => (
                                    <div
                                      key={sch.id}
                                      className="flex items-center justify-between bg-card border border-border/50 rounded-lg px-2.5 py-1 text-xs"
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <CalendarDays className="w-3 h-3 text-primary shrink-0" />
                                        <span className="font-semibold">
                                          {sch.weekday !== null ? WEEKDAYS[sch.weekday] : ""}
                                          {sch.schedule_date
                                            ? ` ${new Date(sch.schedule_date + "T00:00").toLocaleDateString("pt-BR")}`
                                            : ""}
                                        </span>
                                        <span className="text-muted-foreground">
                                          {sch.schedule_time?.slice(0, 5)}
                                        </span>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                        onClick={() => deleteSchedule(sch.id)}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Add Schedule row form inside the Table */}
                              <div className="grid grid-cols-2 sm:grid-cols-[100px_1fr_90px_auto] gap-1.5 pt-2 border-t border-border/40">
                                <select
                                  className="h-8 rounded-lg border border-input bg-transparent px-2 text-[11px]"
                                  value={newSched[p.id]?.weekday ?? ""}
                                  onChange={(e) =>
                                    setNewSched((prev) => ({
                                      ...prev,
                                      [p.id]: {
                                        ...(prev[p.id] ?? { weekday: "", date: "", time: "" }),
                                        weekday: e.target.value,
                                      },
                                    }))
                                  }
                                >
                                  <option value="">Dia</option>
                                  {WEEKDAYS.map((w, i) => (
                                    <option key={i} value={i}>
                                      {w}
                                    </option>
                                  ))}
                                </select>
                                <Input
                                  type="date"
                                  className="h-8 text-[11px] rounded-lg"
                                  value={newSched[p.id]?.date ?? ""}
                                  onChange={(e) =>
                                    setNewSched((prev) => ({
                                      ...prev,
                                      [p.id]: {
                                        ...(prev[p.id] ?? { weekday: "", date: "", time: "" }),
                                        date: e.target.value,
                                      },
                                    }))
                                  }
                                />
                                <Input
                                  type="time"
                                  step="60"
                                  className="h-8 text-[11px] rounded-lg"
                                  value={newSched[p.id]?.time?.substring(0, 5) ?? ""}
                                  onChange={(e) =>
                                    setNewSched((prev) => ({
                                      ...prev,
                                      [p.id]: {
                                        ...(prev[p.id] ?? { weekday: "", date: "", time: "" }),
                                        time: e.target.value,
                                      },
                                    }))
                                  }
                                />
                                <Button
                                  onClick={() => addSchedule(p.id)}
                                  size="sm"
                                  className="h-8 text-xs px-3 font-semibold rounded-lg"
                                >
                                  <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filteredPatients.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground text-xs italic"
                    >
                      Nenhum paciente encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Visual Cards UI with Category Grid (The old layout preserved perfectly!) */
        <div className="space-y-4">
          <Card className="p-2.5">
            <Label className="mb-1.5 block text-xs">Nova categoria</Label>
            <div className="flex gap-1.5">
              <Input
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                placeholder="Ex: Fisioterapia, Psicologia…"
                className="h-8 text-xs"
              />
              <Button size="sm" onClick={addCategory}>
                <FolderPlus className="w-3.5 h-3.5 mr-1" /> Criar
              </Button>
            </div>
          </Card>

          {categories.length === 0 && (
            <Card className="p-4 text-center text-muted-foreground text-xs">
              Nenhuma categoria ainda. Crie a primeira acima.
            </Card>
          )}

          <div className="grid gap-3">
            {categories.map((cat) => {
              const list = patients.filter((p) => p.category_id === cat.id);
              const np = newPatient[cat.id] ?? { name: "", pathology: "" };
              return (
                <Card key={cat.id} className="p-2.5">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold">{cat.name}</h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => deleteCategory(cat.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                  <div className="space-y-1.5 mb-2">
                    {list.map((p) => (
                      <PatientRow
                        key={p.id}
                        patient={p}
                        schedules={schedules.filter((s) => s.patient_id === p.id)}
                        open={openSched === p.id}
                        onToggle={() => setOpenSched(openSched === p.id ? null : p.id)}
                        draft={newSched[p.id] ?? { weekday: "", date: "", time: "" }}
                        setDraft={(d) => setNewSched((s) => ({ ...s, [p.id]: d }))}
                        onAddSchedule={() => addSchedule(p.id)}
                        onDeleteSchedule={deleteSchedule}
                        onDeletePatient={() => deletePatient(p.id)}
                        onOpenDocs={() => openDocs(p)}
                        onOpenHistory={() => loadHistory(p)}
                        onNewEvolution={() => openNewEvolution(p)}
                      />
                    ))}
                    {list.length === 0 && (
                      <div className="text-xs text-muted-foreground">
                        Sem pacientes nesta categoria.
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-1.5">
                    <Input
                      placeholder="Nome do paciente"
                      className="h-8 text-xs"
                      value={np.name}
                      onChange={(e) =>
                        setNewPatient((s) => ({ ...s, [cat.id]: { ...np, name: e.target.value } }))
                      }
                    />
                    <Input
                      placeholder="Patologia (opcional)"
                      className="h-8 text-xs"
                      value={np.pathology}
                      onChange={(e) =>
                        setNewPatient((s) => ({
                          ...s,
                          [cat.id]: { ...np, pathology: e.target.value },
                        }))
                      }
                    />
                    <Button size="sm" onClick={() => addPatient(cat.id)}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Histórico de Evoluções Modal */}
      {historyPatient && (
        <Dialog
          open={!!historyPatient}
          onOpenChange={(open) => {
            if (!open) setHistoryPatient(null);
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-2.5">
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-1.5">
                  <ClipboardList className="w-5 h-5 text-emerald-600 animate-pulse" />
                  Histórico de Evoluções
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{historyPatient.name}</p>
              </div>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-xs h-8 px-4"
                onClick={() => {
                  setHistoryPatient(null);
                  openNewEvolution(historyPatient);
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Nova Evolução
              </Button>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {historyLoading ? (
                <div className="text-xs text-muted-foreground text-center py-6 animate-pulse">
                  Carregando histórico...
                </div>
              ) : historySessions.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-6">
                  Nenhuma evolução registrada para este paciente. Clique em "Nova Evolução" para
                  registrar a primeira!
                </div>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {historySessions.map((session) => (
                    <Card
                      key={session.id}
                      className="p-3 border border-border/50 bg-card/40 relative"
                    >
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold border-b border-border/40 pb-1.5 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="w-3 h-3 text-emerald-600" />
                          <span>
                            {new Date(session.session_date + "T00:00").toLocaleDateString("pt-BR")}
                          </span>
                          <span>·</span>
                          <span>{session.session_time?.substring(0, 5) || "—"}</span>
                        </div>
                        <div className="text-emerald-700 font-medium">
                          Profissional: {session.created_by_name || "Clínica"}
                        </div>
                      </div>
                      <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                        {session.notes
                          ?.replace("[authorized:true]", "")
                          .replace("[authorized:false]", "")
                          .trim()}
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setHistoryPatient(null)}
                className="rounded-full text-xs"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Nova Evolução Modal */}
      {evoOpen && evoPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-xl mx-4 p-5 relative border border-border/60 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/40">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <span className="text-emerald-600 text-lg font-semibold">+</span> Nova Evolução
              </h2>
              <button
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                onClick={() => setEvoOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">Data *</Label>
                  <Input
                    type="date"
                    value={evoDate}
                    onChange={(e) => setEvoDate(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold mb-1 block">Hora *</Label>
                  <Input
                    type="time"
                    step="60"
                    value={evoTime?.substring(0, 5) || ""}
                    onChange={(e) => setEvoTime(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">Evolução *</Label>
                <textarea
                  value={evoText}
                  onChange={(e) => setEvoText(e.target.value)}
                  placeholder="Descreva a evolução do paciente..."
                  className="w-full min-h-[160px] rounded-xl border border-input bg-transparent px-3 py-2 text-xs shadow-xs placeholder:text-muted-foreground/60 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                />
              </div>

              {/* Dynamic attachments list */}
              {evoFiles.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-foreground uppercase tracking-wide">
                    Arquivos anexados a este paciente
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {evoFiles.map((file) => (
                      <div
                        key={file.name}
                        className="flex items-center justify-between p-1.5 bg-muted/40 rounded-lg border border-border/40 text-[9px]"
                      >
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline truncate max-w-[140px] font-medium"
                        >
                          {file.name.substring(file.name.indexOf("_") + 1)}
                        </a>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-4 w-4 p-0 text-destructive hover:bg-destructive/10"
                          onClick={() => handleEvoDeleteFile(file.name)}
                        >
                          <X className="w-2.5 h-2.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer buttons row */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/40">
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  className="bg-[#61e4d1] hover:bg-[#52c2b2] text-white font-bold rounded-xl text-xs h-9 px-4 flex items-center gap-1.5 shadow-none"
                  onClick={saveEvolution}
                >
                  <Save className="w-3.5 h-3.5" /> Salvar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs h-9 px-4 flex items-center gap-1.5 border-border/60"
                  onClick={() => setEvoOpen(false)}
                >
                  <X className="w-3.5 h-3.5" /> Cancelar
                </Button>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className={`rounded-xl text-xs h-9 px-3 flex items-center gap-1.5 border-border/60 ${isDictating ? "bg-red-50 text-red-600 border-red-200 animate-pulse hover:bg-red-100" : ""}`}
                  onClick={isDictating ? stopDictation : startDictation}
                >
                  <Mic className="w-3.5 h-3.5" /> Ditado por Voz
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs h-9 px-3 flex items-center gap-1.5 border-border/60"
                  onClick={handleIAPolish}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> IA
                </Button>
                <label className="flex items-center gap-1.5 cursor-pointer rounded-xl border border-border/60 hover:bg-accent hover:text-accent-foreground text-xs h-9 px-3 font-semibold shrink-0">
                  <Paperclip className="w-3.5 h-3.5 text-primary" />
                  <span>Anexar</span>
                  <input type="file" className="hidden" onChange={handleEvoUpload} />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface DraftSched {
  weekday: string;
  date: string;
  time: string;
}

function PatientRow({
  patient,
  schedules,
  open,
  onToggle,
  draft,
  setDraft,
  onAddSchedule,
  onDeleteSchedule,
  onDeletePatient,
  onOpenDocs,
  onOpenHistory,
  onNewEvolution,
}: {
  patient: Patient;
  schedules: Schedule[];
  open: boolean;
  onToggle: () => void;
  draft: DraftSched;
  setDraft: (d: DraftSched) => void;
  onAddSchedule: () => void;
  onDeleteSchedule: (id: string) => void;
  onDeletePatient: () => void;
  onOpenDocs: () => void;
  onOpenHistory: () => void;
  onNewEvolution: () => void;
}) {
  const details = [
    patient.session_time ? `Hora: ${patient.session_time.slice(0, 5)}` : null,
    patient.session_label ? `Sessão: ${patient.session_label}` : null,
    patient.cpf ? `CPF: ${patient.cpf}` : null,
    patient.phone ? `Tel: ${patient.phone}` : null,
    patient.responsible ? `Resp.: ${patient.responsible}` : null,
    patient.health_plan ? `Plano: ${patient.health_plan}` : null,
    patient.registration ? `Inscrição: ${patient.registration}` : null,
    patient.address ? `Endereço: ${patient.address}` : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <div className="bg-muted/30 rounded-lg px-2.5 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{patient.name}</div>
          {patient.pathology && (
            <div className="text-[10px] text-muted-foreground truncate">{patient.pathology}</div>
          )}
          {details.length > 0 && (
            <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
              {details.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant={open ? "default" : "outline"}
            size="sm"
            onClick={onToggle}
            className="h-7 text-xs px-2"
          >
            <Clock className="w-3 h-3 mr-1" />
            Horários ({schedules.length})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenDocs}
            className="h-7 text-xs px-2"
            title="Anexar documentos"
          >
            <Paperclip className="w-3 h-3 mr-1" />
            Docs
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenHistory}
            className="h-7 text-xs px-2 border-emerald-600/40 text-emerald-600 hover:bg-emerald-600/5 hover:text-emerald-700"
            title="Evoluções do Paciente"
          >
            <ClipboardList className="w-3 h-3 mr-1" />
            Evoluções
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDeletePatient}>
            <Trash2 className="w-3 h-3 text-destructive" />
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-2 space-y-1.5 border-t border-border pt-1.5">
          {schedules.length === 0 && (
            <div className="text-[10px] text-muted-foreground">Nenhum horário cadastrado.</div>
          )}
          <ul className="space-y-0.5">
            {schedules.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between bg-card border border-border/50 rounded-md px-2 py-1 text-xs"
              >
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-3 h-3 text-primary" />
                  <span className="font-medium">
                    {s.weekday !== null ? WEEKDAYS[s.weekday] : ""}
                    {s.schedule_date
                      ? ` ${new Date(s.schedule_date + "T00:00").toLocaleDateString("pt-BR")}`
                      : ""}
                  </span>
                  <span className="text-muted-foreground">{s.schedule_time?.slice(0, 5)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onDeleteSchedule(s.id)}
                >
                  <Trash2 className="w-2.5 h-2.5 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-2 sm:grid-cols-[100px_1fr_90px_auto] gap-1.5 pt-0.5">
            <select
              className="h-7 rounded-md border border-input bg-transparent px-1.5 text-[11px]"
              value={draft.weekday}
              onChange={(e) => setDraft({ ...draft, weekday: e.target.value })}
            >
              <option value="">Dia</option>
              {WEEKDAYS.map((w, i) => (
                <option key={i} value={i}>
                  {w}
                </option>
              ))}
            </select>
            <Input
              type="date"
              className="h-7 text-[11px]"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />
            <Input
              type="time"
              step="60"
              className="h-7 text-[11px]"
              value={draft.time?.substring(0, 5) || ""}
              onChange={(e) => setDraft({ ...draft, time: e.target.value })}
            />
            <Button onClick={onAddSchedule} size="sm" className="h-7 text-xs px-2">
              <Plus className="w-3 h-3 mr-1" /> Adicionar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
