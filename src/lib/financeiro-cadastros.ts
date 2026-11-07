import type { Database } from '@/integrations/supabase/types';
export type GrupoFinanceiro=Database['public']['Tables']['financeiro_grupos']['Row'];
export type CategoriaFinanceira=Database['public']['Tables']['financeiro_categorias']['Row'];
export type ItemFinanceiro=GrupoFinanceiro & {grupo_id?:string|null};
export function nomeChave(n:string){return n.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toLowerCase();}
export function hojeFinanceiro(d=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(d);}
export function dataValida(s:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(`${s}T12:00:00Z`);return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s;}
export function tipoPermitido(item:ItemFinanceiro,tipo:'entrada'|'saida'){return item.tipo==='Ambos'||item.tipo===(tipo==='entrada'?'Entrada':'Saída');}