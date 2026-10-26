import { createServerFn } from '@tanstack/react-start';
import { queryOptions } from '@tanstack/react-query';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const listarFaturamento = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from('faturamento_mensal').select('mes,valor').order('mes');
    if (error) throw new Error('Não foi possível carregar o faturamento.');
    return data.map((r) => ({ mes: r.mes, valor: Number(r.valor) }));
  });

export const faturamentoQuery = queryOptions({ queryKey: ['school', 'faturamento'], queryFn: () => listarFaturamento(), staleTime: 60_000 });
