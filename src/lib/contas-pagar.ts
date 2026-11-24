export type ContaPagar = { id: string; descricao: string; grupo: string; categoria: string; valor: number; vencimento: string; recorrencia_id: string | null; parcela: number | null; total_parcelas: number | null; situacao: 'aberta' | 'paga'; data_pagamento: string | null; valor_pago: number | null; conta_id: string | null; lancamento_id: string | null; observacao: string | null; created_at: string };
export type StatusConta = 'paga' | 'atrasada' | 'hoje' | 'a_vencer';

/** Monthly due dates starting at `primeiro`, keeping the day and clamping to the month's last day. */
export function gerarVencimentos(primeiro: string, qtd: number): string[] {
  const [y, m, d] = primeiro.split('-').map(Number) as [number, number, number];
  return Array.from({ length: qtd }, (_, i) => {
    const ano = y + Math.floor((m - 1 + i) / 12), mes = ((m - 1 + i) % 12) + 1;
    const dia = Math.min(d, new Date(Date.UTC(ano, mes, 0)).getUTCDate());
    return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  });
}

export function statusConta(c: Pick<ContaPagar, 'situacao' | 'vencimento'>, hoje: string): StatusConta {
  if (c.situacao === 'paga') return 'paga';
  if (c.vencimento < hoje) return 'atrasada';
  return c.vencimento === hoje ? 'hoje' : 'a_vencer';
}
