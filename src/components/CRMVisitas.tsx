import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { relatorioVisitas, visitaStatus, type Lead } from '@/lib/crm';

/** Visit outcomes report: who came, rescheduled or stopped answering. */
export function CRMVisitas({ leads, onOpen }: { leads: Lead[]; onOpen: (l: Lead) => void }) {
  const [de, setDe] = useState(''); const [ate, setAte] = useState('');
  const r = relatorioVisitas(leads, de, ate);
  return <section className="space-y-4" aria-label="Relatório de visitas">
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1"><Label htmlFor="vis-de" className="text-xs">Visitas a partir de</Label><Input id="vis-de" type="date" value={de} onChange={e => setDe(e.target.value)} /></div>
      <div className="space-y-1"><Label htmlFor="vis-ate" className="text-xs">Visitas até</Label><Input id="vis-ate" type="date" value={ate} onChange={e => setAte(e.target.value)} /></div>
      <p className="text-sm text-muted-foreground">{r.total} visita(s) marcada(s) · {r.comReagendamento} com reagendamento ({r.pctReagendamento.toLocaleString('pt-BR')}%)</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{r.itens.map(i => <div key={i.status} className="rounded-lg border bg-card p-4">
      <div className="text-sm text-muted-foreground">{i.label}</div>
      <div className="text-3xl font-semibold text-primary">{i.pct.toLocaleString('pt-BR')}%</div>
      <div className="text-xs text-muted-foreground">{i.qtd} lead(s)</div>
      <div className="mt-2 h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${i.pct}%` }} /></div>
    </div>)}</div>
    <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[700px] text-sm"><thead className="border-b bg-muted/50"><tr>{['Responsável / Aluno', 'Visita', 'Resultado', 'Reagendamentos', 'Origem'].map(h => <th key={h} className="p-3 text-left font-semibold">{h}</th>)}</tr></thead>
      <tbody className="divide-y">{[...r.rows].sort((a, b) => (b.data_visita ?? '').localeCompare(a.data_visita ?? '')).map(l => <tr key={l.id}>
        <td className="p-3"><Button variant="ghost" className="h-auto px-0" onClick={() => onOpen(l)}>{l.nome_responsavel}</Button><p className="text-xs text-muted-foreground">{l.nome_aluno}</p></td>
        <td className="p-3">{l.data_visita ? new Date(l.data_visita).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
        <td className="p-3">{visitaStatus[(l.visita_status ?? 'agendada') as keyof typeof visitaStatus]}</td>
        <td className="p-3">{l.visita_reagendamentos}</td><td className="p-3">{l.origem}</td>
      </tr>)}</tbody></table>{r.total === 0 && <p className="p-8 text-center text-muted-foreground">Nenhuma visita marcada no período</p>}</div>
  </section>;
}
