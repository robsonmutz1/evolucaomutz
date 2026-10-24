import { createFileRoute } from "@tanstack/react-router";
import { Receipt, ShoppingBag, Building2, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro da escola · Evolução Mutz" },
      { name: "description", content: "Faturamento, despesas, produtos e patrimônio da escola." },
      { property: "og:title", content: "Financeiro da escola · Evolução Mutz" },
      { property: "og:description", content: "Faturamento, despesas, produtos e patrimônio da escola." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Financeiro,
});

const modulos = [
  { t: "Faturamento geral", d: "Receitas mensais da escola por categoria.", icon: TrendingUp },
  { t: "Despesas", d: "Contas, fornecedores e custos fixos e variáveis.", icon: Receipt },
  { t: "Produtos", d: "Materiais, apostilas e itens vendidos.", icon: ShoppingBag },
  { t: "Patrimônio", d: "Equipamentos, móveis e bens da escola.", icon: Building2 },
];

function Financeiro() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold md:text-4xl">Financeiro da escola</h1>
        <p className="text-muted-foreground">Módulo separado do contrato dos alunos. Preparado para a próxima etapa.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {modulos.map(({ t, d, icon: Icon }) => (
          <Card key={t} className="p-6">
            <Icon className="mb-3 h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">{t}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            <span className="mt-4 inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">Em breve</span>
          </Card>
        ))}
      </div>
    </div>
  );
}
