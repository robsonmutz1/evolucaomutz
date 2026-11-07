import { createServerFn } from '@tanstack/react-start';
import { queryOptions } from '@tanstack/react-query';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { validarFollowup, type Curso,type Horario,type Turma,type Matricula,type Followup } from './pedagogico';
export const listarPedagogico=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const result:{cursos:Curso[];horarios:Horario[];turmas:Turma[];matriculas:Matricula[]}={cursos:[],horarios:[],turmas:[],matriculas:[]};
 for(const table of ['cursos','horarios','turmas','matriculas_curso'] as const){const rows=[];for(let start=0;;start+=500){const {data,error}=await context.supabase.from(table).select('*').order('id').range(start,start+499);if(error)throw new Error('Não foi possível carregar Pedagógico.');rows.push(...data);if(data.length<500)break;}if(table==='cursos')result.cursos=rows as Curso[];if(table==='horarios')result.horarios=rows as Horario[];if(table==='turmas')result.turmas=rows as Turma[];if(table==='matriculas_curso')result.matriculas=rows as Matricula[];}
 return result;
});
export const pedagogicoQuery=queryOptions({queryKey:['school','pedagogico'],queryFn:()=>listarPedagogico(),staleTime:30000});
type Save={kind:'curso';row:Omit<Curso,'created_at'>}|{kind:'horario';row:Horario}|{kind:'turma';row:Omit<Turma,'created_at'>};
export const salvarPedagogico=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:Save)=>{
 if(i.kind==='curso'&&(!i.row.nome.trim()||[i.row.valor_mensal_padrao,i.row.valor_matricula_padrao,i.row.carga_horaria].some(v=>v!==null&&(!Number.isFinite(v)||v<0))))throw new Error('Confira nome e valores.');
 if(i.kind==='horario'&&(!i.row.descricao.trim()||!i.row.hora_inicio||!i.row.dias_semana.length||(i.row.hora_fim&&i.row.hora_fim<=i.row.hora_inicio)))throw new Error('Informe dias e horários válidos.');
 if(i.kind==='turma'&&(!i.row.codigo.trim()||!i.row.curso_id||!i.row.horario_id||!i.row.data_inicio||(i.row.data_previsao_termino&&i.row.data_previsao_termino<i.row.data_inicio)))throw new Error('Confira curso, horário e datas.');return i;
}).handler(async({context,data})=>{const {error}=data.kind==='curso'?await context.supabase.from('cursos').upsert(data.row):data.kind==='horario'?await context.supabase.from('horarios').upsert(data.row):await context.supabase.from('turmas').upsert(data.row);if(error)throw new Error(error.code==='23505'?'Já existe um cadastro com esse nome ou código.':'Não foi possível salvar.');return {success:true};});
export const listarFollowups=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{const rows:Followup[]=[];for(let start=0;;start+=500){const {data,error}=await context.supabase.from('aluno_followups').select('*').order('data',{ascending:false}).order('id').range(start,start+499);if(error)throw new Error('Não foi possível carregar Follow-up.');rows.push(...data);if(data.length<500)break;}return rows;});
export const followupsQuery=queryOptions({queryKey:['school','followups'],queryFn:()=>listarFollowups(),staleTime:30000});
export const salvarFollowup=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:{id?:string|undefined;aluno_id:string;data:string;descricao:string})=>validarFollowup(i)).handler(async({context,data})=>{const {error}=await context.supabase.from('aluno_followups').upsert({...data,updated_at:new Date().toISOString()});if(error)throw new Error('Não foi possível salvar a ocorrência.');return {success:true};});
export const excluirFollowup=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:{id:string})=>i).handler(async({context,data})=>{const {error}=await context.supabase.from('aluno_followups').delete().eq('id',data.id);if(error)throw new Error('Não foi possível excluir.');return {success:true};});
