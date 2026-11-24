import { useMemo, useState } from 'react';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { brl, formatData, formatMes } from '@/lib/alunos';
import { lerDinheiro } from '@/lib/caixa';
import { caixaQuery } from '@/lib/caixa.functions';
import { cadastrosFinanceirosQuery } from '@/lib/financeiro-cadastros.functions';
import { hojeFinanceiro, tipoPermitido } from '@/lib/financeiro-cadastros';
import { statusConta, type ContaPagar, type StatusConta } from '@/lib/contas-pagar';
import { contasPagarQuery, criarContaPagar, editarContaPagar, estornarContaPagar, excluirContaPagar, pagarContaPagar } from '@/lib/contas-pagar.functions';
import { FinanceiroCombobox } from './FinanceiroCombobox';
import { FinanceiroDatePicker } from './FinanceiroDatePicker';

const ROTULO: Record<StatusConta, [string, string]> = { atrasada: ['Em atraso', 'bg-destructive text-destructive-foreground'], hoje: ['Vence hoje', 'bg-warning text-warning-foreground'], a_vencer: ['A vencer', 'bg-muted text-foreground'], paga: ['Paga', 'bg-success text-success-foreground'] };
type Form = { id?: string; descricao: string; grupo: string; categoria: string; valor: string; vencimento: string; parcelas: string; continua: boolean; observacao: string; futuras: boolean; recorrente: boolean };

export function ContasPagar() {
  const { data } = useSuspenseQuery(contasPagarQuery);
  const { data: caixa } = useSuspenseQuery(caixaQuery);
  const { data: cad } = useSuspenseQuery(cadastrosFinanceirosQuery);
  const qc = useQueryClient();
  const criar = useServerFn(criarContaPagar), editar = useServerFn(editarContaPagar), excluir = useServerFn(excluirContaPagar), pagar = useServerFn(pagarContaPagar), estornar = useServerFn(estornarContaPagar);
  const hoje = hojeFinanceiro();
  const meses = useMemo(() => [...new Set([hoje.slice(0, 7), ...data.map((c) => c.vencimento.slice(0, 7))])].sort(), [data, hoje]);
  const [mes, setMes] = useState(hoje.slice(0, 7));
  const [fStatus, setFStatus] = useState<'todas' | StatusConta>('todas');
  const [form, setForm] = useState<Form | null>(null);
  const [baixa, setBaixa] = useState<{ c: ContaPagar; data: string; valor: string; conta: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const contasAtivas = caixa.contas.filter((c) => c.ativa);
  const contaPadrao = (contasAtivas.find((c) => c.nome === 'Principal') ?? contasAtivas[0])?.id ?? '';
  const doMes = data.filter((c) => mes === 'todos' || c.vencimento.slice(0, 7) === mes);
  const lista = doMes.filter((c) => fStatus === 'todas' || statusConta(c, hoje) === fStatus);
  const atrasadasGeral = data.filter((c) => statusConta(c, hoje) === 'atrasada');
  const pago = doMes.filter((c) => c.situacao === 'paga').reduce((s, c) => s + (c.valor_pago ?? c.valor), 0);
  const falta = doMes.filter((c) => c.situacao === 'aberta').reduce((s, c) => s + c.valor, 0);

  const refresh = async (cash = false) => { await qc.invalidateQueries({ queryKey: contasPagarQuery.queryKey }); if (cash) { void qc.invalidateQueries({ queryKey: ['school', 'lancamentos'] }); void qc.invalidateQueries({ queryKey: caixaQuery.queryKey }); void qc.invalidateQueries({ queryKey: ['school', 'faturamento'] }); } };
  const run = async (fn: () => Promise<unknown>, ok: string, cash = false) => { setBusy(true); try { await fn(); await refresh(cash); toast.success(ok); return true; } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); return false; } finally { setBusy(false); } };

  async function salvar() {
    if (!form) return;
    let valor: number; try { valor = lerDinheiro(form.valor); } catch (e) { toast.error((e as Error).message); return; }
    if (form.id) { if (await run(() => editar({ data: { id: form.id!, descricao: form.descricao, grupo: form.grupo, categoria: form.categoria, valor, vencimento: form.vencimento, observacao: form.observacao, futuras: form.futuras } }), 'Conta atualizada')) setForm(null); return; }
    const parcelas = form.continua ? 12 : Number(form.parcelas);
    if (await run(() => criar({ data: { descricao: form.descricao, grupo: form.grupo, categoria: form.categoria, valor, vencimento: form.vencimento, parcelas, observacao: form.observacao } }), parcelas > 1 ? `${parcelas} vencimentos agendados` : 'Conta agendada')) { setMes(form.vencimento.slice(0, 7)); setForm(null); }
  }
  async function confirmarBaixa() {
    if (!baixa) return;
    let valor: number; try { valor = lerDinheiro(baixa.valor); } catch (e) { toast.error((e as Error).message); return; }
    if (await run(() => pagar({ data: { id: baixa.c.id, data: baixa.data, valor, conta_id: baixa.conta } }), 'Pagamento registrado e saída lançada no Financeiro', true)) setBaixa(null);
  }
  async function remover(c: ContaPagar) {
    const futuras = !!c.recorrencia_id && confirm('Excluir também os próximos vencimentos em aberto desta conta recorrente? (OK = esta e as próximas, Cancelar = escolher só esta)');
    if (!futuras && !confirm(`Excluir “${c.descricao}” de ${formatData(c.vencimento)}?`)) return;
    await run(() => excluir({ data: { id: c.id, futuras } }), 'Excluído');
  }
  const seriesAcabando = useMemo(() => { const ult = new Map<string, ContaPagar>(); for (const c of data) if (c.recorrencia_id && (c.total_parcelas ?? 0) >= 12) { const p = ult.get(c.recorrencia_id); if (!p || c.vencimento > p.vencimento) ult.set(c.recorrencia_id, c); } const ini = hoje.slice(0, 7), fim = addMes(ini, 2); return [...ult.values()].filter((c) => c.vencimento.slice(0, 7) >= ini && c.vencimento.slice(0, 7) <= fim); }, [data, hoje]);
  const novo = (): Form => ({ descricao: '', grupo: '', categoria: '', valor: '', vencimento: hoje, parcelas: '1', continua: false, observacao: '', futuras: true, recorrente: false });

  return <section className="min-w-0 space-y-4 p-1">
    {atrasadasGeral.length > 0 && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"><strong>{atrasadasGeral.length} conta(s) em atraso</strong> somando {brl(atrasadasGeral.reduce((s, c) => s + c.valor, 0))}.</div>}
    {seriesAcabando.map((c) => <div key={c.id} className="rounded-md border p-3 text-sm">A conta recorrente “{c.descricao}” tem vencimentos agendados só até {formatData(c.vencimento)}. <Button variant="link" className="h-auto p-0" onClick={() => setForm({ ...novo(), descricao: c.descricao, grupo: c.grupo, categoria: c.categoria, valor: String(c.valor).replace('.', ','), vencimento: addMes(c.vencimento.slice(0, 7), 1) + c.vencimento.slice(7), continua: true })}>Agendar mais 12 meses</Button></div>)}
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1"><Label>Mês de vencimento</Label><Select value={mes} onValueChange={setMes}><SelectTrigger className="w-48" aria-label="Mês das contas"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os meses</SelectItem>{meses.map((m) => <SelectItem key={m} value={m}>{formatMes(m)}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1"><Label>Situação</Label><Select value={fStatus} onValueChange={(v) => setFStatus(v as typeof fStatus)}><SelectTrigger className="w-48" aria-label="Situação das contas"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todas">Todas</SelectItem>{(Object.keys(ROTULO) as StatusConta[]).map((k) => <SelectItem key={k} value={k}>{ROTULO[k][0]}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <Button onClick={() => setForm(novo())}><Plus className="mr-1 h-4 w-4" />Nova conta a pagar</Button>
    </div>
    <div className="grid gap-4 border-y py-4 sm:grid-cols-3">
      {[['Total do período', brl(pago + falta)], ['Já pago', brl(pago)], ['Falta pagar', brl(falta)]].map(([k, v]) => <div key={k}><p className="text-sm text-muted-foreground">{k}</p><p className="text-xl font-semibold tabular-nums">{v}</p></div>)}
    </div>
    {lista.length === 0 ? <p className="py-8 text-center text-muted-foreground">Nenhuma conta neste período.</p> :
      <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Vencimento</TableHead><TableHead>Descrição</TableHead><TableHead>Categoria</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Situação</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>
        {lista.map((c) => { const st = statusConta(c, hoje); return <TableRow key={c.id}>
          <TableCell className="whitespace-nowrap">{formatData(c.vencimento)}</TableCell>
          <TableCell className="font-medium">{c.descricao}{c.parcela && <span className="block text-xs text-muted-foreground">{c.parcela}/{c.total_parcelas} recorrente</span>}{c.situacao === 'paga' && <span className="block text-xs text-muted-foreground">Pago em {formatData(c.data_pagamento ?? "")} · {caixa.contas.find((x) => x.id === c.conta_id)?.nome}</span>}</TableCell>
          <TableCell>{[c.grupo, c.categoria].filter(Boolean).join(' · ') || '—'}</TableCell>
          <TableCell className="text-right tabular-nums">{brl(c.valor_pago ?? c.valor)}</TableCell>
          <TableCell><span className={`whitespace-nowrap rounded px-2 py-1 text-xs font-medium ${ROTULO[st][1]}`}>{ROTULO[st][0]}</span></TableCell>
          <TableCell className="whitespace-nowrap text-right">{c.situacao === 'aberta' ? <>
            <Button size="sm" disabled={busy} onClick={() => setBaixa({ c, data: hoje, valor: String(c.valor.toFixed(2)).replace('.', ','), conta: contaPadrao })}>Dar baixa</Button>
            <Button size="icon" variant="ghost" aria-label="Editar conta" onClick={() => setForm({ id: c.id, descricao: c.descricao, grupo: c.grupo, categoria: c.categoria, valor: c.valor.toFixed(2).replace('.', ','), vencimento: c.vencimento, parcelas: '1', continua: false, observacao: c.observacao ?? '', futuras: !!c.recorrencia_id, recorrente: !!c.recorrencia_id })}><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" aria-label="Excluir conta" onClick={() => void remover(c)}><Trash2 className="h-4 w-4" /></Button></>
            : <Button size="sm" variant="outline" disabled={busy} onClick={() => { if (confirm('Estornar este pagamento? A saída lançada no Financeiro será removida.')) void run(() => estornar({ data: { id: c.id } }), 'Pagamento estornado', true); }}><Undo2 className="mr-1 h-4 w-4" />Estornar</Button>}</TableCell>
        </TableRow>; })}
      </TableBody></Table></div>}

    <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{form?.id ? 'Editar conta a pagar' : 'Nova conta a pagar'}</DialogTitle></DialogHeader>
      {form && <div className="grid gap-3">
        <div><Label htmlFor="cp-desc">Descrição</Label><Input id="cp-desc" placeholder="Ex.: Aluguel, Internet, Contabilidade" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3"><div className="min-w-0"><Label>Grupo</Label><FinanceiroCombobox label="Grupo da conta" value={form.grupo} items={cad.grupos.filter((g) => g.ativo && tipoPermitido(g, 'saida'))} onChange={(v) => setForm({ ...form, grupo: v })} optional /></div><div className="min-w-0"><Label>Categoria</Label><FinanceiroCombobox label="Categoria da conta" value={form.categoria} items={cad.categorias.filter((g) => g.ativo && tipoPermitido(g, 'saida'))} onChange={(v) => setForm({ ...form, categoria: v })} optional /></div></div>
        <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="cp-valor">Valor (R$)</Label><Input id="cp-valor" inputMode="decimal" placeholder="Ex.: 1.250,00" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div><div className="min-w-0"><Label>{form.id ? 'Vencimento' : 'Primeiro vencimento'}</Label><FinanceiroDatePicker label="Vencimento" value={form.vencimento} onChange={(v) => setForm({ ...form, vencimento: v })} /></div></div>
        {!form.id && <div className="space-y-2 rounded-md border p-3"><Label className="flex items-center gap-2"><Checkbox checked={form.continua} onCheckedChange={(v) => setForm({ ...form, continua: !!v })} />Recorrente todo mês (agenda os próximos 12 meses)</Label>{!form.continua && <div><Label htmlFor="cp-parc">Quantidade de meses (1 = conta avulsa)</Label><Input id="cp-parc" type="number" min={1} max={60} value={form.parcelas} onChange={(e) => setForm({ ...form, parcelas: e.target.value })} /></div>}<p className="text-xs text-muted-foreground">O vencimento se repete no mesmo dia de cada mês.</p></div>}
        {form.id && form.recorrente && <Label className="flex items-center gap-2"><Checkbox checked={form.futuras} onCheckedChange={(v) => setForm({ ...form, futuras: !!v })} />Aplicar descrição, categoria e valor também aos próximos vencimentos em aberto</Label>}
        <div><Label htmlFor="cp-obs">Observação (opcional)</Label><Input id="cp-obs" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} /></div>
      </div>}
      <DialogFooter><Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button><Button disabled={busy} onClick={() => void salvar()}>{busy ? 'Salvando…' : 'Salvar'}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={!!baixa} onOpenChange={(o) => !o && setBaixa(null)}><DialogContent><DialogHeader><DialogTitle>Dar baixa: {baixa?.c.descricao}</DialogTitle></DialogHeader>
      {baixa && <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">Vencimento {formatData(baixa.c.vencimento)} · {brl(baixa.c.valor)}</p>
        <div className="grid grid-cols-2 gap-3"><div className="min-w-0"><Label>Data do pagamento</Label><FinanceiroDatePicker label="Data do pagamento" value={baixa.data} onChange={(v) => setBaixa({ ...baixa, data: v })} /></div><div><Label htmlFor="cp-pago">Valor pago (R$)</Label><Input id="cp-pago" inputMode="decimal" value={baixa.valor} onChange={(e) => setBaixa({ ...baixa, valor: e.target.value })} /></div></div>
        <div><Label>Conta de saída (de onde sai o dinheiro)</Label><Select value={baixa.conta} onValueChange={(v) => setBaixa({ ...baixa, conta: v })}><SelectTrigger aria-label="Conta de saída"><SelectValue placeholder="Selecione a conta" /></SelectTrigger><SelectContent>{contasAtivas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
      </div>}
      <DialogFooter><Button variant="outline" onClick={() => setBaixa(null)}>Cancelar</Button><Button disabled={busy || !baixa?.conta} onClick={() => void confirmarBaixa()}>{busy ? 'Salvando…' : 'Confirmar pagamento'}</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}

function addMes(ym: string, n: number) { const [y, m] = ym.split('-').map(Number) as [number, number]; const t = y * 12 + m - 1 + n; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`; }
