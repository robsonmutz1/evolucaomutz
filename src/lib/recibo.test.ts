import { describe, expect, it } from 'vitest';
import { totalPagamento, porExtenso, mesSeguinte } from './recibo';
describe('recibo', () => {
  it('soma aulas, passagens e bonificações', () => { expect(totalPagamento(528, 44, 5.1, [{ valor: 50 }])).toBe(802.4); });
  it('passagens são do mês seguinte', () => { expect(mesSeguinte('2026-10')).toBe('2026-11'); expect(mesSeguinte('2026-12')).toBe('2027-01'); });
  it('escreve valor por extenso', () => { expect(porExtenso(802.4)).toBe('oitocentos e dois reais e quarenta centavos'); expect(porExtenso(1528)).toBe('mil quinhentos e vinte e oito reais'); });
});
