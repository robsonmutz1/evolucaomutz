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
        .select('id,mes,data_lancamento,tipo,grupo,categoria,valor,descricao').order('data_lancamento', { ascending: false }).order('id').range(de, de + 999);
      if (error) throw new Error('Não foi possível carregar os lançamentos.');
      out.push(...data.map((r) => ({ ...r, tipo: r.tipo as Lancamento['tipo'], valor: Number(r.valor) })));
      if (data.length < 1000) break;
    }
    return out;
  });

export const lancamentosQuery = queryOptions({ queryKey: ['school', 'lancamentos'], queryFn: () => listarLancamentos(), staleTime: 60_000 });

export const salvarLancamento = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: Lancamento) => validarLancamento(i))
  .handler(async ({ context, data }) => {
    const { id, ...row } = data;
    const { error } = id
      ? await context.supabase.from('lancamentos').update(row).eq('id', id)
      : await context.supabase.from('lancamentos').insert(row);
    if (error) throw new Error('Não foi possível salvar o lançamento.');
    return { success: true };
  });

export const excluirLancamento = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from('lancamentos').delete().eq('id', data.id);
    if (error) throw new Error('Não foi possível excluir.');
    return { success: true };
  });
