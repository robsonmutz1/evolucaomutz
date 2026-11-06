import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { validarLead, chaveTelefone, type Lead, type Interacao } from './crm';

export const listarCRM = createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async ({context}) => {
 const leads: Lead[] = [];
 for (let start=0;;start+=500) {
  const {data,error}=await context.supabase.from('leads').select('*').order('created_at',{ascending:false}).order('id').range(start,start+499);
  if(error) throw new Error('Não foi possível carregar o CRM.');
  leads.push(...data); if(data.length<500) break;
 }
 const {data:consultores,error}=await context.supabase.rpc('crm_consultores');
 if(error) throw new Error('Não foi possível carregar os consultores.');
 return {leads,consultores:consultores??[]};
});
export const salvarLead = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((l:Lead)=>validarLead(l)).handler(async ({context,data})=>{
 const {created_at,...row}=data;
 const {data:salvo,error}=await context.supabase.from('leads').upsert(row).select().single();
 if(error) throw new Error(error.code==='23505' ? 'Já existe um lead com esse telefone.' : error.code==='P0001' ? error.message : 'Não foi possível salvar o lead.');
 return salvo;
});
export const verificarTelefoneCRM = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:{telefone:string;id:string})=>i).handler(async ({context,data})=>{
 const key=chaveTelefone(data.telefone);
 if(key.length!==10) return null;
 for(let start=0;;start+=500){
  const {data:rows,error}=await context.supabase.from('leads').select('id,telefone,nome_responsavel').order('id').range(start,start+499);
  if(error) throw new Error('Não foi possível verificar o telefone.');
  const found=rows.find(l=>l.id!==data.id&&chaveTelefone(l.telefone)===key);
  if(found) return `Já existe um lead com esse telefone: ${found.nome_responsavel}.`;
  if(rows.length<500)break;
 }
 for(let start=0;;start+=500){
  const {data:rows,error}=await context.supabase.from('alunos').select('nome,status,telefone,telefoneResponsavel').order('id').range(start,start+499);
  if(error) throw new Error('Não foi possível verificar o telefone.');
  const found=rows.find(a=>[a.telefone,a.telefoneResponsavel].some(t=>!!t&&chaveTelefone(t)===key));
  if(found) return `${found.status==='Ativo'?'Essa pessoa já é aluna':'Telefone de aluno cadastrado'}: ${found.nome}.`;
  if(rows.length<500)break;
 }
 return null;
});
export const historicoLead = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:{id:string})=>i).handler(async ({context,data})=>{
 const rows: Interacao[]=[];
 for(let start=0;;start+=500){
 const {data:page,error}=await context.supabase.from('lead_interacoes').select('*').eq('lead_id',data.id).order('created_at',{ascending:false}).order('id').range(start,start+499);
 if(error)throw new Error('Não foi possível carregar o histórico.');
 rows.push(...page);if(page.length<500)break;
 } return rows;
});
export const registrarContatoCRM = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:{id:string;tipo:string;descricao:string;proximo:string})=>{
 if(!i.descricao.trim())throw new Error('Descreva o contato.');return i;
}).handler(async ({context,data})=>{
 const {error}=await context.supabase.rpc('crm_registrar_contato',{p_lead_id:data.id,p_tipo:data.tipo,p_descricao:data.descricao,...(data.proximo ? {p_proximo:data.proximo} : {})});
 if(error)throw new Error('Não foi possível registrar o contato.');return {success:true};
});