import type { Database } from '@/integrations/supabase/types';
import { dataBrasilia, dataValida } from './financeiro-cadastros';
export { dataBrasilia };
type Tables=Database['public']['Tables'];
export type Curso=Tables['cursos']['Row'];
export type Horario=Tables['horarios']['Row'];
export type Turma=Tables['turmas']['Row'];
export type Matricula=Tables['matriculas_curso']['Row'];
export type Followup=Tables['aluno_followups']['Row'];
export type MatriculaInput=Pick<Matricula,'ordem'|'curso_id'|'turma_id'|'horario_id'|'status'|'data_conclusao'|'motivo_cancelamento'|'valor_mensal'>;
export const situacoes={cursando:'Cursando',concluido:'Concluído',formado:'Formado',cancelado:'Cancelado'};
export const dias=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
export function turmaPermitida(t:Turma,curso:string|null,atual:string|null){return t.curso_id===curso&&(t.id===atual||(t.disponivel_matricula&&t.status==='em_andamento'));}
export function validarMatriculas(ms:MatriculaInput[]){
 if(ms.length<1||ms.length>2)throw new Error('Selecione um ou dois cursos.');
 if(ms.length===2&&(!ms[1]?.curso_id||ms[0]?.curso_id===ms[1]?.curso_id))throw new Error('Curso 2 deve ser diferente do Curso 1.');
 if(ms.length===2&&ms[0]?.turma_id&&ms[0]?.turma_id===ms[1]?.turma_id)throw new Error('Selecione turmas diferentes.');
 ms.forEach((m,i)=>{if(m.ordem!==i+1)throw new Error('Ordem inválida.');if(!Object.keys(situacoes).includes(m.status))throw new Error('Situação inválida.');if(m.data_conclusao&&!dataValida(m.data_conclusao))throw new Error('Data inválida.');if(m.valor_mensal!==null&&(!Number.isFinite(m.valor_mensal)||m.valor_mensal<0))throw new Error('Valor inválido.');});return ms;
}
export function validarFollowup(f:{data:string;descricao:string}){if(!dataValida(f.data)||!f.descricao.trim())throw new Error('Informe uma data válida e a ocorrência.');return {...f,descricao:f.descricao.trim()};}
export function validarFoto(file:{type:string;size:number}){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw new Error('Use JPG, PNG ou WebP de até 5 MB.');}
export function receitasMatriculas(alunos:{id:string;valor_matricula?:number|null;data_matricula?:string|null}[]){const seen=new Set<string>();const totals=new Map<string,number>();for(const a of alunos){if(seen.has(a.id))continue;seen.add(a.id);if(a.valor_matricula==null||!a.data_matricula)continue;const mes=a.data_matricula.slice(0,7);totals.set(mes,(totals.get(mes)??0)+a.valor_matricula);}return [...totals].map(([mes,valor])=>({mes,valor}));}
