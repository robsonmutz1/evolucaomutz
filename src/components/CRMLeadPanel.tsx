import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { MessageCircle, Phone, UserRoundCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { etapas, origens, turnos, tiposContato, normalizarTelefone, type Lead } from '@/lib/crm';
import { historicoLead, registrarContatoCRM, salvarLead, verificarTelefoneCRM } from '@/lib/crm.functions';
import { useStore } from '@/lib/store';
export type Consultor = {id:string;nome:string};

export function CRMSelect({label,value,options,onChange}:{label:string;value:string;options:readonly string[];onChange:(v:string)=>void}) {
 return <div className="min-w-0 space-y-1.5"><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{options.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>;
}
export function CRMLeadPanel({lead,novo,consultores,onClose}:{lead:Lead;novo:boolean;consultores:Consultor[];onClose:()=>void}) {
 const [f,setF]=useState(lead),[saving,setSaving]=useState(false),[aviso,setAviso]=useState<string|null>(null),[checking,setChecking]=useState(false);
 const [contato,setContato]=useState(false),[tipo,setTipo]=useState('WhatsApp'),[descricao,setDescricao]=useState(''),[proximo,setProximo]=useState(lead.data_proximo_contato??'');
 const [vincular,setVincular]=useState(false),[alunoBusca,setAlunoBusca]=useState(''),[alunoId,setAlunoId]=useState('');
 const {alunos}=useStore();const cache=useQueryClient();const save=useServerFn(salvarLead),check=useServerFn(verificarTelefoneCRM),register=useServerFn(registrarContatoCRM);
 const phoneSequence=useRef(0);
 const history=useQuery({queryKey:['school','crm-history',lead.id],queryFn:()=>historicoLead({data:{id:lead.id}}),enabled:!novo});
 const set=<K extends keyof Lead>(k:K,v:Lead[K])=>setF(p=>({...p,[k]:v}));
 useEffect(()=>{
  if(!novo&&normalizarTelefone(f.telefone)===normalizarTelefone(lead.telefone)){setAviso(null);setChecking(false);return;}
  const seq=++phoneSequence.current;setAviso(null);
  if(![10,11].includes(normalizarTelefone(f.telefone).length)){setChecking(false);return;}
  setChecking(true);const timer=setTimeout(()=>{void check({data:{telefone:f.telefone,id:f.id}}).then(v=>{if(seq===phoneSequence.current)setAviso(v);}).catch(()=>{if(seq===phoneSequence.current)setAviso('Não foi possível verificar o telefone. Tente novamente.');}).finally(()=>{if(seq===phoneSequence.current)setChecking(false);});},400);
  return ()=>{clearTimeout(timer);phoneSequence.current++;};
 },[f.telefone,f.id,novo,lead.telefone,check]);
 async function refresh(){await Promise.all([cache.invalidateQueries({queryKey:['school','crm']}),cache.invalidateQueries({queryKey:['school','crm-history',lead.id]})]);}
 async function salvar(row:Lead,fechar=true){setSaving(true);try{const result=await save({data:row});setF(result);await refresh();toast.success('Lead salvo');if(fechar)onClose();}catch(e){toast.error(e instanceof Error?e.message:'Não foi possível salvar.');}finally{setSaving(false);}}
 const txt=(k:keyof Lead,label:string,type='text')=>{
  const val=f[k];
  const displayed=type==='datetime-local'&&typeof val==='string'&&val ? new Date(new Date(val).getTime()-new Date(val).getTimezoneOffset()*60000).toISOString().slice(0,16) : String(val??'');
  return <div className="min-w-0 space-y-1.5"><Label htmlFor={`crm-${k}`}>{label}</Label><Input id={`crm-${k}`} className="min-w-0" required={k==='nome_responsavel'||k==='telefone'||k==='motivo_perda'} type={type} min={type==='number'?0:undefined} step={k==='valor_mensalidade_negociado'?'0.01':undefined} value={displayed} onChange={e=>set(k,(type==='number'?(e.target.value===''?null:Number(e.target.value)):type==='datetime-local'?(e.target.value?new Date(e.target.value).toISOString():null):['nome_responsavel','telefone'].includes(k)?e.target.value:e.target.value||null) as never)}/></div>;
 };
 const resultados=alunos.filter(a=>a.status==='Ativo'&&[a.nome,a.codigo,a.responsavel].some(v=>v.toLowerCase().includes(alunoBusca.toLowerCase()))).slice(0,30);
 return <Sheet open onOpenChange={o=>{if(!o&&!saving)onClose();}}><SheetContent className="w-full overflow-y-auto sm:max-w-2xl" aria-describedby="crm-panel-description">
  <SheetHeader className="mb-6 text-left"><SheetTitle className="text-2xl">{novo?'Novo lead':f.nome_responsavel}</SheetTitle><SheetDescription id="crm-panel-description">{novo?'Cadastro de interessado':'Dados e histórico de atendimento'}</SheetDescription></SheetHeader>
  {!novo&&<div className="mb-6 flex flex-wrap gap-2"><Button variant="outline" asChild><a href={`https://wa.me/55${normalizarTelefone(f.telefone)}`} target="_blank" rel="noopener noreferrer"><MessageCircle/>Abrir WhatsApp</a></Button><Button variant="outline" onClick={()=>{setContato(true);setTipo('WhatsApp');}}><Phone/>Registrar contato</Button><Button variant="outline" onClick={()=>setVincular(v=>!v)}><UserRoundCheck/>Vincular a um aluno</Button><Button variant="destructive" onClick={()=>{set('etapa','Perdido');setTimeout(()=>document.getElementById('crm-motivo_perda')?.focus(),0);}}>Marcar como perdido</Button>{f.etapa==='Matriculado'&&!f.pos_venda_realizado&&<Button variant="outline" onClick={()=>{setContato(true);setTipo('Pós-venda');}}>Registrar pós-venda</Button>}</div>}
  {contato&&<form className="mb-6 space-y-3 border-y py-4" onSubmit={async e=>{e.preventDefault();setSaving(true);try{await register({data:{id:f.id,tipo,descricao,proximo}});await refresh();setF(p=>({...p,data_ultimo_contato:new Date().toISOString(),data_proximo_contato:proximo||null,pos_venda_realizado:tipo==='Pós-venda'?true:p.pos_venda_realizado,data_pos_venda:tipo==='Pós-venda'?new Date().toISOString():p.data_pos_venda}));setContato(false);setDescricao('');toast.success('Contato registrado');}catch(e){toast.error(e instanceof Error?e.message:'Não foi possível registrar.');}finally{setSaving(false);}}}>
   <h3 className="font-semibold">Registrar contato</h3><CRMSelect label="Tipo de contato" value={tipo} options={f.etapa==='Matriculado'?tiposContato:tiposContato.filter(t=>t!=='Pós-venda')} onChange={setTipo}/><Label htmlFor="contato-descricao">Descrição</Label><Textarea id="contato-descricao" required value={descricao} onChange={e=>setDescricao(e.target.value)}/><Label htmlFor="contato-proximo">Próximo contato</Label><Input id="contato-proximo" type="date" value={proximo} onChange={e=>setProximo(e.target.value)}/><div className="flex gap-2"><Button disabled={saving}>Salvar contato</Button><Button type="button" variant="ghost" onClick={()=>setContato(false)}>Cancelar</Button></div>
  </form>}
  {vincular&&<div className="mb-6 space-y-3 border-y py-4"><h3 className="font-semibold">Vincular a um aluno</h3><Input placeholder="Buscar aluno por nome ou código" value={alunoBusca} onChange={e=>setAlunoBusca(e.target.value)}/><Select value={alunoId} onValueChange={setAlunoId}><SelectTrigger className="w-full"><SelectValue placeholder="Selecione o aluno ativo"/></SelectTrigger><SelectContent>{resultados.map(a=><SelectItem key={a.id} value={a.id}>{a.codigo} · {a.nome}</SelectItem>)}</SelectContent></Select><Button disabled={!alunoId||saving} onClick={()=>void salvar({...f,aluno_id:alunoId,etapa:'Matriculado'},false)}>Confirmar vínculo e matrícula</Button></div>}
  <form className="space-y-5" onSubmit={e=>{e.preventDefault();if(aviso||checking)return;void salvar(f);}}>
   <div className="grid gap-4 sm:grid-cols-2">
    {txt('nome_responsavel','Nome do responsável')}{txt('telefone','WhatsApp com DDD','tel')}
    {(checking||aviso)&&<p role="status" className="text-sm text-destructive sm:col-span-2">{checking?'Verificando telefone…':aviso}</p>}
    {txt('nome_aluno','Nome do aluno')}{txt('idade_aluno','Idade do aluno','number')}
    <CRMSelect label="Turno de interesse" value={f.turno_interesse} options={turnos} onChange={v=>set('turno_interesse',v)}/>
    <div className="space-y-1.5"><Label htmlFor="crm-curso">Curso de interesse</Label><Input id="crm-curso" list="crm-cursos" value={f.curso_interesse} onChange={e=>set('curso_interesse',e.target.value)}/><datalist id="crm-cursos">{[...new Set(alunos.map(a=>a.curso).filter(Boolean))].sort().map(c=><option key={c} value={c}/>)}</datalist></div>
    <CRMSelect label="Origem" value={f.origem} options={origens} onChange={v=>set('origem',v)}/>
    <div className="space-y-1.5"><Label>Consultor responsável</Label><Select value={f.consultor_responsavel??'nenhum'} onValueChange={v=>set('consultor_responsavel',v==='nenhum'?null:v)}><SelectTrigger className="w-full"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="nenhum">Não atribuído</SelectItem>{consultores.map(c=><SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
    {txt('valor_mensalidade_negociado','Mensalidade negociada (R$)','number')}
    <CRMSelect label="Etapa" value={f.etapa} options={etapas} onChange={v=>set('etapa',v)}/>
    {txt('data_ultimo_contato','Último contato','datetime-local')}{txt('data_proximo_contato','Próximo contato','date')}
    {f.etapa==='Perdido'&&<div className="sm:col-span-2">{txt('motivo_perda','Motivo da perda')}</div>}
    {f.etapa==='Matriculado'&&<>{txt('data_fechamento','Data da matrícula no CRM','datetime-local')}<div className="self-end text-sm text-muted-foreground">{f.pos_venda_realizado?'Pós-venda realizado':'Pós-venda pendente'}{f.aluno_id&&<p>Aluno: {alunos.find(a=>a.id===f.aluno_id)?.nome??'Vinculado'}</p>}</div></>}
   </div>
   <div className="space-y-1.5"><Label htmlFor="crm-observacoes">Observações</Label><Textarea id="crm-observacoes" value={f.observacoes} onChange={e=>set('observacoes',e.target.value)}/></div>
   <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancelar</Button><Button disabled={saving||checking||!!aviso}>{saving?'Salvando…':'Salvar lead'}</Button></div>
  </form>
  {!novo&&<section className="mt-8 border-t pt-5"><h3 className="mb-4 text-lg font-semibold">Histórico</h3>{history.isPending?<p className="text-sm text-muted-foreground">Carregando histórico…</p>:history.isError?<div><p className="text-sm text-destructive">Não foi possível carregar o histórico.</p><Button variant="outline" onClick={()=>void history.refetch()}>Tentar novamente</Button></div>:<ol className="space-y-4 border-l pl-4">{history.data.map(h=><li key={h.id}><div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString('pt-BR')} · {h.tipo}</div><p className="break-words text-sm">{h.descricao}</p></li>)}</ol>}</section>}
 </SheetContent></Sheet>;
}