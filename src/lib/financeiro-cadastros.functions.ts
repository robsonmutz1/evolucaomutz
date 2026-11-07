import { createServerFn } from '@tanstack/react-start';
import { queryOptions } from '@tanstack/react-query';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { nomeChave, type ItemFinanceiro } from './financeiro-cadastros';
export const listarCadastrosFinanceiros=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const grupos:ItemFinanceiro[]=[],categorias:ItemFinanceiro[]=[];
 for(const table of ['financeiro_grupos','financeiro_categorias'] as const){for(let start=0;;start+=500){const {data,error}=await context.supabase.from(table).select('*').order('nome').range(start,start+499);if(error)throw new Error('Não foi possível carregar grupos e categorias.');(table==='financeiro_grupos'?grupos:categorias).push(...data);if(data.length<500)break;}}
 return {grupos,categorias};
});
export const cadastrosFinanceirosQuery=queryOptions({queryKey:['school','financeiro-cadastros'],queryFn:()=>listarCadastrosFinanceiros(),staleTime:30000});
export const salvarCadastroFinanceiro=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:{kind:'grupo'|'categoria';id?:string|undefined;nome:string;tipo:string;ativo:boolean;grupo_id?:string|null|undefined})=>{
 if(!i.nome.trim())throw new Error('Informe o nome.');if(!['Entrada','Saída','Ambos'].includes(i.tipo))throw new Error('Tipo inválido.');return {...i,nome:i.nome.trim().replace(/\s+/g,' ')};
}).handler(async({context,data})=>{
 const table=data.kind==='grupo'?'financeiro_grupos':'financeiro_categorias';
 const row={nome:data.nome,tipo:data.tipo,ativo:data.ativo,...(data.kind==='categoria'?{grupo_id:data.grupo_id??null}:{})};
 const {data:saved,error}=data.id?await context.supabase.from(table).update(row).eq('id',data.id).select().single():await context.supabase.from(table).insert(row).select().single();
 if(error)throw new Error(error.code==='23505'?'Já existe um nome igual, ignorando acentos e maiúsculas.':error.code==='P0001'?error.message:'Não foi possível salvar.');return saved;
});
export const excluirCadastroFinanceiro=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:{kind:'grupo'|'categoria';id:string})=>i).handler(async({context,data})=>{
 const {error}=await context.supabase.from(data.kind==='grupo'?'financeiro_grupos':'financeiro_categorias').delete().eq('id',data.id);
 if(error)throw new Error(error.code==='P0001'?error.message:error.code==='23503'?'Este grupo tem categorias vinculadas. Desative ou altere os vínculos.':'Não foi possível excluir.');return {success:true};
});
export const mesclarCategoriasFinanceiras=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:{origem_id:string;destino_id:string})=>i).handler(async({context,data})=>{
 const {data:n,error}=await context.supabase.rpc('financeiro_mesclar_categorias',data);if(error)throw new Error('Não foi possível mesclar as categorias.');return n;
});