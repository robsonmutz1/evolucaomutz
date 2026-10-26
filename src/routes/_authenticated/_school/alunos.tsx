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
type P = { de: string; ate: string };
const vazio: P = { de: "", ate: "" };
const ativo = (p: P) => !!(p.de || p.ate);
const naFaixa = (d: string | undefined | null, p: P) => {
  if (!ativo(p)) return true;
  if (!d) return false;
  const x = d.slice(0, 10);
  return (!p.de || x >= p.de) && (!p.ate || x <= p.ate);
};

function Filtro({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}
function Periodo({ label, v, set }: { label: string; v: P; set: (p: P) => void }) {
  return (
    <Filtro label={label}>
      <div className="flex gap-2">
        <Input type="date" aria-label={`${label} de`} value={v.de} onChange={(e) => set({ ...v, de: e.target.value })} />
        <Input type="date" aria-label={`${label} até`} value={v.ate} onChange={(e) => set({ ...v, ate: e.target.value })} />
      </div>
    </Filtro>
  );
}

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
  const [fTurma, setFTurma] = useState("todos");
  const [vMin, setVMin] = useState("");
  const [vMax, setVMax] = useState("");
  const [pMat, setPMat] = useState<P>(vazio);
  const [pCanc, setPCanc] = useState<P>(vazio);
  const [pConc, setPConc] = useState<P>(vazio);
  const [sort, setSort] = useState<{ col: Col; asc: boolean }>({ col: "nome", asc: true });
  const [editando, setEditando] = useState<Aluno | null>(null);
  const hoje = mesAtualISO();
  const cursos = useMemo(() => [...new Set(alunos.map((a) => a.curso).filter(Boolean))].sort(), [alunos]);
  const turmas = useMemo(() => [...new Set(alunos.map((a) => a.turma).filter(Boolean))].sort(), [alunos]);
  const limpar = () => { setQ(""); setFStatus("todos"); setFCurso("todos"); setFTurma("todos"); setVMin(""); setVMax(""); setPMat(vazio); setPCanc(vazio); setPConc(vazio); };

  const lista = useMemo(() => {
    const t = q.toLowerCase();
    const r = alunos.filter((a) => {
      const v = valorComDesconto(a);
      if (fStatus !== "todos" && a.status !== fStatus) return false;
      if (fCurso !== "todos" && a.curso !== fCurso) return false;
      if (fTurma !== "todos" && a.turma !== fTurma) return false;
      if ((vMin !== "" || vMax !== "") && v == null) return false;
      if (vMin !== "" && v! < Number(vMin)) return false;
      if (vMax !== "" && v! > Number(vMax)) return false;
      if (!naFaixa(a.dataMatricula, pMat)) return false;
      if (ativo(pCanc) && !(a.status === "Cancelado" && naFaixa(a.dataStatus, pCanc))) return false;
      if (ativo(pConc) && !(a.status === "Concluído" && naFaixa(a.dataStatus, pConc))) return false;
      return [a.nome, a.codigo, a.responsavel, a.bairro, a.cidade, a.turma].some((x) => (x ?? "").toLowerCase().includes(t));
    });
    const val = (a: Aluno) => (sort.col === "valor" ? valorComDesconto(a) : a[sort.col]);
    return r.sort((x, y) => {
      const a = val(x), b = val(y);
      const c = typeof a === "number" ? a - Number(b ?? 0) : String(a ?? '').localeCompare(String(b ?? ''), "pt-BR");
      return sort.asc ? c : -c;
    });
  }, [alunos, q, fStatus, fCurso, fTurma, vMin, vMax, pMat, pCanc, pConc, sort]);

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

      <Card className="space-y-3 p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Pesquisar por nome, código, responsável, bairro…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button variant="outline" onClick={limpar}>Limpar filtros</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Filtro label="Status">
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {(["Ativo", "Concluído", "Cancelado"] as const).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Filtro>
          <Filtro label="Curso">
            <Select value={fCurso} onValueChange={setFCurso}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os cursos</SelectItem>
                {cursos.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Filtro>
          <Filtro label="Turma">
            <Select value={fTurma} onValueChange={setFTurma}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as turmas</SelectItem>
                {turmas.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Filtro>
          <Filtro label="Mensalidade (R$)">
            <div className="flex gap-2">
              <Input type="number" placeholder="Mín." value={vMin} onChange={(e) => setVMin(e.target.value)} />
              <Input type="number" placeholder="Máx." value={vMax} onChange={(e) => setVMax(e.target.value)} />
            </div>
          </Filtro>
          <Periodo label="Data de matrícula" v={pMat} set={setPMat} />
          <Periodo label="Data de cancelamento" v={pCanc} set={setPCanc} />
          <Periodo label="Data de conclusão" v={pConc} set={setPConc} />
        </div>
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
