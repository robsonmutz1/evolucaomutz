import { describe, expect, it } from 'vitest';
import { calcularFaturamento } from './faturamento';

describe('faturamento automático', () => {
  it('cria um mês novo com as entradas financeiras recebidas', () => {
    expect(calcularFaturamento({ mes: '2026-11', valor_registrado: null, entradas_base: null, entradas_atual: 350 }).valor).toBe(350);
  });
  it('preserva uma correção histórica sem duplicar entradas', () => {
    expect(calcularFaturamento({ mes: '2023-03', valor_registrado: 14838.97, entradas_base: 14980.76, entradas_atual: 14980.76 }).valor).toBe(14838.97);
  });
  it('acrescenta novas baixas mesmo em mês editado', () => {
    expect(calcularFaturamento({ mes: '2026-11', valor_registrado: 400, entradas_base: 350, entradas_atual: 450 }).valor).toBe(500);
  });
  it('reduz o mês quando um recebimento é excluído ou estornado', () => {
    expect(calcularFaturamento({ mes: '2026-11', valor_registrado: 400, entradas_base: 350, entradas_atual: 250 }).valor).toBe(300);
  });
  it('trabalha em centavos para preservar os valores', () => {
    expect(calcularFaturamento({ mes: '2026-11', valor_registrado: 0.3, entradas_base: 0.2, entradas_atual: 0.3 }).valor).toBe(0.4);
  });
});