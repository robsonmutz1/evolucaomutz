import { createServerFn } from '@tanstack/react-start';
import { queryOptions } from '@tanstack/react-query';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { validarMes, validarRegistro, type RegistroFinanceiro } from './financeiro';
import { financialRecordWrite } from './write-fields';
import { calcularFaturamento } from './faturamento';

export const listarFaturamento = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc('faturamento_listar');
    if (error) throw new Error('Não foi possível carregar o faturamento.');
    return data.map((r) => calcularFaturamento({ mes: r.mes, valor_registrado: r.valor_registrado === null ? null : Number(r.valor_registrado), entradas_base: r.entradas_base === null ? null : Number(r.entradas_base), entradas_atual: Number(r.entradas_atual) }));
  });

export const faturamentoQuery = queryOptions({ queryKey: ['school', 'faturamento'], queryFn: () => listarFaturamento(), staleTime: 0, refetchInterval: 30_000 });

export const salvarFaturamento = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { mes: string; valor: number; anterior?: string | undefined }) => {
    validarMes(i.mes);
    if (!Number.isFinite(i.valor) || i.valor < 0) throw new Error('Informe um valor válido.');
    return i;
  })
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc('faturamento_salvar', { p_mes: data.mes, p_valor: data.valor, ...(data.anterior ? { p_anterior: data.anterior } : {}) });
    if (error) throw new Error('Não foi possível salvar o faturamento.');
    return { success: true };
  });

export const excluirFaturamento = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { mes: string }) => { validarMes(i.mes); return i; })
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from('faturamento_mensal').delete().eq('mes', data.mes);
    if (error) throw new Error('Não foi possível excluir.');
    return { success: true };
  });

export const listarRegistros = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from('financeiro_registros')
      .select('id,tipo,descricao,categoria,data,valor,quantidade,observacoes').order('data', { ascending: false, nullsFirst: false }).limit(2000);
    if (error) throw new Error('Não foi possível carregar os registros.');
    return data.map((r) => ({ ...r, tipo: r.tipo as RegistroFinanceiro['tipo'], valor: r.valor === null ? null : Number(r.valor) })) as RegistroFinanceiro[];
  });

export const registrosQuery = queryOptions({ queryKey: ['school', 'financeiro'], queryFn: () => listarRegistros(), staleTime: 60_000 });

export const salvarRegistro = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: RegistroFinanceiro) => validarRegistro(i))
  .handler(async ({ context, data }) => {
    const { id, ...row } = financialRecordWrite(data);
    const { error } = id
      ? await context.supabase.from('financeiro_registros').update(row).eq('id', id)
      : await context.supabase.from('financeiro_registros').insert(row);
    if (error) throw new Error('Não foi possível salvar o registro.');
    return { success: true };
  });

export const excluirRegistro = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from('financeiro_registros').delete().eq('id', data.id);
    if (error) throw new Error('Não foi possível excluir.');
    return { success: true };
  });
