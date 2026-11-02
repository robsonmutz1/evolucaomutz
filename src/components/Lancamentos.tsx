import { useMemo, useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl, formatMes } from "@/lib/alunos";
import { totalPorTipo, type Lancamento } from "@/lib/lancamentos";
import { excluirLancamento, lancamentosQuery, salvarLancamento } from "@/lib/lancamentos.functions";

type Edit = { id?: string | undefined; mes: string; tipo: Lancamento["tipo"]; grupo: string; categoria: string; valor: string; descricao: string };

export function Lancamentos() {
  const { data } = useSuspenseQuery(lancamentosQuery);
  const qc = useQueryClient();
  const salvar = useServerFn(salvarLancamento);
  const excluir = useServerFn(excluirLancamento);
  const meses = useMemo(() => [...new Set([new Date().toISOString().slice(0, 7), ...data.map((l) => l.mes)])].sort().reverse(), [data]);
  const [mes, setMes] = useState(meses[0] ?? "");
  const [edit, setEdit] = useState<Edit | null>(null);
  const [busy, setBusy] = useState(false);
  const lista = data.filter((l) => l.mes === mes).sort((a, b) => a.tipo.localeCompare(b.tipo) || a.grupo.localeCompare(b.grupo) || b.valor - a.valor);
  const ent = totalPorTipo(data, "entrada", mes), sai = totalPorTipo(data, "saida", mes);
  const categorias = useMemo(() => [...new Set(data.map((l) => l.categoria))].sort(), [data]);
  const grupos = useMemo(() => [...new Set(data.map((l) => l.grupo).filter(Boolean))].sort(), [data]);

  async function onSave() {
    if (!edit) return;
    setBusy(true);
    try {
      await salvar({ data: { id: edit.id, mes: edit.mes, tipo: edit.tipo, grupo: edit.grupo, categoria: edit.categoria, valor: Number(edit.valor.replace(/\./g, "").replace(",", ".")), descricao: edit.descricao || null } });
      await qc.invalidateQueries({ queryKey: ["school", "lancamentos"] });
      toast.success("Lançamento salvo"); setMes(edit.mes); setEdit(null);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function onDelete(l: Lancamento) {
    if (!l.id || !confirm(`Excluir "${l.categoria}" (${brl(l.valor)})?`)) return;
    try { await excluir({ data: { id: l.id } }); await qc.invalidateQueries({ queryKey: ["school", "lancamentos"] }); toast.success("Excluído"); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Label>Mês</Label>
          <Select value={mes} onValueChange={setMes}><SelectTrigger className="w-48" aria-label="Mês dos lançamentos"><SelectValue /></SelectTrigger>
            <SelectContent>{meses.map((m) => <SelectItem key={m} value={m}>{formatMes(m)}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEdit({ mes, tipo: "entrada", grupo: "Entradas operacionais", categoria: "", valor: "", descricao: "" })}><Plus className="mr-1 h-4 w-4" />Nova entrada</Button>
          <Button onClick={() => setEdit({ mes, tipo: "saida", grupo: "", categoria: "", valor: "", descricao: "" })}><Plus className="mr-1 h-4 w-4" />Nova saída</Button>
        </div>
      </div>
      <div className="mb-4 grid gap-4 border-y py-4 sm:grid-cols-3">
        {[["Entradas", brl(ent)], ["Saídas", brl(sai)], ["Saldo", ent === null && sai === null ? brl(null) : brl((ent ?? 0) - (sai ?? 0))]].map(([n, v]) =>
          <div key={n}><p className="text-sm text-muted-foreground">{n}</p><strong className="text-xl tabular-nums">{v}</strong></div>)}
      </div>
      {lista.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum lançamento neste mês.</p> : (
        <div className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Grupo</TableHead><TableHead>Categoria</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="w-24" /></TableRow></TableHeader>
          <TableBody>{lista.map((l) => (
            <TableRow key={l.id}>
              <TableCell className={l.tipo === "entrada" ? "text-success" : "text-destructive"}>{l.tipo === "entrada" ? "Entrada" : "Saída"}</TableCell>
              <TableCell>{l.grupo || "—"}</TableCell><TableCell className="font-medium">{l.categoria}</TableCell><TableCell>{l.descricao || "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{brl(l.valor)}</TableCell>
              <TableCell className="whitespace-nowrap text-right">
                <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setEdit({ id: l.id, mes: l.mes, tipo: l.tipo, grupo: l.grupo, categoria: l.categoria, valor: String(l.valor).replace(".", ","), descricao: l.descricao ?? "" })}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => onDelete(l)}><Trash2 className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>))}
          </TableBody>
        </Table></div>
      )}
      <datalist id="lanc-cats">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
      <datalist id="lanc-grupos">{grupos.map((c) => <option key={c} value={c} />)}</datalist>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Editar lançamento" : edit?.tipo === "entrada" ? "Nova entrada" : "Nova saída"}</DialogTitle></DialogHeader>
          {edit && <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="lmes">Mês</Label><Input id="lmes" type="month" value={edit.mes} onChange={(e) => setEdit({ ...edit, mes: e.target.value })} /></div>
              <div><Label>Tipo</Label><Select value={edit.tipo} onValueChange={(v) => setEdit({ ...edit, tipo: v as Lancamento["tipo"] })}><SelectTrigger aria-label="Tipo"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="entrada">Entrada</SelectItem><SelectItem value="saida">Saída</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label htmlFor="lgrupo">Grupo (ex.: Despesas com pessoal)</Label><Input id="lgrupo" list="lanc-grupos" value={edit.grupo} onChange={(e) => setEdit({ ...edit, grupo: e.target.value })} /></div>
            <div><Label htmlFor="lcat">Categoria (ex.: Energia Elétrica)</Label><Input id="lcat" list="lanc-cats" value={edit.categoria} onChange={(e) => setEdit({ ...edit, categoria: e.target.value })} /></div>
            <div><Label htmlFor="lval">Valor (R$)</Label><Input id="lval" inputMode="decimal" placeholder="Ex.: 1.250,00" value={edit.valor} onChange={(e) => setEdit({ ...edit, valor: e.target.value })} /></div>
            <div><Label htmlFor="ldesc">Descrição (opcional)</Label><Input id="ldesc" value={edit.descricao} onChange={(e) => setEdit({ ...edit, descricao: e.target.value })} /></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button><Button disabled={busy} onClick={onSave}>{busy ? "Salvando…" : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
