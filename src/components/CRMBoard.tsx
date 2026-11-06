import { useDraggable, useDroppable } from '@dnd-kit/core';
import { GripVertical, Clock, Phone, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { diasDesde, nivelContato, type Lead } from '@/lib/crm';
import { brl } from '@/lib/alunos';
import type { Consultor } from './CRMLeadPanel';

export function CRMColumn({etapa,leads,consultores,onOpen,busy}:{etapa:string;leads:Lead[];consultores:Consultor[];onOpen:(l:Lead)=>void;busy:boolean}){
 const {setNodeRef,isOver}=useDroppable({id:etapa});
 const soma=leads.reduce((n,l)=>n+(l.valor_mensalidade_negociado??0),0);
 return <section ref={setNodeRef} aria-label={`Coluna ${etapa}`} className={`flex min-h-80 w-64 shrink-0 flex-col gap-3 rounded-lg border bg-muted/35 p-3 ${isOver?'border-primary ring-2 ring-primary':''}`}>
  <header className="border-b pb-3"><div className="flex items-center justify-between gap-2"><h3 className="text-base font-semibold">{etapa}</h3><span className="rounded-md bg-background px-2 py-0.5 text-xs font-semibold">{leads.length}</span></div><p className="mt-1 text-sm text-muted-foreground">{brl(soma)}</p></header>
  {leads.map(l=><CRMCard key={l.id} lead={l} consultor={consultores.find(c=>c.id===l.consultor_responsavel)?.nome??'Não atribuído'} onOpen={()=>onOpen(l)} busy={busy}/>)}
  {leads.length===0&&<p className="py-8 text-center text-sm text-muted-foreground">Nenhum lead</p>}
 </section>;
}
function CRMCard({lead:l,consultor,onOpen,busy}:{lead:Lead;consultor:string;onOpen:()=>void;busy:boolean}){
 const {attributes,listeners,setNodeRef,isDragging}=useDraggable({id:l.id,disabled:busy});
 const nivel=['Matriculado','Perdido'].includes(l.etapa)?'normal':nivelContato(l);
 const dias=diasDesde(l.data_ultimo_contato??l.created_at);
 return <article ref={setNodeRef} className={`relative rounded-lg border bg-card p-3 text-card-foreground ${nivel==='forte'?'border-destructive':nivel==='atencao'?'border-warning':''} ${isDragging?'opacity-30':''}`}>
  <div className="flex items-start justify-between gap-1"><Button variant="ghost" className="h-auto min-w-0 flex-1 justify-start whitespace-normal px-0 py-1 text-left font-semibold" onClick={onOpen}>{l.nome_responsavel}</Button><Button variant="ghost" size="icon" className="h-8 w-7 shrink-0 touch-none" title="Arrastar lead" aria-label={`Arrastar ${l.nome_responsavel}`} {...attributes} {...listeners}><GripVertical className="h-4 w-4"/></Button></div>
  {l.nome_aluno&&<p className="break-words text-sm text-muted-foreground">{l.nome_aluno}{l.idade_aluno!==null?` · ${l.idade_aluno} anos`:''}</p>}
  {!l.nome_aluno&&l.idade_aluno!==null&&<p className="text-sm text-muted-foreground">{l.idade_aluno} anos</p>}
  <p className="mt-2 flex items-center gap-1.5 text-xs"><Phone className="h-3 w-3 shrink-0"/>{l.telefone}</p><p className="mt-1 text-xs text-muted-foreground">{l.turno_interesse}</p>
  {l.valor_mensalidade_negociado!==null&&<p className="mt-2 text-sm font-semibold text-primary">{brl(l.valor_mensalidade_negociado)}<span className="ml-1 text-xs font-normal text-muted-foreground">/mês</span></p>}
  <p className="mt-2 flex items-start gap-1.5 break-all text-xs text-muted-foreground"><UserRound className="mt-0.5 h-3 w-3 shrink-0"/>{consultor}</p>
  <footer className="mt-3 border-t pt-2 text-xs text-muted-foreground"><p>Entrou há {diasDesde(l.created_at)} dias</p><p className={`mt-1 flex items-center gap-1 ${nivel==='forte'?'font-semibold text-destructive':nivel==='atencao'?'font-semibold text-warning-foreground':''}`}><Clock className="h-3 w-3"/>{l.data_ultimo_contato?`${dias} dias sem contato`:`Sem contato · ${dias} dias`}</p></footer>
 </article>;
}