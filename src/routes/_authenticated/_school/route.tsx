import { createFileRoute, Outlet } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { acessoPermitido } from '@/lib/access';
import { StoreProvider } from '@/lib/store';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { alunosQuery } from '@/lib/alunos-query';
import { faturamentoQuery } from '@/lib/faturamento.functions';

export const Route = createFileRoute('/_authenticated/_school')({
  beforeLoad: async () => {
    const { data, error } = await supabase.from('user_roles').select('role');
    if (error) throw new Error('Não foi possível verificar seu acesso. Tente novamente.');
    return { ownerAllowed: acessoPermitido(data) };
  },
  loader: async ({ context }) => {
    if (context.ownerAllowed) await Promise.all([
      context.queryClient.ensureQueryData(alunosQuery),
      context.queryClient.ensureQueryData(faturamentoQuery),
    ]);
  },
  component: SchoolLayout,
  errorComponent: ({ reset }) => {
    const router = useRouter();
    return <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Não foi possível carregar os dados</h1>
      <p className="text-muted-foreground">A conexão falhou por um momento. Tente novamente.</p>
      <Button onClick={() => { reset(); void router.invalidate(); }}>Tentar novamente</Button>
    </main>;
  },
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