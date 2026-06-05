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

  const load = async () => {
    const { data: profs } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");
    const map = new Map<string, string>();
    ((roles as { user_id: string; role: string }[]) ?? []).forEach((r) =>
      map.set(r.user_id, r.role),
    );
    setMembers(
      (
        (profs as {
          id: string;
          email: string;
          full_name: string | null;
          specialty: string | null;
        }[]) ?? []
      ).map((p) => ({ ...p, role: map.get(p.id) })),
    );
  };

  useEffect(() => {
    load();
  }, []);

  if (!isAdmin) return <Navigate to="/entradas" />;

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    // Validações locais
    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setSubmitting(true);

    try {
      // Salva a sessão atual do admin ANTES de qualquer operação
      const { data: sessionData } = await supabase.auth.getSession();
      const currentSession = sessionData.session;

      if (!currentSession) {
        toast.error("Sessão expirada. Faça login novamente.");
        setSubmitting(false);
        return;
      }

      const savedAccessToken = currentSession.access_token;
      const savedRefreshToken = currentSession.refresh_token;

      // Cria o novo usuário via signUp
      const { data: signed, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            full_name: fullName,
            owner_id: profile.owner_id,
          },
        },
      });

      if (error) {
        // Restaura sessão do admin em caso de erro
        await supabase.auth.setSession({
          access_token: savedAccessToken,
          refresh_token: savedRefreshToken,
        });
        toast.error(`Erro ao criar usuário: ${error.message}`);
        setSubmitting(false);
        return;
      }

      const newId = signed?.user?.id;

      // Restaura a sessão do admin IMEDIATAMENTE (antes de qualquer outra operação)
      await supabase.auth.setSession({
        access_token: savedAccessToken,
        refresh_token: savedRefreshToken,
      });

      // Agora com a sessão do admin restaurada, atualiza o perfil e role do novo usuário
      if (newId) {
        const { error: specError } = await supabase
          .from("profiles")
          .update({ specialty: specialty as never })
          .eq("id", newId);

        if (specError) {
          console.warn("Erro ao definir especialidade:", specError.message);
        }

        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: newId, role: role as "admin" | "staff" });

        if (roleError) {
          console.warn("Erro ao definir função:", roleError.message);
          toast.warning("Usuário criado, mas houve erro ao definir a função. Verifique manualmente.");
        }
      }

      toast.success(`Usuário "${fullName}" criado com sucesso!`);
      setEmail("");
      setPassword("");
      setFullName("");
      setRole("staff");
      setSpecialty("outro");
      load();
    } catch (err) {
      console.error("Erro inesperado ao criar usuário:", err);
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const updateSpecialty = async (userId: string, value: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ specialty: value as never })
      .eq("id", userId);
    if (error) return toast.error(error.message);
    toast.success("Especialidade atualizada");
    load();
  };

  return (
    <div className="space-y-4 p-4">
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
              minLength={6}
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
