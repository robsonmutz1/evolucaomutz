import { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { brl, formatMes, mesAtualISO } from '@/lib/alunos';
import { horizontes, projetarFaturamento, type ReceitaMensal } from '@/lib/relatorios';

export function ProjecaoFaturamento({ receitas }: { receitas: ReceitaMensal[] }) {
  const [prazo, setPrazo] = useState('12');
  const mesAtual = mesAtualISO();
  const projecao = useMemo(() => projetarFaturamento(receitas, mesAtual), [receitas, mesAtual]);
  return <section className="space-y-4 border-t pt-6" aria-labelledby="projecao-titulo">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="projecao-titulo" className="flex items-center gap-2 text-xl font-semibold"><TrendingUp className="h-5 w-5 text-primary" />Previsão de faturamento</h2>
      {projecao && <Select value={prazo} onValueChange={setPrazo}>
        <SelectTrigger aria-label="Prazo da previsão" className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>{horizontes.map((h) => <SelectItem key={h} value={String(h)}>{h} {h === 1 ? 'mês' : 'meses'}</SelectItem>)}</SelectContent>
      </Select>}
    </div>
    {!projecao ? <p className="text-sm text-muted-foreground">Histórico insuficiente: são necessários pelo menos 3 meses de faturamento registrados, anteriores ao mês atual.</p> : <>
      <p className="text-sm text-muted-foreground">Estimativa pela média de {projecao.base.length} meses registrados, de {formatMes(projecao.base[0]?.mes ?? '')} a {formatMes(projecao.base.at(-1)?.mes ?? '')}: {brl(projecao.media)} por mês. Meses sem registro e o mês atual não entram na média. Não representa receita garantida.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {projecao.totais.map((p) => <Card key={p.meses} className="gap-2 p-4">
          <span className="text-sm text-muted-foreground">Próximo{p.meses > 1 ? 's' : ''} {p.meses} {p.meses === 1 ? 'mês' : 'meses'}</span>
          <strong className="break-words text-lg tabular-nums text-primary">{brl(p.valor)}</strong>
          <span className="text-xs text-muted-foreground">Total estimado</span>
        </Card>)}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm"><thead className="border-b"><tr><th className="py-3 text-left">Mês futuro</th><th className="py-3 text-right">Faturamento estimado</th></tr></thead>
          <tbody className="divide-y">{projecao.mensal.slice(0, Number(prazo)).map((m) => <tr key={m.mes}><td className="py-2">{formatMes(m.mes)}</td><td className="py-2 text-right tabular-nums">{brl(m.valor)}</td></tr>)}</tbody>
        </table>
      </div>
    </>}
  </section>;
}