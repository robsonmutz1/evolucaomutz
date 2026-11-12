import { createServerFn } from '@tanstack/react-start';
import { queryOptions } from '@tanstack/react-query';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { validarLancamento, type Lancamento } from './lancamentos';

export const listarLancamentos = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const out: Lancamento[] = [];
    for (let de = 0; ; de += 1000) {
      const { data, error } = await context.supabase.from('lancamentos')
        .select('id,mes,data_lancamento,tipo,grupo,categoria,valor,descricao,conta_id,situacao,data_pagamento,aluno_id,referencia_mensalidade,transferencia_id,created_at,updated_at').order('data_lancamento', { ascending: false }).order('id').range(de, de + 999);
      if (error) throw new Error('Não foi possível carregar os lançamentos.');
      out.push(...data.map((r) => ({ ...r, tipo: r.tipo as Lancamento['tipo'], situacao: r.situacao as NonNullable<Lancamento['situacao']>, valor: Number(r.valor) })));
      if (data.length < 1000) break;
    }
    return out;
  });

export const lancamentosQuery = queryOptions({ queryKey: ['school', 'lancamentos'], queryFn: () => listarLancamentos(), staleTime: 60_000 });

export const salvarLancamento = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: Lancamento) => validarLancamento(i))
  .handler(async ({ context, data }) => {
    const {confirmar_caixa,created_at,updated_at,transferencia_id,...row}=data;
    const {error}=await context.supabase.rpc('caixa_salvar_lancamento',{p_row:row,p_confirmar:confirmar_caixa??false});
    if (error) throw new Error(error.code==='P0001'?error.message:'Não foi possível salvar o lançamento.');
    return { success: true };
  });

export const excluirLancamento = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; confirmar_caixa?:boolean }) => i)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc('caixa_salvar_lancamento',{p_row:{id:data.id},p_excluir:true,p_confirmar:data.confirmar_caixa??false});
    if (error) throw new Error(error.code==='P0001'?error.message:'Não foi possível excluir.');
    return { success: true };
  });
