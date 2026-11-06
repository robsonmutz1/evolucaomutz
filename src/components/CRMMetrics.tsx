import { etapas, metricasCRM, type Lead } from '@/lib/crm';
import { brl } from '@/lib/alunos';
import type { Consultor } from './CRMLeadPanel';
const pct=(v:number)=>`${v.toLocaleString('pt-BR',{maximumFractionDigits:1})}%`;
export function CRMMetrics({leads,mes,consultores}:{leads:Lead[];mes:string;consultores:Consultor[]}){
 const m=metricasCRM(leads,mes);
 const stats=[['Leads do mês',String(m.coorte.length)],['Matriculados',String(m.matriculados)],['Taxa de conversão',pct(m.conversao)],['Sem resposta / Perdidos',`${m.semResposta} / ${m.perdidos}`],['Tempo médio até matrícula',m.tempo===null?'Não informado':`${m.tempo.toLocaleString('pt-BR',{maximumFractionDigits:1})} dias`],['Potencial em andamento',brl(m.potencial)],['Mensalidades matriculadas',brl(m.mensalMatriculados)],['Ticket médio',brl(m.ticket)]];
 return <>
  <div className="grid gap-x-5 gap-y-4 border-y py-5 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label,value])=><div key={label} className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words text-2xl font-semibold tabular-nums">{value}</p></div>)}</div>
  <details className="border-b pb-4"><summary className="cursor-pointer text-sm font-semibold text-primary">Conversões e funil do mês</summary><div className="mt-5 grid gap-6 lg:grid-cols-3">
   <Conversion title="Conversão por origem" leads={m.coorte} field="origem" consultores={consultores}/><Conversion title="Conversão por turno" leads={m.coorte} field="turno_interesse" consultores={consultores}/><Conversion title="Conversão por consultor" leads={m.coorte} field="consultor_responsavel" consultores={consultores}/>
  </div><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">{etapas.map(e=><div key={e} className="border-l-2 border-primary pl-3"><p className="text-xs text-muted-foreground">{e}</p><p className="text-xl font-semibold">{m.coorte.filter(l=>l.etapa===e).length}</p></div>)}</div></details>
 </>;
}
function Conversion({title,leads,field,consultores}:{title:string;leads:Lead[];field:'origem'|'turno_interesse'|'consultor_responsavel';consultores:Consultor[]}){
 const grupos=[...new Set(leads.map(l=>l[field]??'nenhum'))];
 return <section className="min-w-0"><h3 className="mb-3 text-base font-semibold">{title}</h3>{grupos.length===0?<p className="text-sm text-muted-foreground">Sem leads neste mês</p>:<div className="space-y-3">{grupos.map(g=>{
 const rows=leads.filter(l=>(l[field]??'nenhum')===g);const mat=rows.filter(l=>l.etapa==='Matriculado').length;const rate=mat/rows.length*100;
 const nome=field==='consultor_responsavel'?consultores.find(c=>c.id===g)?.nome??'Não atribuído':g;
 return <div key={g}><div className="mb-1 flex flex-wrap justify-between gap-x-2 text-xs"><span className="break-all">{nome}</span><span className="shrink-0 font-semibold">{mat}/{rows.length} · {pct(rate)}</span></div><progress className="crm-conversion h-2 w-full" value={rate} max={100} aria-label={`${nome}: ${pct(rate)}`}/></div>;
 })}</div>}</section>;
}