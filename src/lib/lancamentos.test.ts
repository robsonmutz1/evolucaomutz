import { describe, expect, it } from 'vitest';
import { totalPorTipo, validarLancamento } from './lancamentos';

const l = (mes: string, tipo: 'entrada' | 'saida', valor: number) => ({ mes, tipo, grupo: '', categoria: 'x', valor, descricao: null });

describe('lancamentos', () => {
  it('soma só as saídas do mês', () => expect(totalPorTipo([l('2025-01', 'saida', 10), l('2025-01', 'entrada', 99), l('2025-02', 'saida', 5)], 'saida', '2025-01')).toBe(10));
  it('soma o ano inteiro', () => expect(totalPorTipo([l('2025-01', 'saida', 10), l('2025-12', 'saida', 5)], 'saida', '2025')).toBe(15));
  it('sem lançamentos é desconhecido, não zero', () => expect(totalPorTipo([], 'saida', '2025')).toBeNull());
  it('rejeita valor negativo', () => expect(() => validarLancamento(l('2025-01', 'saida', -1))).toThrow());
});
