import { Fragment, useMemo, useRef, useState } from "react";
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
import { filtrarPorTipo, lancamentosPorDia, totalPorTipo, type Lancamento } from "@/lib/lancamentos";
import { excluirLancamento, lancamentosQuery, salvarLancamento } from "@/lib/lancamentos.functions";
import { cadastrosFinanceirosQuery, salvarCadastroFinanceiro } from '@/lib/financeiro-cadastros.functions';
import { hojeFinanceiro, nomeChave, tipoPermitido, type ItemFinanceiro } from '@/lib/financeiro-cadastros';
import { FinanceiroCombobox } from './FinanceiroCombobox';
import { FinanceiroDatePicker } from './FinanceiroDatePicker';
import { Link } from '@tanstack/react-router';
import { caixaQuery } from '@/lib/caixa.functions';
import { FinanceiroCadastrosManager } from './FinanceiroCadastrosManager';

type Edit = { id?: string | undefined; mes: string; data_lancamento:string; tipo: Lancamento["tipo"]; grupo: string; categoria: string; valor: string; descricao: string; conta_id: string };

export function Lancamentos() {
  const { data } = useSuspenseQuery(lancamentosQuery);
  const {data:cadastros}=useSuspenseQuery(cadastrosFinanceirosQuery);
  const {data:caixa}=useSuspenseQuery(caixaQuery);
  const contaPadrao=()=>{const a=caixa.contas.filter(c=>c.ativa);return (a.find(c=>c.nome==='Principal')??a[0])?.id??'';};
  const contaNome=(id?:string|null)=>caixa.contas.find(c=>c.id===id)?.nome;
  const qc = useQueryClient();
  const salvar = useServerFn(salvarLancamento);
  const excluir = useServerFn(excluirLancamento);
  const meses = useMemo(() => [...new Set([hojeFinanceiro().slice(0, 7), ...data.map((l) => l.mes)])].sort().reverse(), [data]);
  const [mes, setMes] = useState(data[0]?.mes ?? meses[0] ?? "");
  const [edit, setEdit] = useState<Edit | null>(null);
  const valorInput = useRef<HTMLInputElement>(null);
  const descricaoInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [de,setDe]=useState(''),[ate,setAte]=useState(''),[fGrupo,setFGrupo]=useState(''),[fCategoria,setFCategoria]=useState(''),[asc,setAsc]=useState(false),[manager,setManager]=useState(false),[fConta,setFConta]=useState('todas'),[fTipo,setFTipo]=useState<'todos'|Lancamento['tipo']>('todos');
  const saveItem=useServerFn(salvarCadastroFinanceiro);
  const lista = useMemo(() => filtrarPorTipo(data, fTipo).filter((l) => (mes==='todos'||l.mes===mes)&&(!de||(l.data_lancamento??`${l.mes}-01`)>=de)&&(!ate||(l.data_lancamento??`${l.mes}-01`)<=ate)&&(!fGrupo||nomeChave(l.grupo)===nomeChave(fGrupo))&&(!fCategoria||nomeChave(l.categoria)===nomeChave(fCategoria))&&(fConta==='todas'||(fConta==='sem'?!l.conta_id:l.conta_id===fConta))).sort((a,b)=>((a.data_lancamento??`${a.mes}-01`).localeCompare(b.data_lancamento??`${b.mes}-01`))*(asc?1:-1)), [data, mes, de, ate, fGrupo, fCategoria, fConta, fTipo, asc]);
  const usos = useMemo(() => {
    const grupo = new Map<string, number>(), categoria = new Map<string, number>();
    for (const l of data) {
      const g = nomeChave(l.grupo), c = nomeChave(l.categoria);
      grupo.set(g, (grupo.get(g) ?? 0) + 1);
      categoria.set(c, (categoria.get(c) ?? 0) + 1);
    }
    return { grupo, categoria };
  }, [data]);
  const ent = totalPorTipo(lista, "entrada", ''), sai = totalPorTipo(lista, "saida", '');
  const dias = useMemo(() => lancamentosPorDia(lista, data), [lista, data]);
  function options(kind:'grupo'|'categoria',tipo?:Lancamento['tipo'],selected=''){
   const rows=kind==='grupo'?cadastros.grupos:cadastros.categorias;
   const groupId=cadastros.grupos.find(g=>nomeChave(g.nome)===nomeChave(edit?.grupo??''))?.id;
   return rows.filter(i=>!tipo||(i.nome===selected)||(i.ativo&&tipoPermitido(i,tipo))).sort((a,b)=>{
    if(kind==='categoria'&&groupId){const priority=Number(b.grupo_id===groupId)-Number(a.grupo_id===groupId);if(priority)return priority;}
    const used=(i:ItemFinanceiro)=>usos[kind].get(nomeChave(i.nome)) ?? 0;
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
    const valor = valorInput.current?.value ?? edit.valor;
    const descricao = descricaoInput.current?.value ?? edit.descricao;
    if(!edit.data_lancamento){toast.error('Informe a data do lançamento.');return;}
    if(!edit.conta_id){toast.error('Informe a conta.');return;}
    if(!valor.trim()){toast.error('Informe o valor do lançamento.');return;}
    setBusy(true);
    try {
      const row: Lancamento = { id: edit.id, mes: edit.data_lancamento.slice(0,7),data_lancamento:edit.data_lancamento, tipo: edit.tipo, grupo: edit.grupo, categoria: edit.categoria, valor: Number(valor.replace(/\./g, "").replace(",", ".")), descricao: descricao || null, conta_id: edit.conta_id };
      try { await salvar({data:row}); } catch(e) { if(e instanceof Error && e.message.includes("conferência fechada") && confirm("Esta alteração afeta uma conferência fechada e será registrada. Continuar?")) await salvar({data:{...row,confirmar_caixa:true}}); else throw e; }
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["school", "lancamentos"] }),
        qc.invalidateQueries({ queryKey: caixaQuery.queryKey }),
        qc.invalidateQueries({ queryKey: ["school", "controles"] }),
      ]);
      toast.success("Lançamento salvo"); setMes(edit.data_lancamento.slice(0,7)); setDe('');setAte('');setEdit(null);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function onDelete(l: Lancamento) {
    if (!l.id || !confirm(`Excluir "${l.categoria}" (${brl(l.valor)})?`)) return;
    try { try { await excluir({ data: { id: l.id } }); } catch(e) { if(e instanceof Error && e.message.includes("conferência fechada") && confirm("Esta exclusão afeta uma conferência fechada e será registrada. Continuar?")) await excluir({data:{id:l.id,confirmar_caixa:true}}); else throw e; } await qc.invalidateQueries({ queryKey: ["school", "lancamentos"] }); toast.success("Excluído"); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <section className="min-w-0 p-1">
      <Link to="/fluxo-caixa" className="mb-3 inline-block text-sm text-primary underline">Definir contas, pagamentos e conferir caixa</Link>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Label>Mês</Label>
          <Select value={mes} onValueChange={setMes}><SelectTrigger className="w-48" aria-label="Mês dos lançamentos"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Todos os meses</SelectItem>{meses.map((m) => <SelectItem key={m} value={m}>{formatMes(m)}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEdit({ mes:hojeFinanceiro().slice(0,7),data_lancamento:hojeFinanceiro(), tipo: "entrada", grupo: "", categoria: "", valor: "", descricao: "", conta_id: contaPadrao() })}><Plus className="mr-1 h-4 w-4" />Nova entrada</Button>
          <Button onClick={() => setEdit({ mes:hojeFinanceiro().slice(0,7),data_lancamento:hojeFinanceiro(), tipo: "saida", grupo: "", categoria: "", valor: "", descricao: "", conta_id: contaPadrao() })}><Plus className="mr-1 h-4 w-4" />Nova saída</Button>
          <Button size="icon" variant="outline" title="Gerenciar grupos e categorias" aria-label="Gerenciar grupos e categorias" onClick={()=>setManager(true)}><Settings/></Button>
        </div>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7"><div className="min-w-0 space-y-1"><Label>De</Label><FinanceiroDatePicker label="Data inicial dos lançamentos" value={de} onChange={setDe}/></div><div className="min-w-0 space-y-1"><Label>Até</Label><FinanceiroDatePicker label="Data final dos lançamentos" value={ate} onChange={setAte}/></div><div className="min-w-0 space-y-1"><Label>Grupo</Label><FinanceiroCombobox label="Filtro de grupo" value={fGrupo} items={options('grupo')} onChange={setFGrupo} optional/></div><div className="min-w-0 space-y-1"><Label>Categoria</Label><FinanceiroCombobox label="Filtro de categoria" value={fCategoria} items={options('categoria')} onChange={setFCategoria} optional/></div><div className="min-w-0 space-y-1"><Label>Conta</Label><Select value={fConta} onValueChange={setFConta}><SelectTrigger className="w-full" aria-label="Filtro de conta"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="todas">Todas as contas</SelectItem>{caixa.contas.map(c=><SelectItem key={c.id} value={c.id}>{c.nome}{!c.ativa?' (inativa)':''}</SelectItem>)}<SelectItem value="sem">Sem conta definida</SelectItem></SelectContent></Select></div><div className="min-w-0 space-y-1"><Label>Visualizar</Label><Select value={fTipo} onValueChange={(v)=>setFTipo(v as 'todos'|Lancamento['tipo'])}><SelectTrigger className="w-full" aria-label="Filtro de tipo de lançamento"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="todos">Entradas e saídas</SelectItem><SelectItem value="entrada">Somente entradas</SelectItem><SelectItem value="saida">Somente saídas</SelectItem></SelectContent></Select></div><Button className="self-end" variant="ghost" onClick={()=>{setDe('');setAte('');setFGrupo('');setFCategoria('');setFConta('todas');setFTipo('todos');}}>Limpar filtros</Button></div>
      <div className="mb-4 grid gap-4 border-y py-4 sm:grid-cols-3">
        {[["Entradas", brl(ent)], ["Saídas", brl(sai)], ["Saldo", ent === null && sai === null ? brl(null) : brl((ent ?? 0) - (sai ?? 0))]].map(([n, v]) =>
          <div key={n}><p className="text-sm text-muted-foreground">{n}</p><strong className="text-xl tabular-nums">{v}</strong></div>)}
      </div>
      {lista.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum lançamento neste mês.</p> : (
        <div className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead className="sticky left-0 z-10 bg-background"><Button variant="ghost" className="h-auto px-0" onClick={()=>setAsc(v=>!v)}>Data<ArrowUpDown className="h-3 w-3"/></Button></TableHead><TableHead>Tipo</TableHead><TableHead>Grupo</TableHead><TableHead>Categoria</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="w-24" /></TableRow></TableHeader>
          <TableBody>{dias.map((dia) => (
            <Fragment key={dia.data}>
              <TableRow className="bg-muted/60 hover:bg-muted/60" data-dia={dia.data}>
                <TableCell colSpan={7} className="py-3">
                  <div className="sticky left-0 grid w-[calc(100vw-4rem)] max-w-full grid-cols-2 gap-x-4 gap-y-2 text-sm sm:w-auto lg:grid-cols-3 2xl:grid-cols-5">
                    <strong className="whitespace-nowrap">{dia.data.split('-').reverse().join('/')}</strong>
                    <span className="whitespace-nowrap">Entradas: <strong className="text-success tabular-nums">{brl(dia.entradas)}</strong></span>
                    <span className="whitespace-nowrap">Saídas: <strong className="text-destructive tabular-nums">{brl(dia.saidas)}</strong></span>
                    <span className="whitespace-nowrap">Saldo do dia: <strong className="tabular-nums">{brl(dia.saldo)}</strong></span>
                    <span className="col-span-2 whitespace-nowrap lg:col-span-1">Valor acumulado: <strong className="tabular-nums">{brl(dia.acumulado)}</strong></span>
                  </div>
                </TableCell>
              </TableRow>
              {dia.lancamentos.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="sticky left-0 z-10 whitespace-nowrap bg-background font-medium">{(l.data_lancamento??`${l.mes}-01`).split('-').reverse().join('/')}</TableCell>
              <TableCell className={l.tipo === "entrada" ? "text-success" : "text-destructive"}>{l.tipo === "entrada" ? "Entrada" : "Saída"}</TableCell>
              <TableCell>{l.grupo || "—"}</TableCell><TableCell className="font-medium">{l.categoria}</TableCell><TableCell>{l.descricao || "—"}{contaNome(l.conta_id)&&<span className="block text-xs text-muted-foreground">Conta: {contaNome(l.conta_id)}</span>}</TableCell>
              <TableCell className="text-right tabular-nums">{brl(l.valor)}</TableCell>
              <TableCell className="whitespace-nowrap text-right">
                <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setEdit({ id: l.id, mes: l.mes,data_lancamento:l.data_lancamento??`${l.mes}-01`, tipo: l.tipo, grupo: l.grupo, categoria: l.categoria, valor: String(l.valor).replace(".", ","), descricao: l.descricao ?? "", conta_id: l.conta_id ?? "" })}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => onDelete(l)}><Trash2 className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>))}
            </Fragment>))}
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
            <div><Label>{edit.tipo==="saida"?"Conta de saída (de onde sai o dinheiro)":"Conta de entrada (onde o dinheiro entra)"}</Label><Select value={edit.conta_id} onValueChange={v=>setEdit({...edit,conta_id:v})}><SelectTrigger aria-label="Conta"><SelectValue placeholder="Selecione a conta"/></SelectTrigger><SelectContent>{caixa.contas.filter(c=>c.ativa||c.id===edit.conta_id).map(c=><SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select>{!caixa.contas.some(c=>c.ativa)&&<Link to="/fluxo-caixa" className="text-xs text-primary underline">Cadastrar conta</Link>}</div>
            <div><Label htmlFor="lval">Valor (R$)</Label><Input ref={valorInput} id="lval" inputMode="decimal" placeholder="Ex.: 1.250,00" defaultValue={edit.valor} /></div>
            <div><Label htmlFor="ldesc">Descrição (opcional)</Label><Input ref={descricaoInput} id="ldesc" defaultValue={edit.descricao} /></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button><Button disabled={busy} onClick={onSave}>{busy ? "Salvando…" : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      {manager&&<FinanceiroCadastrosManager onClose={()=>setManager(false)}/>}
    </section>
  );
}
