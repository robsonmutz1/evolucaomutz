import { createFileRoute } from '@tanstack/react-router';
import { PainelMensalidades } from '@/components/Mensalidades';
import { useStore } from '@/lib/store';
import { mensalidadesQuery } from '@/lib/mensalidades.functions';
import { caixaQuery } from '@/lib/caixa.functions';

export const Route = createFileRoute('/_authenticated/_school/mensalidades')({
  head: () => ({ meta: [
    { title: 'Mensalidades · Evolução Mutz' },
    { name: 'description', content: 'Parcelas em aberto, em atraso e baixas de mensalidades e matrículas da Evolução Mutz.' },
    { property: 'og:title', content: 'Mensalidades · Evolução Mutz' },
    { property: 'og:description', content: 'Controle de mensalidades e baixas da Evolução Mutz.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(mensalidadesQuery), context.queryClient.ensureQueryData(caixaQuery)]),
  component: Page,
});
function Page() {
  const { alunos } = useStore();
  return <div className="mx-auto max-w-7xl space-y-6"><h1 className="text-3xl font-semibold">Mensalidades</h1><PainelMensalidades alunos={alunos} /></div>;
}
