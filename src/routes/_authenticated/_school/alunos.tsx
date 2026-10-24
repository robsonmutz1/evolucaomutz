import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpDown, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertaBadge } from "@/components/AlertaBadge";
import { useStore } from "@/lib/store";
import {
  alertaConclusao, brl, formatData, formatMes, mesAtualISO, ultimaMensalidade, valorComDesconto,
  type Aluno, type Status,
} from "@/lib/alunos";

export const Route = createFileRoute("/_authenticated/_school/alunos")({
  head: () => ({
    meta: [
      { title: "Alunos · Evolução Mutz" },
      { name: "description", content: "Cadastro de alunos, status e contratos da escola Evolução Mutz." },
      { property: "og:title", content: "Alunos · Evolução Mutz" },
      { property: "og:description", content: "Cadastro de alunos, status e contratos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Alunos,
});

type Col = "codigo" | "nome" | "curso" | "turma" | "dataMatricula" | "status" | "valor";

const statusTone: Record<Status, string> = {
  Ativo: "bg-success text-success-foreground",
  Concluído: "bg-primary text-primary-foreground",
  Cancelado: "bg-muted text-muted-foreground",
};

function Alunos() {
  const { alunos, salvar } = useStore();
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("todos");
  const [fCurso, setFCurso] = useState("todos");
  const [sort, setSort] = useState<{ col: Col; asc: boolean }>({ col: "nome", asc: true });
  const [editando, setEditando] = useState<Aluno | null>(null);
  const hoje = mesAtualISO();
  const cursos = [...new Set(alunos.map((a) => a.curso))].sort();

  const lista = useMemo(() => {
    const t = q.toLowerCase();
    const r = alunos.filter(
      (a) =>
        (fStatus === "todos" || a.status === fStatus) &&
        (fCurso === "todos" || a.curso === fCurso) &&
        [a.nome, a.codigo, a.responsavel, a.bairro, a.cidade, a.turma].some((v) => v.toLowerCase().includes(t)),
    );
    const val = (a: Aluno) => (sort.col === "valor" ? valorComDesconto(a) : a[sort.col]);
    return r.sort((x, y) => {
      const a = val(x), b = val(y);
      const c = typeof a === "number" ? a - Number(b ?? 0) : String(a ?? '').localeCompare(String(b ?? ''), "pt-BR");
      return sort.asc ? c : -c;
    });
  }, [alunos, q, fStatus, fCurso, sort]);

  const novo = (): Aluno => ({
    id: crypto.randomUUID(), codigo: `EM${1001 + alunos.length}`, nome: "", responsavel: "", bairro: "", cidade: "",
    dataMatricula: new Date().toISOString().slice(0, 10), curso: "", turma: "", horario: "", status: "Ativo",
    valorMensal: 0, descontoTipo: "percentual", desconto: 0, diaLimiteDesconto: 5, diaVencimento: 10,
    qtdMensalidades: 12, primeiraCobranca: hoje,
  });

  const Th = ({ col, children }: { col: Col; children: string }) => (
    <th className="px-3 py-3 text-left font-semibold">
      <button className="inline-flex items-center gap-1 hover:text-primary" onClick={() => setSort({ col, asc: sort.col === col ? !sort.asc : true })}>
        {children} <ArrowUpDown className="h-3 w-3 opacity-50" />
      </button>
    </th>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold md:text-4xl">Alunos</h1>
          <p className="text-muted-foreground">{lista.length} de {alunos.length} alunos</p>
        </div>
        <Button onClick={() => setEditando(novo())}><Plus /> Novo aluno</Button>
      </div>

      <Card className="flex flex-col gap-3 p-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Pesquisar por nome, código, responsável, bairro…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger className="md:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {(["Ativo", "Concluído", "Cancelado"] as const).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fCurso} onValueChange={setFCurso}>
          <SelectTrigger className="md:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os cursos</SelectItem>
            {cursos.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b bg-muted/60">
            <tr>
              <Th col="codigo">Código</Th><Th col="nome">Nome</Th><Th col="curso">Curso</Th><Th col="turma">Turma</Th>
              <Th col="dataMatricula">Matrícula</Th><Th col="valor">Mensalidade</Th><Th col="status">Status</Th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {lista.map((a) => (
              <tr key={a.id} className="hover:bg-muted/40">
                <td className="px-3 py-3 font-mono text-xs">{a.codigo}</td>
                <td className="px-3 py-3">
                  <div className="font-medium">{a.nome}</div>
                  <div className="text-xs text-muted-foreground">{a.bairro} · {a.cidade}</div>
                </td>
                <td className="px-3 py-3">{a.curso}</td>
                <td className="px-3 py-3">{a.turma} <span className="text-xs text-muted-foreground">{a.horario}</span></td>
                <td className="px-3 py-3">{formatData(a.dataMatricula)}</td>
                <td className="px-3 py-3">
                  <div className="font-medium">{brl(valorComDesconto(a))}</div>
                  {a.desconto > 0 && <div className="text-xs text-muted-foreground line-through">{brl(a.valorMensal)}</div>}
                </td>
                <td className="space-y-1 px-3 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusTone[a.status]}`}>{a.status}</span>
                  <div><AlertaBadge alerta={alertaConclusao(a, hoje)} /></div>
                </td>
                <td className="px-3 py-3 text-right">
                  <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setEditando(a)}><Pencil /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {editando && (
        <AlunoForm
          aluno={editando}
          onClose={() => setEditando(null)}
          onSave={async (a) => { await salvar(a); setEditando(null); toast.success("Aluno salvo"); }}
        />
      )}
    </div>
  );
}

function AlunoForm({ aluno, onClose, onSave }: { aluno: Aluno; onClose: () => void; onSave: (a: Aluno) => Promise<void> }) {
  const [f, setF] = useState(aluno);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Aluno>(k: K, v: Aluno[K]) => setF((p) => ({ ...p, [k]: v }));
  const txt = (k: keyof Aluno, label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        value={String(f[k] ?? "")}
        onChange={(e) => set(k, (type === "number" ? (k === 'valorMensal' && e.target.value === '' ? null : Number(e.target.value)) : e.target.value) as never)}
      />
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle className="font-display text-2xl">{aluno.nome ? "Editar aluno" : "Novo aluno"}</DialogTitle></DialogHeader>
        <form
          className="space-y-6"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!f.nome.trim() || !f.curso.trim()) { toast.error("Preencha nome e curso"); return; }
            setSaving(true);
            try { await onSave(f); } catch { toast.error('Não foi possível salvar o aluno. Tente novamente.'); }
            finally { setSaving(false); }
          }}
        >
          <section className="grid gap-4 sm:grid-cols-3">
            <h3 className="text-lg font-semibold sm:col-span-3">Dados do aluno</h3>
            {txt("codigo", "Código")}
            <div className="sm:col-span-2">{txt("nome", "Nome")}</div>
            {txt("responsavel", "Responsável")}
            {txt("bairro", "Bairro")}
            {txt("cidade", "Cidade")}
            {txt("dataMatricula", "Data da matrícula", "date")}
            {txt("curso", "Curso")}
            {txt("turma", "Turma")}
            {txt("horario", "Horário")}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => setF((p) => ({ ...p, status: v as Status, dataStatus: v === "Ativo" ? undefined : p.dataStatus ?? new Date().toISOString().slice(0, 10) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["Ativo", "Concluído", "Cancelado"] as const).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {f.status !== "Ativo" && txt("dataStatus", f.status === "Concluído" ? "Data da conclusão" : "Data do cancelamento", "date")}
          </section>

          <section className="grid gap-4 rounded-xl bg-muted/50 p-4 sm:grid-cols-3">
            <h3 className="text-lg font-semibold sm:col-span-3">Contrato financeiro</h3>
            {txt("valorMensal", "Valor mensal cheio (R$)", "number")}
            <div className="space-y-1.5">
              <Label>Tipo de desconto</Label>
              <Select value={f.descontoTipo} onValueChange={(v) => set("descontoTipo", v as Aluno["descontoTipo"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentual">Percentual (%)</SelectItem>
                  <SelectItem value="valor">Valor (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {txt("desconto", f.descontoTipo === "percentual" ? "Desconto (%)" : "Desconto (R$)", "number")}
            {txt("diaLimiteDesconto", "Dia limite do desconto", "number")}
            {txt("diaVencimento", "Dia de vencimento", "number")}
            {txt("qtdMensalidades", "Quantidade de mensalidades", "number")}
            {txt("primeiraCobranca", "Mês da 1ª cobrança", "month")}
            <Resumo label="Valor com desconto" value={brl(valorComDesconto(f))} />
            <Resumo label="Previsão da última mensalidade" value={f.primeiraCobranca && f.qtdMensalidades > 0 ? formatMes(ultimaMensalidade(f.primeiraCobranca, f.qtdMensalidades)) : "—"} />
          </section>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Resumo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-xl font-semibold text-primary">{value}</div>
    </div>
  );
}
