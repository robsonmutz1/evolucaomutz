import { useMemo, useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Trash2, Settings, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl, formatMes } from "@/lib/alunos";
import { totalPorTipo, type Lancamento } from "@/lib/lancamentos";
import { excluirLancamento, lancamentosQuery, salvarLancamento } from "@/lib/lancamentos.functions";
import { cadastrosFinanceirosQuery, salvarCadastroFinanceiro } from '@/lib/financeiro-cadastros.functions';
import { hojeFinanceiro, nomeChave, tipoPermitido, type ItemFinanceiro } from '@/lib/financeiro-cadastros';
import { FinanceiroCombobox } from './FinanceiroCombobox';
import { FinanceiroDatePicker } from './FinanceiroDatePicker';
import { FinanceiroCadastrosManager } from './FinanceiroCadastrosManager';

type Edit = { id?: string | undefined; mes: string; data_lancamento:string; tipo: Lancamento["tipo"]; grupo: string; categoria: string; valor: string; descricao: string };

export function Lancamentos() {
  const { data } = useSuspenseQuery(lancamentosQuery);
  const {data:cadastros}=useSuspenseQuery(cadastrosFinanceirosQuery);
  const qc = useQueryClient();
  const salvar = useServerFn(salvarLancamento);
  const excluir = useServerFn(excluirLancamento);
  const meses = useMemo(() => [...new Set([hojeFinanceiro().slice(0, 7), ...data.map((l) => l.mes)])].sort().reverse(), [data]);
  const [mes, setMes] = useState(data[0]?.mes ?? meses[0] ?? "");
  const [edit, setEdit] = useState<Edit | null>(null);
  const [busy, setBusy] = useState(false);
  const [de,setDe]=useState(''),[ate,setAte]=useState(''),[fGrupo,setFGrupo]=useState(''),[fCategoria,setFCategoria]=useState(''),[asc,setAsc]=useState(false),[manager,setManager]=useState(false);
  const saveItem=useServerFn(salvarCadastroFinanceiro);
  const lista = data.filter((l) => (mes==='todos'||l.mes===mes)&&(!de||(l.data_lancamento??`${l.mes}-01`)>=de)&&(!ate||(l.data_lancamento??`${l.mes}-01`)<=ate)&&(!fGrupo||nomeChave(l.grupo)===nomeChave(fGrupo))&&(!fCategoria||nomeChave(l.categoria)===nomeChave(fCategoria))).sort((a,b)=>((a.data_lancamento??`${a.mes}-01`).localeCompare(b.data_lancamento??`${b.mes}-01`))*(asc?1:-1));
  const ent = totalPorTipo(lista, "entrada", ''), sai = totalPorTipo(lista, "saida", '');
  function options(kind:'grupo'|'categoria',tipo?:Lancamento['tipo'],selected=''){
   const rows=kind==='grupo'?cadastros.grupos:cadastros.categorias;
   const groupId=cadastros.grupos.find(g=>nomeChave(g.nome)===nomeChave(edit?.grupo??''))?.id;
   return rows.filter(i=>!tipo||(i.nome===selected)||(i.ativo&&tipoPermitido(i,tipo))).sort((a,b)=>{
    if(kind==='categoria'&&groupId){const priority=Number(b.grupo_id===groupId)-Number(a.grupo_id===groupId);if(priority)return priority;}
    const used=(i:ItemFinanceiro)=>data.filter(l=>nomeChave(kind==='grupo'?l.grupo:l.categoria)===nomeChave(i.nome)).length;
    return used(b)-used(a)||b.created_at.localeCompare(a.created_at)||a.nome.localeCompare(b.nome,'pt-BR');
   });
  }
  async function createItem(kind:'grupo'|'categoria',name:string){
   if(!edit)return;if(!name){setManager(true);return;}
   const rows=kind==='grupo'?cadastros.grupos:cadastros.categorias;
   const duplicate=rows.find(i=>nomeChave(i.nome)===nomeChave(name));
   if(duplicate){toast.error(`Já existe “${duplicate.nome}”.`);return;}
   const similar=rows.find(i=>nomeChave(i.nome).includes(nomeChave(name))||nomeChave(name).includes(nomeChave(i.nome)));
   if(similar&&!confirm(`Já existe um nome parecido: “${similar.nome}”. Criar “${name}” mesmo assim?`))return;
   try{const saved=await saveItem({data:{kind,nome:name,tipo:edit.tipo==='entrada'?'Entrada':'Saída',ativo:true,grupo_id:kind==='categoria'?cadastros.grupos.find(g=>nomeChave(g.nome)===nomeChave(edit.grupo))?.id??null:null}});await qc.invalidateQueries({queryKey:cadastrosFinanceirosQuery.queryKey});setEdit(p=>p?{...p,[kind]:saved.nome}:p);toast.success('Opção cadastrada');}catch(e){toast.error(e instanceof Error?e.message:'Não foi possível criar.');}
  }

  async function onSave() {
    if (!edit) return;
    if(!edit.data_lancamento){toast.error('Informe a data do lançamento.');return;}
    if(!edit.valor.trim()){toast.error('Informe o valor do lançamento.');return;}
    setBusy(true);
    try {
      await salvar({ data: { id: edit.id, mes: edit.data_lancamento.slice(0,7),data_lancamento:edit.data_lancamento, tipo: edit.tipo, grupo: edit.grupo, categoria: edit.categoria, valor: Number(edit.valor.replace(/\./g, "").replace(",", ".")), descricao: edit.descricao || null } });
      await qc.invalidateQueries({ queryKey: ["school", "lancamentos"] });
      toast.success("Lançamento salvo"); setMes(edit.data_lancamento.slice(0,7)); setDe('');setAte('');setEdit(null);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function onDelete(l: Lancamento) {
    if (!l.id || !confirm(`Excluir "${l.categoria}" (${brl(l.valor)})?`)) return;
    try { await excluir({ data: { id: l.id } }); await qc.invalidateQueries({ queryKey: ["school", "lancamentos"] }); toast.success("Excluído"); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <section className="min-w-0 p-1">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Label>Mês</Label>
          <Select value={mes} onValueChange={setMes}><SelectTrigger className="w-48" aria-label="Mês dos lançamentos"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Todos os meses</SelectItem>{meses.map((m) => <SelectItem key={m} value={m}>{formatMes(m)}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEdit({ mes:hojeFinanceiro().slice(0,7),data_lancamento:hojeFinanceiro(), tipo: "entrada", grupo: "", categoria: "", valor: "", descricao: "" })}><Plus className="mr-1 h-4 w-4" />Nova entrada</Button>
          <Button onClick={() => setEdit({ mes:hojeFinanceiro().slice(0,7),data_lancamento:hojeFinanceiro(), tipo: "saida", grupo: "", categoria: "", valor: "", descricao: "" })}><Plus className="mr-1 h-4 w-4" />Nova saída</Button>
          <Button size="icon" variant="outline" title="Gerenciar grupos e categorias" aria-label="Gerenciar grupos e categorias" onClick={()=>setManager(true)}><Settings/></Button>
        </div>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><div className="min-w-0 space-y-1"><Label>De</Label><FinanceiroDatePicker label="Data inicial dos lançamentos" value={de} onChange={setDe}/></div><div className="min-w-0 space-y-1"><Label>Até</Label><FinanceiroDatePicker label="Data final dos lançamentos" value={ate} onChange={setAte}/></div><div className="min-w-0 space-y-1"><Label>Grupo</Label><FinanceiroCombobox label="Filtro de grupo" value={fGrupo} items={options('grupo')} onChange={setFGrupo} optional/></div><div className="min-w-0 space-y-1"><Label>Categoria</Label><FinanceiroCombobox label="Filtro de categoria" value={fCategoria} items={options('categoria')} onChange={setFCategoria} optional/></div><Button className="self-end" variant="ghost" onClick={()=>{setDe('');setAte('');setFGrupo('');setFCategoria('');}}>Limpar filtros</Button></div>
      <div className="mb-4 grid gap-4 border-y py-4 sm:grid-cols-3">
        {[["Entradas", brl(ent)], ["Saídas", brl(sai)], ["Saldo", ent === null && sai === null ? brl(null) : brl((ent ?? 0) - (sai ?? 0))]].map(([n, v]) =>
          <div key={n}><p className="text-sm text-muted-foreground">{n}</p><strong className="text-xl tabular-nums">{v}</strong></div>)}
      </div>
      {lista.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum lançamento neste mês.</p> : (
        <div className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead className="sticky left-0 z-10 bg-background"><Button variant="ghost" className="h-auto px-0" onClick={()=>setAsc(v=>!v)}>Data<ArrowUpDown className="h-3 w-3"/></Button></TableHead><TableHead>Tipo</TableHead><TableHead>Grupo</TableHead><TableHead>Categoria</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="w-24" /></TableRow></TableHeader>
          <TableBody>{lista.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="sticky left-0 z-10 whitespace-nowrap bg-background font-medium">{(l.data_lancamento??`${l.mes}-01`).split('-').reverse().join('/')}</TableCell>
              <TableCell className={l.tipo === "entrada" ? "text-success" : "text-destructive"}>{l.tipo === "entrada" ? "Entrada" : "Saída"}</TableCell>
              <TableCell>{l.grupo || "—"}</TableCell><TableCell className="font-medium">{l.categoria}</TableCell><TableCell>{l.descricao || "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{brl(l.valor)}</TableCell>
              <TableCell className="whitespace-nowrap text-right">
                <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setEdit({ id: l.id, mes: l.mes,data_lancamento:l.data_lancamento??`${l.mes}-01`, tipo: l.tipo, grupo: l.grupo, categoria: l.categoria, valor: String(l.valor).replace(".", ","), descricao: l.descricao ?? "" })}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => onDelete(l)}><Trash2 className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>))}
          </TableBody>
        </Table></div>
      )}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? "Editar lançamento" : edit?.tipo === "entrada" ? "Nova entrada" : "Nova saída"}</DialogTitle></DialogHeader>
          {edit && <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0"><Label>Data do lançamento</Label><FinanceiroDatePicker label="Data do lançamento" value={edit.data_lancamento} onChange={v=>setEdit({...edit,data_lancamento:v,mes:v.slice(0,7)})}/></div>
              <div><Label>Tipo</Label><Select value={edit.tipo} onValueChange={(v) => {const t=v as Lancamento['tipo'];setEdit({ ...edit, tipo:t,grupo:cadastros.grupos.some(i=>i.nome===edit.grupo&&tipoPermitido(i,t))?edit.grupo:'',categoria:cadastros.categorias.some(i=>i.nome===edit.categoria&&tipoPermitido(i,t))?edit.categoria:'' });}}><SelectTrigger aria-label="Tipo"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="entrada">Entrada</SelectItem><SelectItem value="saida">Saída</SelectItem></SelectContent></Select></div>
            </div>
            <div><div className="mb-1 flex items-center justify-between"><Label>Grupo</Label><Button size="icon" variant="ghost" title="Gerenciar grupos" aria-label="Gerenciar grupos do formulário" onClick={()=>setManager(true)}><Settings className="h-4 w-4"/></Button></div><FinanceiroCombobox label="Grupo do lançamento" value={edit.grupo} items={options('grupo',edit.tipo,edit.grupo)} onChange={v=>setEdit({...edit,grupo:v})} onCreate={v=>createItem('grupo',v)} optional/></div>
            <div><div className="mb-1 flex items-center justify-between"><Label>Categoria</Label><Button size="icon" variant="ghost" title="Gerenciar categorias" aria-label="Gerenciar categorias do formulário" onClick={()=>setManager(true)}><Settings className="h-4 w-4"/></Button></div><FinanceiroCombobox label="Categoria do lançamento" value={edit.categoria} items={options('categoria',edit.tipo,edit.categoria)} onChange={v=>setEdit({...edit,categoria:v})} onCreate={v=>createItem('categoria',v)}/></div>
            <div><Label htmlFor="lval">Valor (R$)</Label><Input id="lval" inputMode="decimal" placeholder="Ex.: 1.250,00" value={edit.valor} onChange={(e) => setEdit({ ...edit, valor: e.target.value })} /></div>
            <div><Label htmlFor="ldesc">Descrição (opcional)</Label><Input id="ldesc" value={edit.descricao} onChange={(e) => setEdit({ ...edit, descricao: e.target.value })} /></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button><Button disabled={busy} onClick={onSave}>{busy ? "Salvando…" : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      {manager&&<FinanceiroCadastrosManager onClose={()=>setManager(false)}/>}
    </section>
  );
}
