export type FonteFaturamento = { mes: string; valor_registrado: number | null; entradas_base: number | null; entradas_atual: number };

/** Historical corrections are offsets, not a second copy of cash income. */
export function calcularFaturamento(r: FonteFaturamento) {
  const ajuste = r.valor_registrado === null ? 0 : Math.round(r.valor_registrado * 100) - Math.round((r.entradas_base ?? 0) * 100);
  return { mes: r.mes, valor: (Math.round(r.entradas_atual * 100) + ajuste) / 100, entradas: r.entradas_atual, ajuste: ajuste / 100, registrado: r.valor_registrado !== null };
}