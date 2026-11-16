import { useMemo, useState } from 'react';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { brl, formatData, formatMes, type Aluno } from '@/lib/alunos';
import { dataBrasilia } from '@/lib/pedagogico';
import { caixaQuery, salvarContaCaixa } from '@/lib/caixa.functions';
import { rotuloForma, emAtraso, valorParaBaixa, gerarParcelas, rotuloParcela, vencimentoNoMes, type Parcela } from '@/lib/mensalidades';
import { alterarMensalidades, baixarMensalidade, estornarMensalidade, gerarMensalidades, mensalidadesQuery, situacaoMensalidades, opcoesPagamentoQuery, criarOpcaoPagamento } from '@/lib/mensalidades.functions';

const tone = { aberta: 'bg-accent text-accent-foreground', atraso: 'bg-destructive/15 text-destructive', paga: 'bg-primary/15 text-primary', cancelada: 'bg-muted text-muted-foreground' };
function Selo({ p }: { p: Parcela }) {
  const atraso = emAtraso(p, dataBrasilia());
  const k = atraso ? 'atraso' : p.situacao;
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${tone[k]}`}>{atraso ? 'Em atraso' : p.situacao === 'aberta' ? 'Em aberto' : p.situacao === 'paga' ? 'Paga' : 'Cancelada'}</span>;
}

function useRefresh() {
  const c = useQueryClient();
  return () => Promise.all(['mensalidades', 'lancamentos', 'caixa', 'faturamento'].map((k) => c.invalidateQueries({ queryKey: ['school', k] })));
}

/** Inline payment form: records the installment as an income entry in Financeiro. */
export function BaixaForm({ p, aluno, onDone }: { p: Parcela; aluno?: Aluno | undefined; onDone: () => void }) {
  const { data: caixa } = useSuspenseQuery(caixaQuery);
  const baixar = useServerFn(baixarMensalidade);
  const refresh = useRefresh();
  const hoje = dataBrasilia();
  const [data, setData] = useState(hoje);
  const [valorManual, setValor] = useState<string | null>(null);
  const valor = valorManual ?? String(valorParaBaixa(p, aluno, data));
  const { data: opcoes } = useSuspenseQuery(opcoesPagamentoQuery);
  const qc = useQueryClient();
  const criarOpcao = useServerFn(criarOpcaoPagamento);
  const salvarConta = useServerFn(salvarContaCaixa);
  const formas = opcoes.filter((o) => o.tipo === 'forma' && o.ativo).map((o) => o.nome);
  const bancos = opcoes.filter((o) => o.tipo === 'banco' && o.ativo).map((o) => o.nome);
  const contas = caixa.contas.filter((c) => c.ativa);
  const principal = contas.find((c) => c.nome.trim().toLowerCase() === 'principal');
  const [forma, setForma] = useState(formas.find((f) => f.toLowerCase() === 'boleto') ?? formas[0] ?? 'Boleto');
  const [banco, setBanco] = useState(bancos.find((b) => b.toLowerCase() === 'cora') ?? 'nenhum');
  const [conta, setConta] = useState(principal?.id ?? 'principal');
  const adicionar = async (tipo: 'forma' | 'banco') => {
    const nome = window.prompt(tipo === 'forma' ? 'Nova forma de pagamento' : 'Novo banco / maquininha')?.trim();
    if (!nome) return;
    try { const o = await criarOpcao({ data: { tipo, nome } }); await qc.invalidateQueries({ queryKey: ['school', 'pagamento-opcoes'] }); if (tipo === 'forma') setForma(o.nome); else setBanco(o.nome); toast.success('Opção adicionada'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao adicionar'); }
  };
  const novaConta = async (nome: string) => {
    const c = await salvarConta({ data: { nome, tipo: 'banco', saldo_inicial: null, data_saldo_inicial: null, ativa: true } });
    await qc.invalidateQueries({ queryKey: ['school', 'caixa'] });
    return (c as { id: string }).id;
  };
  const adicionarConta = async () => {
    const nome = window.prompt('Nome da nova conta do caixa')?.trim();
    if (!nome) return;
    try { setConta(await novaConta(nome)); toast.success('Conta criada'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao criar conta'); }
  };
  const [saving, setSaving] = useState(false);
  return <div className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-3 lg:grid-cols-6">
    <div className="space-y-1"><Label>Data do pagamento</Label><Input aria-label="Data do pagamento" type="date" lang="pt-BR" value={data} onChange={(e) => { setData(e.target.value); setValor(null); }} /></div>
    <div className="space-y-1"><Label>Valor recebido (R$)</Label><Input aria-label="Valor recebido" type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} /></div>
    <div className="space-y-1"><Label>Forma</Label><Select value={forma} onValueChange={(v) => v === '__nova' ? void adicionar('forma') : setForma(v)}><SelectTrigger aria-label="Forma de pagamento"><SelectValue /></SelectTrigger><SelectContent>{[...new Set([...formas.filter((f) => f.toLowerCase() === 'boleto'), ...formas, forma])].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}<SelectItem value="__nova">+ Adicionar forma</SelectItem></SelectContent></Select></div>
    <div className="space-y-1"><Label>Banco / maquininha</Label><Select value={banco} onValueChange={(v) => v === '__nova' ? void adicionar('banco') : setBanco(v)}><SelectTrigger aria-label="Banco"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="nenhum">Não informado</SelectItem>{[...new Set([...bancos.filter((b) => b.toLowerCase() === 'cora'), ...bancos, ...(banco === 'nenhum' ? [] : [banco])])].map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}<SelectItem value="__nova">+ Adicionar banco / maquininha</SelectItem></SelectContent></Select></div>
    <div className="space-y-1"><Label>Conta do caixa</Label><Select value={conta} onValueChange={(v) => v === '__nova' ? void adicionarConta() : setConta(v)}><SelectTrigger aria-label="Conta do caixa"><SelectValue /></SelectTrigger><SelectContent>{!principal && <SelectItem value="principal">Principal</SelectItem>}{contas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}<SelectItem value="nenhuma">Sem conta</SelectItem><SelectItem value="__nova">+ Nova conta</SelectItem></SelectContent></Select></div>
    <div className="flex items-end gap-2"><Button type="button" disabled={saving} onClick={async () => {
      setSaving(true);
      try { const contaId = conta === 'nenhuma' ? null : conta === 'principal' ? await novaConta('Principal') : conta; await baixar({ data: { id: p.id, data, valor: Number(valor), forma, banco: banco === 'nenhum' ? '' : banco, conta_id: contaId } }); await refresh(); toast.success('Baixa registrada e lançada como entrada no Financeiro'); onDone(); }
      catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível dar baixa.'); } finally { setSaving(false); }
    }}>{saving ? 'Salvando…' : 'Confirmar baixa'}</Button><Button type="button" variant="ghost" onClick={onDone}>Voltar</Button></div>
  </div>;
}

function Pagamento({ p }: { p: Parcela }) {
  if (p.situacao !== 'paga') return <span className="text-muted-foreground">—</span>;
  return <span>{formatData(p.data_pagamento ?? '')} · {brl(p.valor_pago)} · {rotuloForma(p.forma_pagamento)}{p.banco ? ` · ${p.banco}` : ''}</span>;
}

function Desfazer({ p }: { p: Parcela }) {
  const est = useServerFn(estornarMensalidade);
  const refresh = useRefresh();
  return <Button type="button" size="sm" variant="ghost" onClick={async () => {
    if (!window.confirm('Desfazer esta baixa? A entrada correspondente será removida do Financeiro.')) return;
    try { await est({ data: { id: p.id } }); await refresh(); toast.success('Baixa desfeita'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); }
  }}>Desfazer baixa</Button>;
}

/** Student financial tab: generate, bulk edit/cancel/delete and settle installments. */
export function AlunoMensalidades({ aluno }: { aluno: Aluno }) {
  const { data: todas } = useSuspenseQuery(mensalidadesQuery);
  const parcelas = useMemo(() => todas.filter((p) => p.aluno_id === aluno.id).sort((a, b) => (a.tipo === b.tipo ? a.vencimento.localeCompare(b.vencimento) : a.tipo === 'matricula' ? -1 : 1)), [todas, aluno.id]);
  const gerar = useServerFn(gerarMensalidades);
  const alterar = useServerFn(alterarMensalidades);
  const situacao = useServerFn(situacaoMensalidades);
  const refresh = useRefresh();
  const [sel, setSel] = useState<string[]>([]);
  const [baixa, setBaixa] = useState<string | null>(null);
  const [novoValor, setNovoValor] = useState('');
  const [novoDia, setNovoDia] = useState('');
  const [novaData, setNovaData] = useState('');
  const [g, setG] = useState({ primeira: aluno.primeiraCobranca || dataBrasilia().slice(0, 7), qtd: String(aluno.qtdMensalidades || 12), dia: String(aluno.diaVencimento || 10), valor: aluno.valorMensal === null ? '' : String(aluno.valorMensal), matricula: parcelas.some((p) => p.tipo === 'matricula' && p.situacao !== 'cancelada') || !aluno.valor_matricula ? '' : String(aluno.valor_matricula) });
  const [mostrarGerar, setMostrarGerar] = useState(!parcelas.length);
  const abertas = parcelas.filter((p) => sel.includes(p.id) && p.situacao !== 'paga');
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); await refresh(); setSel([]); toast.success(ok); } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); } };
  const total = (s: Parcela['situacao']) => parcelas.filter((p) => p.situacao === s).reduce((t, p) => t + (s === 'paga' ? p.valor_pago ?? 0 : p.valor), 0);

  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-3">
      <Card label="Em aberto" value={brl(Math.round(total('aberta') * 100) / 100)} />
      <Card label="Recebido" value={brl(Math.round(total('paga') * 100) / 100)} />
      <Card label="Parcelas" value={`${parcelas.filter((p) => p.situacao === 'paga').length} pagas de ${parcelas.filter((p) => p.situacao !== 'cancelada').length}`} />
    </div>
    {mostrarGerar ? <section className="grid gap-3 rounded-lg border p-3 sm:grid-cols-3 lg:grid-cols-6">
      <h3 className="font-semibold sm:col-span-3 lg:col-span-6">Lançar parcelas (valor cheio)</h3>
      <div className="space-y-1"><Label>1ª cobrança</Label><Input aria-label="Primeira cobrança" type="month" value={g.primeira} onChange={(e) => setG({ ...g, primeira: e.target.value })} /></div>
      <div className="space-y-1"><Label>Quantidade</Label><Input aria-label="Quantidade de parcelas" type="number" min={0} max={60} value={g.qtd} onChange={(e) => setG({ ...g, qtd: e.target.value })} /></div>
      <div className="space-y-1"><Label>Dia de vencimento</Label><Input aria-label="Dia de vencimento das parcelas" type="number" min={1} max={31} value={g.dia} onChange={(e) => setG({ ...g, dia: e.target.value })} /></div>
      <div className="space-y-1"><Label>Mensalidade (R$)</Label><Input aria-label="Valor da parcela" type="number" step="0.01" value={g.valor} onChange={(e) => setG({ ...g, valor: e.target.value })} /></div>
      <div className="space-y-1"><Label>Matrícula (R$)</Label><Input aria-label="Valor da matrícula a lançar" type="number" step="0.01" placeholder="Não lançar" value={g.matricula} onChange={(e) => setG({ ...g, matricula: e.target.value })} /></div>
      <div className="flex items-end gap-2"><Button type="button" onClick={() => run(async () => {
        const novas = gerarParcelas({ primeiraCobranca: g.primeira, qtd: Number(g.qtd), dia: Number(g.dia), valor: g.valor === '' ? null : Number(g.valor), valorMatricula: g.matricula === '' ? null : Number(g.matricula), dataMatricula: aluno.data_matricula ?? (aluno.dataMatricula || dataBrasilia()) });
        if (!novas.length) throw new Error('Informe valor e quantidade.');
        await gerar({ data: { aluno_id: aluno.id, parcelas: novas } }); setMostrarGerar(false);
      }, 'Parcelas lançadas')}>Lançar</Button>{parcelas.length > 0 && <Button type="button" variant="ghost" onClick={() => setMostrarGerar(false)}>Fechar</Button>}</div>
    </section> : <Button type="button" variant="outline" onClick={() => setMostrarGerar(true)}>Lançar mais parcelas</Button>}

    {parcelas.length > 0 && <>
      <div className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
        <span className="text-sm text-muted-foreground">{sel.length ? `${sel.length} selecionada(s)` : 'Selecione parcelas para alterar ou excluir em lote'}<br /><span className="text-xs">Novo dia: ajusta o dia mantendo o mês. Data: mesma data para todas. Para uma só, use o lápis.</span></span>
        <Input aria-label="Novo valor em lote" className="w-36" type="number" step="0.01" placeholder="Novo valor" value={novoValor} onChange={(e) => setNovoValor(e.target.value)} />
        <Input aria-label="Novo dia em lote" className="w-28" type="number" min={1} max={31} placeholder="Novo dia" value={novoDia} onChange={(e) => setNovoDia(e.target.value)} />
        <Input aria-label="Nova data de vencimento em lote" title="Mesma data para todas as selecionadas" className="w-40" type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} />
        <Button type="button" size="sm" disabled={!abertas.length || (!novoValor && !novoDia && !novaData)} onClick={() => run(async () => { await alterar({ data: { rows: abertas.filter((p) => p.situacao === 'aberta').map((p) => ({ id: p.id, valor: novoValor ? Number(novoValor) : p.valor, vencimento: novaData || (novoDia && p.tipo === 'mensalidade' ? vencimentoNoMes(p.referencia, Number(novoDia)) : p.vencimento) })) } }); setNovoValor(''); setNovoDia(''); setNovaData(''); }, 'Parcelas alteradas')}>Alterar</Button>
        <Button type="button" size="sm" variant="outline" disabled={!abertas.length} onClick={() => run(() => situacao({ data: { ids: abertas.map((p) => p.id), acao: 'cancelar' } }), 'Parcelas canceladas')}>Cancelar</Button>
        <Button type="button" size="sm" variant="outline" disabled={!abertas.some((p) => p.situacao === 'cancelada')} onClick={() => run(() => situacao({ data: { ids: abertas.map((p) => p.id), acao: 'reabrir' } }), 'Parcelas reabertas')}>Reabrir</Button>
        <Button type="button" size="sm" variant="destructive" disabled={!abertas.length} onClick={() => { if (window.confirm(`Excluir ${abertas.length} parcela(s)? Parcelas pagas não são excluídas.`)) void run(() => situacao({ data: { ids: abertas.map((p) => p.id), acao: 'excluir' } }), 'Parcelas excluídas'); }}>Excluir</Button>
      </div>
      <div className="overflow-x-auto rounded-lg border"><table className="w-full text-sm">
        <thead className="bg-muted/50 text-left"><tr>
          <th className="p-2"><input type="checkbox" aria-label="Selecionar todas" checked={sel.length > 0 && sel.length === parcelas.filter((p) => p.situacao !== 'paga').length} onChange={(e) => setSel(e.target.checked ? parcelas.filter((p) => p.situacao !== 'paga').map((p) => p.id) : [])} /></th>
          <th className="p-2">Item</th><th className="p-2">Referência</th><th className="p-2">Vencimento</th><th className="p-2">Valor</th><th className="p-2">Situação</th><th className="p-2">Pagamento</th><th className="p-2" /></tr></thead>
        <tbody className="divide-y">{parcelas.map((p) => <ParcelaLinha key={p.id} p={p} aluno={aluno} sel={sel.includes(p.id)} onSel={(v) => setSel((s) => (v ? [...s, p.id] : s.filter((x) => x !== p.id)))} baixa={baixa === p.id} setBaixa={setBaixa} />)}</tbody>
      </table></div>
    </>}
  </div>;
}

function ParcelaLinha({ p, aluno, sel, onSel, baixa, setBaixa, mostrarAluno }: { p: Parcela; aluno?: Aluno | undefined; sel?: boolean; onSel?: (v: boolean) => void; baixa: boolean; setBaixa: (id: string | null) => void; mostrarAluno?: boolean }) {
  const cols = mostrarAluno ? 8 : 8;
  return <>
    <tr>
      {mostrarAluno ? <td className="p-2"><div className="font-medium">{aluno?.nome ?? '—'}</div><div className="text-xs text-muted-foreground">{aluno?.codigo}</div></td>
        : <td className="p-2"><input type="checkbox" aria-label={`Selecionar ${rotuloParcela(p)}`} disabled={p.situacao === 'paga'} checked={!!sel} onChange={(e) => onSel?.(e.target.checked)} /></td>}
      <td className="p-2">{rotuloParcela(p)}</td><td className="p-2">{formatMes(p.referencia)}</td><td className="p-2">{formatData(p.vencimento)}</td>
      <td className="p-2">{brl(p.valor)}</td><td className="p-2"><Selo p={p} /></td><td className="p-2"><Pagamento p={p} /></td>
      <td className="p-2 text-right whitespace-nowrap">{p.situacao === 'aberta' && !mostrarAluno && <EditarParcela p={p} />}{p.situacao === 'aberta' && !baixa && <Button type="button" size="sm" onClick={() => setBaixa(p.id)}>Dar baixa</Button>}{p.situacao === 'paga' && <Desfazer p={p} />}</td>
    </tr>
    {baixa && <tr><td colSpan={cols} className="p-2"><BaixaForm p={p} aluno={aluno} onDone={() => setBaixa(null)} /></td></tr>}
  </>;
}

/** Renegotiate one open installment: due date and amount. */
function EditarParcela({ p }: { p: Parcela }) {
  const alterar = useServerFn(alterarMensalidades);
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  const [venc, setVenc] = useState(p.vencimento);
  const [valor, setValor] = useState(String(p.valor));
  if (!open) return <Button type="button" size="sm" variant="ghost" aria-label={`Editar ${rotuloParcela(p)}`} onClick={() => { setVenc(p.vencimento); setValor(String(p.valor)); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>;
  return <span className="mr-2 inline-flex items-center gap-1">
    <Input aria-label="Vencimento da parcela" className="h-8 w-36" type="date" value={venc} onChange={(e) => setVenc(e.target.value)} />
    <Input aria-label="Valor da parcela editada" className="h-8 w-24" type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
    <Button type="button" size="sm" onClick={async () => { try { await alterar({ data: { rows: [{ id: p.id, vencimento: venc, valor: Number(valor) }] } }); await refresh(); setOpen(false); toast.success('Parcela alterada'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); } }}>Salvar</Button>
    <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>×</Button>
  </span>;
}

function Card({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-card p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="text-lg font-semibold text-primary">{value}</div></div>;
}

/** All students' installments with filters, for the Mensalidades page. */
export function PainelMensalidades({ alunos }: { alunos: Aluno[] }) {
  const { data: todas } = useSuspenseQuery(mensalidadesQuery);
  const hoje = dataBrasilia();
  const [sit, setSit] = useState<'aberta' | 'atraso' | 'paga' | 'cancelada' | 'todas'>('aberta');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [busca, setBusca] = useState('');
  const [baixa, setBaixa] = useState<string | null>(null);
  const porId = useMemo(() => new Map(alunos.map((a) => [a.id, a])), [alunos]);
  const q = busca.trim().toLowerCase();
  const lista = todas.filter((p) => {
    if (sit === 'atraso' ? !emAtraso(p, hoje) : sit !== 'todas' && p.situacao !== sit) return false;
    const d = p.situacao === 'paga' ? p.data_pagamento ?? p.vencimento : p.vencimento;
    if (de && d < de) return false; if (ate && d > ate) return false;
    if (q) { const a = porId.get(p.aluno_id); if (!a || !(a.nome.toLowerCase().includes(q) || a.codigo.includes(q))) return false; }
    return true;
  }).slice(0, 500);
  const soma = (f: (p: Parcela) => boolean, v: (p: Parcela) => number) => brl(Math.round(todas.filter(f).reduce((s, p) => s + v(p), 0) * 100) / 100);
  const mes = hoje.slice(0, 7);
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-3">
      <Card label="Em aberto" value={soma((p) => p.situacao === 'aberta', (p) => p.valor)} />
      <Card label="Em atraso" value={soma((p) => emAtraso(p, hoje), (p) => p.valor)} />
      <Card label="Recebido neste mês" value={soma((p) => p.situacao === 'paga' && (p.data_pagamento ?? '').startsWith(mes), (p) => p.valor_pago ?? 0)} />
    </div>
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1"><Label>Situação</Label><Select value={sit} onValueChange={(v) => setSit(v as typeof sit)}><SelectTrigger aria-label="Situação" className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="aberta">Em aberto</SelectItem><SelectItem value="atraso">Em atraso</SelectItem><SelectItem value="paga">Pagas</SelectItem><SelectItem value="cancelada">Canceladas</SelectItem><SelectItem value="todas">Todas</SelectItem></SelectContent></Select></div>
      <div className="space-y-1"><Label>De</Label><Input aria-label="De" type="date" value={de} onChange={(e) => setDe(e.target.value)} /></div>
      <div className="space-y-1"><Label>Até</Label><Input aria-label="Até" type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
      <div className="min-w-48 flex-1 space-y-1"><Label>Aluno</Label><Input aria-label="Buscar aluno" placeholder="Nome ou código" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
    </div>
    <div className="overflow-x-auto rounded-lg border"><table className="w-full text-sm">
      <thead className="bg-muted/50 text-left"><tr><th className="p-2">Aluno</th><th className="p-2">Item</th><th className="p-2">Referência</th><th className="p-2">Vencimento</th><th className="p-2">Valor</th><th className="p-2">Situação</th><th className="p-2">Pagamento</th><th className="p-2" /></tr></thead>
      <tbody className="divide-y">{lista.length === 0 ? <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Nenhuma parcela encontrada. Lance as parcelas na ficha do aluno, aba Financeiro.</td></tr>
        : lista.map((p) => <ParcelaLinha key={p.id} p={p} aluno={porId.get(p.aluno_id)} baixa={baixa === p.id} setBaixa={setBaixa} mostrarAluno />)}</tbody>
    </table></div>
  </div>;
}
