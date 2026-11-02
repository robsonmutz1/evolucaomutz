import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Download, Printer, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStore } from '@/lib/store';
import { faturamentoQuery } from '@/lib/faturamento.functions';
import { alunosDoRelatorio, gerarCsv, type TipoRelatorio } from '@/lib/relatorios';
import { brl, formatData, formatMes, valorComDesconto } from '@/lib/alunos';

export const Route = createFileRoute('/_authenticated/_school/relatorios')({
  head: () => ({ meta: [
    { title: 'Relatórios · Evolução Mutz' },
    { name: 'description', content: 'Relatórios restritos de faturamento, matrículas, alunos ativos, cancelamentos e formados da Evolução Mutz.' },
    { property: 'og:title', content: 'Relatórios · Evolução Mutz' },
    { property: 'og:description', content: 'Relatórios financeiros e escolares da Evolução Mutz por período.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }), component: Relatorios,
});

const tipos: { valor: TipoRelatorio; nome: string }[] = [
  { valor: 'financeiro', nome: 'Financeiro · entradas e saídas' }, { valor: 'matriculas', nome: 'Matrículas' },
  { valor: 'ativos', nome: 'Alunos ativos' }, { valor: 'cancelamentos', nome: 'Cancelamentos' }, { valor: 'formados', nome: 'Formados' },
];

function Relatorios() {
  const { alunos } = useStore();
  const { data: receitas } = useSuspenseQuery(faturamentoQuery);
  const { data: lancs } = useSuspenseQuery(lancamentosQuery);
  const [tipo, setTipo] = useState<TipoRelatorio>('financeiro');
  const [de, setDe] = useState(`${new Date().getFullYear()}-01-01`);
  const [ate, setAte] = useState(`${new Date().getFullYear()}-12-31`);
  const [curso, setCurso] = useState('todos');
  const [turma, setTurma] = useState('todos');
  const invalido = !!de && !!ate && de > ate;
  const cursos = useMemo(() => [...new Set(alunos.map((a) => a.curso).filter(Boolean))].sort(), [alunos]);
  const turmas = useMemo(() => [...new Set(alunos.filter((a) => curso === 'todos' || a.curso === curso).map((a) => a.turma).filter(Boolean))].sort(), [alunos, curso]);
  const selecao = useMemo(() => alunosDoRelatorio(alunos, tipo, de, ate, curso, turma), [alunos, tipo, de, ate, curso, turma]);
  const financeiro = receitas.filter((r) => (!de || r.mes >= de.slice(0, 7)) && (!ate || r.mes <= ate.slice(0, 7)));
  const total = financeiro.length ? financeiro.reduce((s, r) => s + r.valor, 0) : null;
  const saidaMes = (m: string) => totalPorTipo(lancs, 'saida', m);
  const saidas = financeiro.some((r) => saidaMes(r.mes) !== null) ? financeiro.reduce((s, r) => s + (saidaMes(r.mes) ?? 0), 0) : null;
  const saldoDe = (e: number | null, s: number | null) => (e === null || s === null ? null : Math.round((e - s) * 100) / 100);
  const evento = tipo === 'cancelamentos' || tipo === 'formados';
  const titulo = tipos.find((t) => t.valor === tipo)?.nome ?? '';
  const cabecalho = tipo === 'financeiro' ? ['Mês', 'Entradas (R$)', 'Saídas (R$)', 'Saldo (R$)'] : ['Código', 'Aluno', 'Curso', 'Turma', evento ? 'Data do evento' : 'Matrícula', 'Status atual', 'Mensalidade contratual (R$)'];
  const linhas: (string | number | null)[][] = tipo === 'financeiro'
    ? financeiro.map((r) => [formatMes(r.mes), r.valor, saidaMes(r.mes), saldoDe(r.valor, saidaMes(r.mes))])
    : selecao.alunos.map((a) => [a.codigo, a.nome, a.curso, a.turma, (evento ? a.dataStatus : a.dataMatricula) ? formatData((evento ? a.dataStatus : a.dataMatricula) ?? '') : null, a.status, valorComDesconto(a)]);
  function exportar() {
    const conteudo = gerarCsv([[titulo], ['Período', de, ate], [tipo === 'financeiro' ? 'Faturamento agregado mensal; saídas e saldo não disponíveis.' : 'Status atual; mensalidade contratual não equivale a pagamento recebido.'], [], cabecalho, ...linhas]);
    const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = `relatorio-${tipo}-${de || 'inicio'}-${ate || 'fim'}.csv`; link.click(); URL.revokeObjectURL(url);
  }
  return <div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="flex items-center gap-3 text-3xl font-semibold md:text-4xl"><FileText className="h-7 w-7 text-primary" />Relatórios</h1>
      <div className="flex gap-2 print:hidden"><Button variant="outline" disabled={invalido || linhas.length === 0} onClick={exportar}><Download />Exportar CSV</Button><Button variant="outline" disabled={invalido} onClick={() => window.print()}><Printer />Imprimir</Button></div>
    </header>
    <div className="grid gap-4 border-y py-4 sm:grid-cols-2 lg:grid-cols-3 print:hidden">
      <div className="space-y-2"><Label>Relatório</Label><Select value={tipo} onValueChange={(v) => setTipo(v as TipoRelatorio)}><SelectTrigger aria-label="Tipo de relatório"><SelectValue /></SelectTrigger><SelectContent>{tipos.map((t) => <SelectItem key={t.valor} value={t.valor}>{t.nome}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor="rel-de">De</Label><Input id="rel-de" type="date" value={de} onChange={(e) => setDe(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="rel-ate">Até</Label><Input id="rel-ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
      {tipo !== 'financeiro' && <>
        <div className="space-y-2"><Label>Curso</Label><Select value={curso} onValueChange={(v) => { setCurso(v); setTurma('todos'); }}><SelectTrigger aria-label="Curso do relatório"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os cursos</SelectItem>{cursos.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Turma</Label><Select value={turma} onValueChange={setTurma}><SelectTrigger aria-label="Turma do relatório"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todas as turmas</SelectItem>{turmas.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
      </>}
    </div>
    {invalido ? <p role="alert" className="text-destructive">A data inicial deve ser anterior ou igual à data final.</p> : <section className="space-y-4">
      <h2 className="text-xl font-semibold">{titulo}</h2>
      <p className="text-sm text-muted-foreground">{de ? formatData(de) : 'Início do histórico'} — {ate ? formatData(ate) : 'Fim do histórico'}</p>
      {tipo === 'financeiro' ? <>
        <div className="grid gap-4 border-y py-4 sm:grid-cols-3">{[['Entradas registradas', brl(total)], ['Saídas', brl(saidas)], ['Saldo', brl(saldoDe(total, saidas))]].map(([nome, v]) => <div key={nome}><p className="text-sm text-muted-foreground">{nome}</p><strong className="text-xl tabular-nums">{v}</strong></div>)}</div>
        <p className="text-sm text-muted-foreground">Faturamento e saídas agregados por mês; os meses inicial e final são considerados inteiros. Meses sem saídas lançadas aparecem como "Não informado".</p>
      </> : <>
        <p className="font-semibold">{selecao.alunos.length} alunos no período</p>
        {tipo === 'ativos' && <p className="text-sm text-muted-foreground">Alunos com status ativo atualmente e matrícula no período; não representa o total de ativos em uma data passada.</p>}
        {selecao.semData > 0 && <p role="status" className="text-sm text-warning">{selecao.semData} registros sem {evento ? 'data do evento' : 'data de matrícula'} não entram no período.</p>}
      </>}
      <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead className="border-b bg-muted/50"><tr>{cabecalho.map((c) => <th key={c} className="px-3 py-3 text-left">{c}</th>)}</tr></thead>
        <tbody className="divide-y">{linhas.length === 0 ? <tr><td colSpan={cabecalho.length} className="py-8 text-center text-muted-foreground">Nenhum registro no período selecionado.</td></tr> : linhas.map((linha, i) => <tr key={i}>{linha.map((v, j) => <td key={j} className="px-3 py-3">{v === null ? 'Não informado' : typeof v === 'number' ? brl(v) : v}</td>)}</tr>)}</tbody>
      </table></div>
    </section>}
  </div>;
}