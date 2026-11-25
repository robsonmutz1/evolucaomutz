// Run against the authorized environment after correcting the requested payment.
// Credentials are supplied only through environment variables, never stored here.
import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

const url = process.env['TEST_API_URL'];
const key = process.env['TEST_API_KEY'];
const token = process.env['TEST_ACCESS_TOKEN'];
const configured = Boolean(url && key && token);
const client = url && key && token ? createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { Authorization: `Bearer ${token}` } },
}) : null;
const id = 'a2acc614-b7fe-46d0-8928-1d7f433ebf83';

describe.skipIf(!configured)('correção autorizada da data do prestador', () => {
  it('mantém saída, caixa e recibo em 03/11/2026, com aulas de outubro e R$ 1.884', async () => {
    if (!client) throw new Error('Missing test session');
    const cash = await client.from('lancamentos').select('data_lancamento,data_pagamento,mes,valor,tipo').eq('id', id).single();
    const payment = await client.from('prestador_pagamentos').select('data_pagamento,mes,valor,passagens_qtd').eq('lancamento_id', id).single();
    expect(cash.error).toBeNull();
    expect(payment.error).toBeNull();
    expect(cash.data).toEqual({ data_lancamento: '2026-11-03', data_pagamento: '2026-11-03', mes: '2026-11', valor: 1884, tipo: 'saida' });
    expect(payment.data).toEqual({ data_pagamento: '2026-11-03', mes: '2026-10', valor: 1884, passagens_qtd: 40 });
  });

  it('não permite modificar o valor de um pagamento já registrado', async () => {
    if (!client) throw new Error('Missing test session');
    const attempt = await client.rpc('caixa_salvar_lancamento', { p_row: { id, valor: 1885 } });
    expect(attempt.error?.code).toBe('P0001');
    const after = await client.from('lancamentos').select('valor').eq('id', id).single();
    expect(after.error).toBeNull();
    expect(after.data?.valor).toBe(1884);
  });
});