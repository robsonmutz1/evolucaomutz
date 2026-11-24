import { describe, expect, it } from 'vitest';
import { gerarVencimentos, statusConta } from './contas-pagar';

describe('contas a pagar', () => {
  it('repete o mesmo dia todo mês, ajustando meses curtos', () => {
    expect(gerarVencimentos('2026-11-05', 3)).toEqual(['2026-11-05', '2026-12-05', '2027-01-05']);
    expect(gerarVencimentos('2027-01-31', 2)).toEqual(['2027-01-31', '2027-02-28']);
  });
  it('classifica a situação pelo vencimento', () => {
    expect(statusConta({ situacao: 'aberta', vencimento: '2026-11-01' }, '2026-11-24')).toBe('atrasada');
    expect(statusConta({ situacao: 'aberta', vencimento: '2026-11-24' }, '2026-11-24')).toBe('hoje');
    expect(statusConta({ situacao: 'aberta', vencimento: '2026-12-01' }, '2026-11-24')).toBe('a_vencer');
    expect(statusConta({ situacao: 'paga', vencimento: '2026-11-01' }, '2026-11-24')).toBe('paga');
  });
});
