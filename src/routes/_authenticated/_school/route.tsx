import { createFileRoute, Outlet } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { acessoPermitido } from '@/lib/access';
import { StoreProvider } from '@/lib/store';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { alunosQuery } from '@/lib/alunos-query';

export const Route = createFileRoute('/_authenticated/_school')({
  beforeLoad: async () => {
    const { data, error } = await supabase.from('user_roles').select('role');
    if (error) throw new Error('Não foi possível verificar seu acesso. Tente novamente.');
    return { ownerAllowed: acessoPermitido(data) };
  },
  loader: async ({ context }) => {
    if (context.ownerAllowed) await context.queryClient.ensureQueryData(alunosQuery);
  },
  component: SchoolLayout,
});

function SchoolLayout() {
  const { ownerAllowed } = Route.useRouteContext();
  const client = useQueryClient();
  const navigate = useNavigate();
  async function sair() {
    await client.cancelQueries(); client.clear();
    await supabase.auth.signOut();
    await navigate({ to: '/auth', replace: true });
  }
  if (!ownerAllowed) return <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-6">
    <h1 className="text-3xl font-semibold">Acesso pendente</h1>
    <p className="text-muted-foreground">Esta conta ainda não foi autorizada pelo responsável da Evolução Mutz.</p>
    <Button variant="outline" onClick={sair}>Sair</Button>
  </main>;
  return <StoreProvider><AppShell><Outlet /></AppShell></StoreProvider>;
}