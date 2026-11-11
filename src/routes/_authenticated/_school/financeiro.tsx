import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl, formatData, formatMes } from "@/lib/alunos";
import { totalConhecido, type RegistroFinanceiro, type TipoRegistro } from "@/lib/financeiro";
import {
  excluirFaturamento, excluirRegistro, faturamentoQuery, registrosQuery, salvarFaturamento, salvarRegistro,
} from "@/lib/faturamento.functions";
import { lancamentosQuery } from "@/lib/lancamentos.functions";
import { Lancamentos } from "@/components/Lancamentos";
import { cadastrosFinanceirosQuery } from '@/lib/financeiro-cadastros.functions';
import { controlesQuery } from '@/lib/energia-prestadores.functions';
import { EnergiaControl, PrestadoresControl } from '@/components/EnergiaPrestadores';

export const Route = createFileRoute("/_authenticated/_school/financeiro")({
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
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(controlesQuery), context.queryClient.ensureQueryData(registrosQuery), context.queryClient.ensureQueryData(lancamentosQuery),context.queryClient.ensureQueryData(cadastrosFinanceirosQuery)]),
  component: Financeiro,
});

function Financeiro() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold md:text-4xl">Financeiro da escola</h1>
        <p className="text-muted-foreground">Cadastre e edite faturamento, despesas, produtos e patrimônio.</p>
      </div>
      <Tabs defaultValue="lancamentos">
        <TabsList className="h-auto flex-wrap gap-y-1">
          <TabsTrigger value="lancamentos">Entradas e saídas</TabsTrigger>
          <TabsTrigger value="faturamento">Faturamento</TabsTrigger>
          <TabsTrigger value="despesa">Despesas</TabsTrigger>
          <TabsTrigger value="produto">Produtos</TabsTrigger>
          <TabsTrigger value="patrimonio">Patrimônio</TabsTrigger>
          <TabsTrigger value="energia">Energia</TabsTrigger>
          <TabsTrigger value="prestadores">Prestadores</TabsTrigger>
        </TabsList>
        <TabsContent value="lancamentos"><Lancamentos /></TabsContent>
        <TabsContent value="faturamento"><Faturamento /></TabsContent>
        <TabsContent value="despesa"><Registros tipo="despesa" /></TabsContent>
        <TabsContent value="produto"><Registros tipo="produto" /></TabsContent>
        <TabsContent value="patrimonio"><Registros tipo="patrimonio" /></TabsContent>
        <TabsContent value="energia"><EnergiaControl /></TabsContent>
        <TabsContent value="prestadores"><PrestadoresControl /></TabsContent>
      </Tabs>
    </div>
  );
}

function Faturamento() {
  const { data } = useSuspenseQuery(faturamentoQuery);
  const qc = useQueryClient();
  const salvar = useServerFn(salvarFaturamento);
  const excluir = useServerFn(excluirFaturamento);
  const [edit, setEdit] = useState<{ mes: string; valor: string; anterior?: string | undefined } | null>(null);
  const [busy, setBusy] = useState(false);
  const lista = [...data].sort((a, b) => b.mes.localeCompare(a.mes));

  async function onSave() {
    if (!edit) return;
    const valor = Number(edit.valor.replace(/\./g, "").replace(",", "."));
    if (lista.some((l) => l.mes === edit.mes) && edit.anterior !== edit.mes && !confirm("Esse mês já tem faturamento. Substituir?")) return;
    setBusy(true);
    try {
      await salvar({ data: { mes: edit.mes, valor, anterior: edit.anterior } });
      await qc.invalidateQueries({ queryKey: ["school", "faturamento"] });
      toast.success("Faturamento salvo"); setEdit(null);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function onDelete(mes: string) {
    if (!confirm(`Excluir o faturamento de ${formatMes(mes)}?`)) return;
    try { await excluir({ data: { mes } }); await qc.invalidateQueries({ queryKey: ["school", "faturamento"] }); toast.success("Excluído"); }
    catch (e) { toast.error((e as Error).message); }
  }
  const proximo = () => {
    const ult = lista[0]?.mes; if (!ult) return new Date().toISOString().slice(0, 7);
    const [y = 0, m = 0] = ult.split("-").map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  };

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Faturamento mensal</h2>
        <Button onClick={() => setEdit({ mes: proximo(), valor: "" })}><Plus className="mr-1 h-4 w-4" />Adicionar mês</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Mês</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="w-24" /></TableRow></TableHeader>
        <TableBody>
          {lista.map((f) => (
            <TableRow key={f.mes}>
              <TableCell>{formatMes(f.mes)}</TableCell>
              <TableCell className="text-right">{brl(f.valor)}</TableCell>
              <TableCell className="text-right">
                <Button size="icon" variant="ghost" aria-label={`Editar ${f.mes}`} onClick={() => setEdit({ mes: f.mes, valor: String(f.valor).replace(".", ","), anterior: f.mes })}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label={`Excluir ${f.mes}`} onClick={() => onDelete(f.mes)}><Trash2 className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.anterior ? "Editar faturamento" : "Novo mês de faturamento"}</DialogTitle></DialogHeader>
          {edit && <div className="grid gap-3">
            <div><Label htmlFor="fmes">Mês</Label><Input id="fmes" type="month" value={edit.mes} onChange={(e) => setEdit({ ...edit, mes: e.target.value })} /></div>
            <div><Label htmlFor="fval">Valor (R$)</Label><Input id="fval" inputMode="decimal" placeholder="Ex.: 42.500,00" value={edit.valor} onChange={(e) => setEdit({ ...edit, valor: e.target.value })} /></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button><Button disabled={busy} onClick={onSave}>{busy ? "Salvando…" : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

const textos: Record<TipoRegistro, { titulo: string; novo: string; cat: string; data: string }> = {
  despesa: { titulo: "Despesas", novo: "Nova despesa", cat: "Categoria (ex.: energia, aluguel, salários)", data: "Data" },
  produto: { titulo: "Produtos", novo: "Novo produto", cat: "Categoria (ex.: apostila, material)", data: "Data de cadastro" },
  patrimonio: { titulo: "Patrimônio", novo: "Novo bem", cat: "Categoria (ex.: computador, móvel)", data: "Data de aquisição" },
};

const vazio = (tipo: TipoRegistro) => ({ tipo, descricao: "", categoria: "", data: "", valor: "", quantidade: tipo === "despesa" ? "" : "1", observacoes: "" });
const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(/\./g, "").replace(",", ".")));

function Registros({ tipo }: { tipo: TipoRegistro }) {
  const { data } = useSuspenseQuery(registrosQuery);
  const qc = useQueryClient();
  const salvar = useServerFn(salvarRegistro);
  const excluir = useServerFn(excluirRegistro);
  const t = textos[tipo];
  const lista = data.filter((r) => r.tipo === tipo);
  const total = totalConhecido(lista);
  const [edit, setEdit] = useState<(ReturnType<typeof vazio> & { id?: string | undefined }) | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSave() {
    if (!edit) return;
    const reg: RegistroFinanceiro = {
      id: edit.id, tipo, descricao: edit.descricao, categoria: edit.categoria, data: edit.data || null,
      valor: num(edit.valor), quantidade: tipo === "despesa" ? null : num(edit.quantidade), observacoes: edit.observacoes || null,
    };
    setBusy(true);
    try { await salvar({ data: reg }); await qc.invalidateQueries({ queryKey: ["school", "financeiro"] }); toast.success("Salvo"); setEdit(null); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function onDelete(r: RegistroFinanceiro) {
    if (!r.id || !confirm(`Excluir "${r.descricao}"?`)) return;
    try { await excluir({ data: { id: r.id } }); await qc.invalidateQueries({ queryKey: ["school", "financeiro"] }); toast.success("Excluído"); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">{t.titulo}</h2>
          <p className="text-sm text-muted-foreground">Total: {brl(total)} · {lista.length} registro(s)</p>
        </div>
        <Button onClick={() => setEdit(vazio(tipo))}><Plus className="mr-1 h-4 w-4" />{t.novo}</Button>
      </div>
      {lista.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p> : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Descrição</TableHead><TableHead>Categoria</TableHead><TableHead>{t.data}</TableHead>
              {tipo !== "despesa" && <TableHead className="text-right">Qtd.</TableHead>}
              <TableHead className="text-right">{tipo === "despesa" ? "Valor" : "Valor unitário"}</TableHead><TableHead className="w-24" />
            </TableRow></TableHeader>
            <TableBody>
              {lista.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.descricao}</TableCell>
                  <TableCell>{r.categoria || "—"}</TableCell>
                  <TableCell>{r.data ? formatData(r.data) : "Não informado"}</TableCell>
                  {tipo !== "despesa" && <TableCell className="text-right">{r.quantidade ?? "—"}</TableCell>}
                  <TableCell className="text-right">{brl(r.valor)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setEdit({ id: r.id, tipo, descricao: r.descricao, categoria: r.categoria, data: r.data ?? "", valor: r.valor === null ? "" : String(r.valor).replace(".", ","), quantidade: r.quantidade === null ? "" : String(r.quantidade), observacoes: r.observacoes ?? "" })}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => onDelete(r)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Editar" : t.novo}</DialogTitle></DialogHeader>
          {edit && <div className="grid gap-3">
            <div><Label htmlFor="rdesc">Descrição</Label><Input id="rdesc" value={edit.descricao} onChange={(e) => setEdit({ ...edit, descricao: e.target.value })} /></div>
            <div><Label htmlFor="rcat">{t.cat}</Label><Input id="rcat" value={edit.categoria} onChange={(e) => setEdit({ ...edit, categoria: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="rdata">{t.data}</Label><Input id="rdata" type="date" value={edit.data} onChange={(e) => setEdit({ ...edit, data: e.target.value })} /></div>
              <div><Label htmlFor="rval">{tipo === "despesa" ? "Valor (R$)" : "Valor unitário (R$)"}</Label><Input id="rval" inputMode="decimal" value={edit.valor} onChange={(e) => setEdit({ ...edit, valor: e.target.value })} /></div>
            </div>
            {tipo !== "despesa" && <div><Label htmlFor="rqtd">Quantidade</Label><Input id="rqtd" inputMode="numeric" value={edit.quantidade} onChange={(e) => setEdit({ ...edit, quantidade: e.target.value })} /></div>}
            <div><Label htmlFor="robs">Observações</Label><Input id="robs" value={edit.observacoes} onChange={(e) => setEdit({ ...edit, observacoes: e.target.value })} /></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button><Button disabled={busy} onClick={onSave}>{busy ? "Salvando…" : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
