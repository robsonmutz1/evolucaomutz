import { useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Check, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { caixaQuery } from '@/lib/caixa.functions';
import { brl, formatData, formatMes } from '@/lib/alunos';
import { hojeFinanceiro } from '@/lib/financeiro-cadastros';
import { ESCOLA, PASSAGEM_PADRAO, formatCpf, mesSeguinte, porExtenso, totalPagamento } from '@/lib/recibo';
import type { Pagamento, Prestador } from '@/lib/energia-prestadores';

const num = (v: string) => { const n = Number(v.replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function imprimirRecibo(p: Prestador, pg: Pagamento, horas: number, target?: Window | null) {
  const extras = (Array.isArray(pg.extras) ? pg.extras : []) as { descricao: string; valor: number }[];
  const aulas = pg.valor_aulas ?? pg.valor;
  const linhas = [`<tr><td>Aulas ministradas em ${formatMes(pg.mes)} (${horas.toLocaleString('pt-BR')} h)</td><td>${brl(aulas)}</td></tr>`];
  if (pg.passagens_qtd > 0) linhas.push(`<tr><td>Passagens de ônibus de ${formatMes(mesSeguinte(pg.mes))} (${pg.passagens_qtd} × ${brl(pg.passagem_valor)})</td><td>${brl(Math.round(pg.passagens_qtd * pg.passagem_valor * 100) / 100)}</td></tr>`);
  for (const e of extras) linhas.push(`<tr><td>${esc(e.descricao)}</td><td>${brl(e.valor)}</td></tr>`);
  const w = target ?? window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Recibo ${esc(p.nome)} ${pg.mes}</title><style>
body{font-family:Arial,sans-serif;color:#111;max-width:760px;margin:32px auto;padding:0 24px;font-size:14px}h1{text-align:center;font-size:22px;letter-spacing:2px;margin:8px 0 24px}
.box{border:1px solid #333;padding:10px 14px;margin-bottom:14px}.box small{display:block;color:#555;font-size:11px;text-transform:uppercase}table{width:100%;border-collapse:collapse;margin:12px 0}td{border:1px solid #333;padding:8px}td:last-child{text-align:right;white-space:nowrap;width:130px}
tfoot td{font-weight:bold}.sign{display:flex;gap:40px;margin-top:70px}.sign div{flex:1;border-top:1px solid #111;text-align:center;padding-top:6px;font-size:12px}@media print{button{display:none}}</style></head><body>
<h1>RECIBO DE PAGAMENTO</h1>
<div class="box"><small>Contratante</small><strong>${ESCOLA.nome}</strong> · CNPJ ${ESCOLA.cnpj}<br>${ESCOLA.endereco} · CEP ${ESCOLA.cep} · ${ESCOLA.cidade}</div>
<div class="box"><small>Prestador de serviço</small><strong>${esc(p.nome)}</strong> · CPF ${esc(formatCpf(p.cpf)) || '________________'}</div>
<p>Recebi de <strong>${ESCOLA.nome}</strong> a importância de <strong>${brl(pg.valor)}</strong> (${porExtenso(pg.valor)}), referente a:</p>
<table><tbody>${linhas.join('')}</tbody><tfoot><tr><td>Total</td><td>${brl(pg.valor)}</td></tr></tfoot></table>
<p>Pelo que dou plena e geral quitação dos valores acima discriminados.</p>
<p style="text-align:right">${ESCOLA.cidade.split('/')[0]}, ${formatData(pg.data_pagamento)}</p>
<div class="sign"><div>${esc(p.nome)}<br>Prestador</div><div>${ESCOLA.nome}<br>Contratante</div></div>
<p style="text-align:center;margin-top:30px"><button onclick="window.print()">Imprimir / Salvar PDF</button></p></body></html>`);
  w.document.close();
}

export function PagamentoPrestadorForm({ prestador, mes, aulas, busy, onSubmit }: { prestador: Prestador; mes: string; aulas: number; busy: boolean; onSubmit: (d: { data: string; conta_id: string; passagens: number; passagem_valor: number; extras: { descricao: string; valor: number }[] }) => void }) {
  const { data: caixa } = useSuspenseQuery(caixaQuery);
  const contas = caixa.contas.filter(c => c.ativa);
  const [data, setData] = useState(hojeFinanceiro());
  const [conta, setConta] = useState(contas.find(c => c.nome === 'Principal')?.id ?? contas[0]?.id ?? '');
  const [qtd, setQtd] = useState('0'), [valorP, setValorP] = useState(String(PASSAGEM_PADRAO).replace('.', ','));
  const [extras, setExtras] = useState<{ descricao: string; valor: string }[]>([]);
  const ex = extras.map(e => ({ descricao: e.descricao, valor: num(e.valor) }));
  const passagens = Math.max(0, Math.floor(num(qtd))), vp = num(valorP);
  const total = totalPagamento(aulas, passagens, vp, ex);
  return <form className="grid max-h-[75vh] gap-4 overflow-y-auto pr-1" onSubmit={e => { e.preventDefault(); onSubmit({ data, conta_id: conta, passagens, passagem_valor: vp, extras: ex }); }}>
    <p>{prestador.nome} · {formatMes(mes)}</p>
    <div className="flex justify-between border-b pb-2"><span>Aulas de {formatMes(mes)}</span><strong>{brl(aulas)}</strong></div>
    <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label htmlFor="pg-qtd">Passagens ({formatMes(mesSeguinte(mes))})</Label><Input id="pg-qtd" type="number" min={0} step={1} value={qtd} onChange={e => setQtd(e.target.value)} /></div><div className="space-y-1"><Label htmlFor="pg-vp">Valor da passagem (R$)</Label><Input id="pg-vp" inputMode="decimal" value={valorP} onChange={e => setValorP(e.target.value)} /></div></div>
    <div className="space-y-2"><div className="flex items-center justify-between"><Label>Outros valores / bonificação</Label><Button type="button" size="sm" variant="outline" onClick={() => setExtras([...extras, { descricao: 'Bonificação', valor: '' }])}><Plus className="mr-1 h-4 w-4" />Adicionar</Button></div>
      {extras.map((e, i) => <div key={i} className="grid grid-cols-[minmax(0,1fr)_7rem_auto] gap-2"><Input aria-label="Descrição do valor extra" value={e.descricao} onChange={v => setExtras(extras.map((x, j) => j === i ? { ...x, descricao: v.target.value } : x))} /><Input aria-label="Valor extra" inputMode="decimal" placeholder="0,00" value={e.valor} onChange={v => setExtras(extras.map((x, j) => j === i ? { ...x, valor: v.target.value } : x))} /><Button type="button" size="icon" variant="ghost" aria-label="Remover valor extra" onClick={() => setExtras(extras.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button></div>)}
    </div>
    <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label htmlFor="pg-data">Data do pagamento</Label><Input id="pg-data" type="date" required value={data} onChange={e => setData(e.target.value)} /></div><div className="space-y-1"><Label>Conta de saída</Label><Select value={conta} onValueChange={setConta}><SelectTrigger aria-label="Conta de saída"><SelectValue placeholder="Escolher conta" /></SelectTrigger><SelectContent ordenar>{contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div></div>
    <div className="flex items-baseline justify-between border-t pt-3"><span className="text-muted-foreground">Total</span><strong className="text-2xl">{brl(total)}</strong></div>
    <Button type="submit" disabled={busy || !conta}><Check className="mr-2 h-4 w-4" />Confirmar pago, lançar saída e gerar recibo</Button>
  </form>;
}
