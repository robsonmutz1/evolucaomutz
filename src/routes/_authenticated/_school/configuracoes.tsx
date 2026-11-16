import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { editarOrigem, origensQuery, salvarOrigem } from '@/lib/mensalidades.functions';

export const Route = createFileRoute('/_authenticated/_school/configuracoes')({
  head: () => ({ meta: [
    { title: 'Configurações · Evolução Mutz' },
    { name: 'description', content: 'Configurações do sistema da Evolução Mutz, como origens de lead.' },
    { property: 'og:title', content: 'Configurações · Evolução Mutz' },
    { property: 'og:description', content: 'Configurações do sistema de gestão escolar.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(origensQuery),
  component: Page,
});

function Page() {
  const { data: origens } = useSuspenseQuery(origensQuery);
  const qc = useQueryClient();
  const add = useServerFn(salvarOrigem);
  const edit = useServerFn(editarOrigem);
  const [nova, setNova] = useState('');
  const [editando, setEditando] = useState<{ id: string; nome: string } | null>(null);
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); await qc.invalidateQueries({ queryKey: ['school'] }); toast.success(ok); return true; } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); return false; } };
  return <div className="mx-auto max-w-3xl space-y-6">
    <h1 className="text-3xl font-semibold">Configurações</h1>
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">Origens do lead</h2>
      <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (await run(() => add({ data: { nome: nova } }), 'Origem adicionada')) setNova(''); }}>
        <Input aria-label="Nova origem" placeholder="Nova origem (ex.: TikTok/Vídeo)" value={nova} onChange={(e) => setNova(e.target.value)} />
        <Button type="submit" disabled={!nova.trim()}>Adicionar</Button>
      </form>
      <ul className="divide-y rounded-md border">{origens.map((o) => <li key={o.id} className="flex flex-wrap items-center gap-2 p-2">
        {editando?.id === o.id ? <form className="flex flex-1 gap-2" onSubmit={async (e) => { e.preventDefault(); if (await run(() => edit({ data: { id: o.id, nome: editando.nome } }), 'Origem renomeada')) setEditando(null); }}>
          <Input aria-label="Nome da origem" value={editando.nome} onChange={(e) => setEditando({ id: o.id, nome: e.target.value })} autoFocus />
          <Button type="submit" size="sm">Salvar</Button><Button type="button" size="sm" variant="ghost" onClick={() => setEditando(null)}>Cancelar</Button>
        </form> : <>
          <span className={`flex-1 ${o.ativo ? '' : 'text-muted-foreground line-through'}`}>{o.nome}</span>
          <Button type="button" size="sm" variant="ghost" aria-label={`Renomear ${o.nome}`} onClick={() => setEditando({ id: o.id, nome: o.nome })}><Pencil className="h-4 w-4" /></Button>
          <Button type="button" size="sm" variant="outline" onClick={() => void run(() => edit({ data: { id: o.id, ativo: !o.ativo } }), o.ativo ? 'Origem desativada' : 'Origem ativada')}>{o.ativo ? 'Desativar' : 'Ativar'}</Button>
          <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => { if (window.confirm(`Excluir a origem "${o.nome}"?`)) void run(() => edit({ data: { id: o.id, excluir: true } }), 'Origem excluída'); }}>Excluir</Button>
        </>}
      </li>)}</ul>
      <p className="text-xs text-muted-foreground">Renomear atualiza os alunos que já usam a origem. Origens em uso não podem ser excluídas, só desativadas.</p>
    </section>
  </div>;
}
