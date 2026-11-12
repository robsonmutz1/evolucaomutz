import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useState, type ReactNode } from "react";
import { LayoutDashboard, Users, Wallet, Menu, X, LogOut, FileText, ContactRound } from "lucide-react";
import logoAsset from "@/assets/evolmutz-logo.jpg.asset.json";

const nav = [
  { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { to: "/alunos", label: "Alunos", icon: Users },
  { to: "/pedagogico", label: "Pedagógico", icon: FileText },
  { to: "/financeiro", label: "Financeiro da escola", icon: Wallet },
  { to: "/fluxo-caixa", label: "Fluxo de Caixa e Conferência", icon: Wallet },
  { to: "/relatorios", label: "Relatórios", icon: FileText },
  { to: "/crm", label: "CRM", icon: ContactRound },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  async function sair() {
    await queryClient.cancelQueries(); queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: '/auth', replace: true });
  }
  return (
    <div className="min-h-screen md:flex">
      <header className="flex items-center justify-between bg-sidebar px-4 py-3 text-sidebar-foreground md:hidden print:hidden">
        <Brand />
        <Button variant="ghost" size="icon" aria-label="Menu" onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </Button>
      </header>
      <aside
        className={`${open ? "block" : "hidden"} shrink-0 bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:flex md:h-screen md:w-64 md:flex-col print:hidden`}
      >
        <div className="hidden p-6 md:block">
          <Brand />
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              activeOptions={{ exact: to === "/dashboard" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary" }}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <Button variant="ghost" className="mx-3 justify-start text-sidebar-foreground" onClick={sair}><LogOut /> Sair</Button>
        <p className="mt-auto hidden p-6 text-xs opacity-60 md:block">Acesso restrito · Evolução Mutz</p>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8 print:p-0">{children}</main>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <img src={logoAsset.url} alt="Evolução Mutz" className="h-14 w-auto rounded-lg" />
      <div className="text-xs opacity-70">Gestão escolar</div>
    </div>
  );
}
