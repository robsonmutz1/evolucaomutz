import { createServerFn } from '@tanstack/react-start';
import { queryOptions } from '@tanstack/react-query';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { dataValida } from './financeiro-cadastros';
import { gerarVencimentos, type ContaPagar } from './contas-pagar';

const msg = (e: { code?: string; message: string }, f: string) => (e.code === 'P0001' ? e.message : f);

export const listarContasPagar = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const out: ContaPagar[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await context.supabase.from('contas_pagar').select('*').order('vencimento').order('id').range(de, de + 999);
    if (error) throw new Error('Não foi possível carregar as contas a pagar.');
    out.push(...(data as ContaPagar[]));
    if (data.length < 1000) break;
  }
  return out;
});
export const contasPagarQuery = queryOptions({ queryKey: ['school', 'contas-pagar'], queryFn: () => listarContasPagar(), staleTime: 30000 });

type Novo = { descricao: string; grupo: string; categoria: string; valor: number; vencimento: string; parcelas: number; observacao: string };
export const criarContaPagar = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((i: Novo) => {
    if (!i.descricao.trim() || !Number.isFinite(i.valor) || i.valor <= 0 || !dataValida(i.vencimento) || !Number.isInteger(i.parcelas) || i.parcelas < 1 || i.parcelas > 60) throw new Error('Informe descrição, valor, vencimento e repetições (1 a 60).');
    return i;
  })
  .handler(async ({ context, data }) => {
    const rec = data.parcelas > 1 ? crypto.randomUUID() : null;
    const rows = gerarVencimentos(data.vencimento, data.parcelas).map((v, i) => ({ descricao: data.descricao.trim(), grupo: data.grupo, categoria: data.categoria, valor: Math.round(data.valor * 100) / 100, vencimento: v, observacao: data.observacao || null, recorrencia_id: rec, parcela: rec ? i + 1 : null, total_parcelas: rec ? data.parcelas : null }));
    const { error } = await context.supabase.from('contas_pagar').insert(rows);
    if (error) throw new Error(msg(error, 'Não foi possível salvar a conta.'));
    return { criadas: rows.length };
  });

export const editarContaPagar = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; descricao: string; grupo: string; categoria: string; valor: number; vencimento: string; observacao: string; futuras: boolean }) => {
    if (!i.descricao.trim() || !Number.isFinite(i.valor) || i.valor <= 0 || !dataValida(i.vencimento)) throw new Error('Informe descrição, valor e vencimento válidos.');
    return i;
  })
  .handler(async ({ context, data }) => {
    const base = { descricao: data.descricao.trim(), grupo: data.grupo, categoria: data.categoria, valor: Math.round(data.valor * 100) / 100, observacao: data.observacao || null };
    const { data: atual, error: e0 } = await context.supabase.from('contas_pagar').select('recorrencia_id,vencimento').eq('id', data.id).single();
    if (e0) throw new Error('Conta não encontrada.');
    const { error } = await context.supabase.from('contas_pagar').update({ ...base, vencimento: data.vencimento }).eq('id', data.id);
    if (error) throw new Error(msg(error, 'Não foi possível salvar.'));
    if (data.futuras && atual.recorrencia_id) {
      const r = await context.supabase.from('contas_pagar').update(base).eq('recorrencia_id', atual.recorrencia_id).eq('situacao', 'aberta').gt('vencimento', atual.vencimento);
      if (r.error) throw new Error(msg(r.error, 'Não foi possível atualizar as próximas.'));
    }
    return { success: true };
  });

export const excluirContaPagar = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; futuras: boolean }) => i)
  .handler(async ({ context, data }) => {
    const { data: atual, error: e0 } = await context.supabase.from('contas_pagar').select('recorrencia_id,vencimento').eq('id', data.id).single();
    if (e0) throw new Error('Conta não encontrada.');
    const q = context.supabase.from('contas_pagar').delete();
    const { error } = data.futuras && atual.recorrencia_id ? await q.eq('recorrencia_id', atual.recorrencia_id).eq('situacao', 'aberta').gte('vencimento', atual.vencimento) : await q.eq('id', data.id);
    if (error) throw new Error(msg(error, 'Não foi possível excluir.'));
    return { success: true };
  });

export const pagarContaPagar = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; data: string; valor: number; conta_id: string }) => {
    if (!dataValida(i.data) || !Number.isFinite(i.valor) || i.valor <= 0 || !i.conta_id) throw new Error('Informe data, valor e conta.');
    return i;
  })
  .handler(async ({ context, data }) => {
    const { data: id, error } = await context.supabase.rpc('conta_pagar_baixar', { p_id: data.id, p_data: data.data, p_valor: Math.round(data.valor * 100) / 100, p_conta: data.conta_id });
    if (error) throw new Error(msg(error, 'Não foi possível registrar o pagamento.'));
    return id;
  });

export const estornarContaPagar = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc('conta_pagar_estornar', { p_id: data.id });
    if (error) throw new Error(msg(error, 'Não foi possível estornar.'));
    return { success: true };
  });
