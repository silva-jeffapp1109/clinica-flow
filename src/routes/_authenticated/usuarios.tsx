import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { SPECIALTIES, specialtyOf } from "@/lib/specialty";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: UsuariosPage,
});

interface Member {
  id: string;
  email: string;
  full_name: string | null;
  role?: string;
  specialty?: string | null;
}

function UsuariosPage() {
  const { isAdmin, profile } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [specialty, setSpecialty] = useState<string>("outro");
  const [submitting, setSubmitting] = useState(false);

  if (!isAdmin) return <Navigate to="/entradas" />;

  const load = async () => {
    const { data: profs } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");
    const map = new Map<string, string>();
    (roles ?? []).forEach((r: any) => map.set(r.user_id, r.role));
    setMembers(((profs as any[]) ?? []).map((p) => ({ ...p, role: map.get(p.id) })));
  };
  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);
    // Use signUp with metadata; session will switch — so we restore after.
    const currentSession = (await supabase.auth.getSession()).data.session;
    const { data: signed, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role, full_name: fullName, owner_id: profile.owner_id } },
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    // Set specialty on the freshly created profile
    const newId = signed?.user?.id;
    if (newId) {
      await supabase
        .from("profiles")
        .update({ specialty: specialty as any })
        .eq("id", newId);
    }
    // Restore admin session
    if (currentSession) await supabase.auth.setSession(currentSession);
    toast.success("Usuário criado");
    setEmail("");
    setPassword("");
    setFullName("");
    setRole("staff");
    setSpecialty("outro");
    load();
  };

  const updateSpecialty = async (userId: string, value: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ specialty: value as any })
      .eq("id", userId);
    if (error) return toast.error(error.message);
    toast.success("Especialidade atualizada");
    load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Usuários</h1>
        <p className="text-muted-foreground text-xs">
          Adicione admins e staff vinculados à sua operação.
        </p>
      </div>

      <Card className="p-3">
        <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <UserPlus className="w-3.5 h-3.5" /> Novo usuário
        </h2>
        <form onSubmit={create} className="grid gap-2 md:grid-cols-6">
          <div className="md:col-span-2">
            <Label className="text-xs">Nome</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="h-8 text-xs"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Senha</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={4}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Função</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "admin" | "staff")}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Label className="text-xs">Especialidade</Label>
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPECIALTIES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ background: s.color }}
                      />
                      {s.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3 flex items-end">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Criando…" : "Criar usuário"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-3">
        <h2 className="text-sm font-semibold mb-2">Membros da operação</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[var(--table-header)] text-left">
              <tr>
                <th className="px-2 py-1.5 font-semibold">Nome</th>
                <th className="px-2 py-1.5 font-semibold">Email</th>
                <th className="px-2 py-1.5 font-semibold">Função</th>
                <th className="px-2 py-1.5 font-semibold">Especialidade</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => {
                const sp = specialtyOf(m.specialty);
                return (
                  <tr key={m.id} className={i % 2 === 0 ? "bg-card" : "bg-[var(--row-alt)]"}>
                    <td className="px-2 py-1.5">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ background: sp.color }}
                        />
                        {m.full_name ?? "—"}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">{m.email}</td>
                    <td className="px-2 py-1.5 capitalize">{m.role ?? "—"}</td>
                    <td className="px-2 py-1.5">
                      <Select
                        value={m.specialty ?? "outro"}
                        onValueChange={(v) => updateSpecialty(m.id, v)}
                      >
                        <SelectTrigger className="h-7 text-xs w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SPECIALTIES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              <span className="inline-flex items-center gap-1.5">
                                <span
                                  className="inline-block w-2.5 h-2.5 rounded-full"
                                  style={{ background: s.color }}
                                />
                                {s.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
