import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Users, UserPlus, UserX, Award, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { AlertaBadge } from "@/components/AlertaBadge";
import { alertaConclusao, brl, mesAtualISO } from "@/lib/alunos";
import { faturamentoQuery } from "@/lib/faturamento.functions";

const chartConfig = {
  faturamento: { label: "Faturamento", color: "var(--primary)" },
  matriculas: { label: "Matrículas", color: "var(--accent)" },
} satisfies ChartConfig;

export const Route = createFileRoute("/_authenticated/_school/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel · Evolução Mutz" },
      { name: "description", content: "Indicadores de alunos e finanças da escola Evolução Mutz." },
      { property: "og:title", content: "Painel · Evolução Mutz" },
      { property: "og:description", content: "Indicadores de alunos e finanças da escola Evolução Mutz." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Painel,
});

const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function Painel() {
  const { alunos } = useStore();
  const { data: faturamento } = useSuspenseQuery(faturamentoQuery);
  const [ano, setAno] = useState("2026");
  const [mes, setMes] = useState("todos");
  const prefixo = mes === "todos" ? ano : `${ano}-${mes}`;
  const hoje = mesAtualISO();
  const anos = useMemo(() => {
    const s = new Set<string>(faturamento.map((f) => f.mes.slice(0, 4)));
    alunos.forEach((a) => a.dataMatricula && s.add(a.dataMatricula.slice(0, 4)));
    return [...s].filter((y) => /^\d{4}$/.test(y)).sort().reverse();
  }, [faturamento, alunos]);

  const k = useMemo(() => {
    const noPeriodo = (d?: string | null) => !!d && d.startsWith(prefixo);
    const fats = faturamento.filter((f) => f.mes.startsWith(prefixo));
    return {
      ativos: alunos.filter((a) => a.status === "Ativo").length,
      novas: alunos.filter((a) => noPeriodo(a.dataMatricula)).length,
      canc: alunos.filter((a) => a.status === "Cancelado" && noPeriodo(a.dataStatus)).length,
      concl: alunos.filter((a) => a.status === "Concluído" && noPeriodo(a.dataStatus)).length,
      fat: fats.length ? fats.reduce((s, f) => s + f.valor, 0) : null,
      desp: null,
      alertas: alunos.filter((a) => alertaConclusao(a, hoje)),
    };
  }, [alunos, faturamento, prefixo, hoje]);

  const serie = useMemo(() => meses.map((m, i) => {
    const mm = `${ano}-${String(i + 1).padStart(2, "0")}`;
    return {
      mes: m,
      faturamento: faturamento.find((f) => f.mes === mm)?.valor ?? null,
      matriculas: alunos.filter((a) => a.dataMatricula?.startsWith(mm)).length,
    };
  }), [ano, faturamento, alunos]);

  const cards = [
    { label: "Alunos ativos", value: k.ativos, icon: Users, tone: "bg-primary text-primary-foreground" },
    { label: "Novas matrículas", value: k.novas, icon: UserPlus, tone: "bg-secondary text-secondary-foreground" },
    { label: "Cancelamentos", value: k.canc, icon: UserX, tone: "bg-secondary text-secondary-foreground" },
    { label: "Conclusões", value: k.concl, icon: Award, tone: "bg-secondary text-secondary-foreground" },
    { label: "Faturamento", value: brl(k.fat), icon: TrendingUp, tone: "bg-accent text-accent-foreground" },
    { label: "Despesas", value: brl(k.desp), icon: TrendingDown, tone: "bg-secondary text-secondary-foreground" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold md:text-4xl">Painel principal</h1>
          <p className="text-muted-foreground">Visão geral do período selecionado</p>
        </div>
        <div className="flex gap-2">
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="w-36 bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Ano inteiro</SelectItem>
              {meses.map((m, i) => (
                <SelectItem key={m} value={String(i + 1).padStart(2, "0")}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ano} onValueChange={setAno}>
            <SelectTrigger className="w-28 bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["2025", "2026"].map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className={`border-0 p-5 shadow-sm ${tone}`}>
            <Icon className="mb-3 h-5 w-5 opacity-80" />
            <div className="font-display text-2xl font-semibold md:text-3xl">{value}</div>
            <div className="text-sm opacity-80">{label}</div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <h2 className="text-xl font-semibold">Alertas de conclusão</h2>
        </div>
        {k.alertas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum aluno para verificar neste mês.</p>
        ) : (
          <ul className="divide-y">
            {k.alertas.map((a) => {
              const al = alertaConclusao(a, hoje);
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <span><strong>{a.nome}</strong> · {a.curso}</span>
                  <AlertaBadge alerta={al} />
                </li>
              );
            })}
          </ul>
        )}
        <Link to="/alunos" className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline">
          Ver cadastro de alunos →
        </Link>
      </Card>
    </div>
  );
}
