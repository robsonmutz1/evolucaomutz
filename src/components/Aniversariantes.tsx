import { useState } from 'react';
import { Gift, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select';
import { filtrarAniversariantes,idadeAluno,idadeTexto,type FiltrosAniversario } from '@/lib/aniversariantes';
import { dataBrasilia } from '@/lib/pedagogico';
import { formatData,type Aluno } from '@/lib/alunos';

const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
export function Aniversariantes({alunos,onStudent}:{alunos:Aluno[];onStudent:(a:Aluno)=>void}) {
  const hoje=dataBrasilia();
  const inicial: FiltrosAniversario={mes:hoje.slice(5,7),idadeMin:'',idadeMax:'',bairro:'todos',cidade:'todos',localizacao:'',status:'todos'};
  const [f,setF]=useState(inicial);
  const set=(key:keyof FiltrosAniversario,value:string)=>setF(p=>({...p,[key]:value}));
  const lista=filtrarAniversariantes(alunos,f,hoje);
  const pick=(key:keyof FiltrosAniversario,label:string,options:{value:string;label:string}[]) => <div className="min-w-0 space-y-1"><Label>{label}</Label><Select value={f[key]} onValueChange={v=>set(key,v)}><SelectTrigger aria-label={label} className="w-full"><SelectValue/></SelectTrigger><SelectContent>{options.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>;
  const lugares=(key:'bairro'|'cidade')=>[...new Set(alunos.map(a=>a[key]).filter(Boolean))].sort().map(v=>({value:v,label:v}));
  return <section className="space-y-4 py-3">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-xl font-semibold"><Gift className="size-5 text-primary"/>Aniversariantes <span className="text-sm text-muted-foreground">({lista.length})</span></h2><Button variant="outline" onClick={()=>setF({...inicial,mes:'todos'})}>Limpar filtros</Button></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {pick('mes','Mês do aniversário',[{value:'todos',label:'Todos os meses'},...meses.map((label,i)=>({value:String(i+1).padStart(2,'0'),label}))])}
      <div className="min-w-0 space-y-1"><Label>Idade atual (anos)</Label><div className="flex gap-2"><Input className="min-w-0" aria-label="Idade mínima" type="number" min="0" placeholder="Mín." value={f.idadeMin} onChange={e=>set('idadeMin',e.target.value)}/><Input className="min-w-0" aria-label="Idade máxima" type="number" min="0" placeholder="Máx." value={f.idadeMax} onChange={e=>set('idadeMax',e.target.value)}/></div></div>
      {pick('bairro','Bairro',[{value:'todos',label:'Todos os bairros'},...lugares('bairro')])}
      {pick('cidade','Cidade',[{value:'todos',label:'Todas as cidades'},...lugares('cidade')])}
      <div className="min-w-0 space-y-1 sm:col-span-2"><Label htmlFor="birthday-location">Localização</Label><Input id="birthday-location" placeholder="Rua, número, CEP, bairro ou cidade" value={f.localizacao} onChange={e=>set('localizacao',e.target.value)}/></div>
      {pick('status','Status do aluno',[{value:'todos',label:'Todos os status'},...['Ativo','Concluído','Cancelado'].map(value=>({value,label:value}))])}
    </div>
    <p className="text-sm text-muted-foreground">{alunos.filter(a=>!a.data_nascimento).length} alunos sem data de nascimento</p>
    <div className="divide-y">{lista.map(a=><div key={a.id} className="flex items-start justify-between gap-3 py-3"><div className="min-w-0"><Button variant="link" className="h-auto whitespace-normal p-0 text-left" onClick={()=>onStudent(a)}>{a.nome}</Button><p className="text-sm">{a.data_nascimento?formatData(a.data_nascimento):'—'} · {idadeTexto(idadeAluno(a.data_nascimento,hoje))}{a.data_nascimento?.slice(5)===hoje.slice(5)&&<span className="ml-2 font-semibold text-success">Hoje</span>}</p><p className="text-xs text-muted-foreground">{[a.bairro,a.cidade,a.status].filter(Boolean).join(' · ')}</p></div><Button size="icon" variant="ghost" aria-label={`Editar ${a.nome}`} onClick={()=>onStudent(a)}><Pencil/></Button></div>)}</div>
    {!lista.length&&<p className="py-8 text-center text-muted-foreground">Nenhum aniversariante encontrado.</p>}
  </section>;
}