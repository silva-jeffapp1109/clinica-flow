import { createFileRoute, Outlet, Navigate, Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { LogOut, Users, Calendar, UserCog, Home, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { loading, user, profile, role, isAdmin, signOut } = useAuth();
  const router = useRouter();

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando…
      </div>
    );
  if (!user) return <Navigate to="/login" />;

  const handleLogout = async () => {
    await signOut();
    router.navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header Superior */}
      <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {/* Logo da Empresa */}
          <div className="flex items-center gap-2 font-bold text-sm text-primary">
            <span className="p-1 bg-primary/10 rounded-lg">
              <Calendar className="w-4 h-4 text-primary" />
            </span>
            <span className="hidden sm:inline">Clínica Flow</span>
          </div>
        </div>

        {/* Indicador Central */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Prestador</span>
        </div>

        {/* Nome do Profissional no Topo Direito */}
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-foreground">
              Olá, {profile?.full_name ?? (profile?.email ?? user?.email)?.split("@")[0] ?? "Profissional"}
            </div>
            <div className="text-[10px] text-muted-foreground capitalize">{role ?? "Staff"}</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center font-bold text-xs text-primary border border-border">
            {(profile?.full_name ?? profile?.email ?? user?.email)?.[0]?.toUpperCase() ?? "P"}
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-16 md:w-20 shrink-0 bg-card border-r border-border flex flex-col items-center py-3 gap-1.5 sticky top-14 h-[calc(100vh-3.5rem)]">
          <NavItem to="/home" icon={<Home className="w-4 h-4" />} label="Home" />
          <NavItem to="/pacientes" icon={<Users className="w-4 h-4" />} label="Pacientes" />
          <NavItem to="/entradas" icon={<Calendar className="w-4 h-4" />} label="Agenda" />
          <NavItem to="/relatorios" icon={<BarChart3 className="w-4 h-4" />} label="Relatórios" />
          {isAdmin && (
            <NavItem to="/usuarios" icon={<UserCog className="w-4 h-4" />} label="Usuários" />
          )}
          <div className="mt-auto flex flex-col items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Sair"
              className="text-destructive hover:text-destructive h-8 w-8 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </aside>
        <main className="flex-1 min-w-0 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="w-14 flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg text-[10px] font-medium text-foreground/70 hover:bg-accent/60 transition-colors"
      activeProps={{
        className:
          "bg-accent text-primary [&_.icon-wrap]:bg-primary [&_.icon-wrap]:text-primary-foreground",
      }}
    >
      <span className="icon-wrap bg-accent/70 rounded-lg p-1.5 transition-colors">{icon}</span>
      <span className="leading-tight">{label}</span>
    </Link>
  );
}
