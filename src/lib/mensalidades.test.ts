import { describe, expect, it } from 'vitest';
import { diaSeguinteAoDesconto, gerarParcelas, gerarParcelasExtras, valorSugerido, valorParaBaixa, valorComDesconto, vencimentoNoMes, origensDosUltimos } from './mensalidades';
const desc = { descontoTipo: 'percentual' as const, desconto: 10, diaLimiteDesconto: 5 };
describe('mensalidades', () => {
  it('adiciona parcelas de outro curso sem substituir as mensalidades de informática de 150', () => {
    const original = gerarParcelas({ primeiraCobranca: '2026-11', qtd: 3, dia: 11, valor: 150 });
    const extras = gerarParcelasExtras({ primeiroVencimento: '2026-11-16', qtd: 2, valor: 80 });
    expect(original.map((p) => p.valor)).toEqual([150, 150, 150]);
    expect([...original, ...extras].filter((p) => p.referencia === '2026-11').map((p) => p.valor)).toEqual([150, 80]);
    expect(extras.map((p) => [p.tipo, p.vencimento])).toEqual([['mensalidade', '2026-11-16'], ['mensalidade', '2026-12-16']]);
  });
  it('extras ajustam o último dia do mês e não criam outra matrícula', () => {
    expect(gerarParcelasExtras({ primeiroVencimento: '2027-01-31', qtd: 2, valor: 80.50 }).map((p) => [p.tipo, p.vencimento, p.valor])).toEqual([['mensalidade', '2027-01-31', 80.5], ['mensalidade', '2027-02-28', 80.5]]);
  });
  it('rejeita extras com data impossível ou quantidade fracionada', () => {
    expect(() => gerarParcelasExtras({ primeiroVencimento: '2027-02-30', qtd: 2, valor: 80 })).toThrow();
    expect(() => gerarParcelasExtras({ primeiroVencimento: '2027-02-28', qtd: 1.5, valor: 80 })).toThrow();
  });
  it('sugere vencimento no dia seguinte ao limite do desconto', () => {
    expect(diaSeguinteAoDesconto(10)).toBe(11);
    expect(diaSeguinteAoDesconto(15)).toBe(16);
    for (let dia = 1; dia < 31; dia++) expect(diaSeguinteAoDesconto(dia)).toBe(dia + 1);
    expect(diaSeguinteAoDesconto(31)).toBe(1);
    expect(diaSeguinteAoDesconto(0)).toBeNull();
    expect(diaSeguinteAoDesconto(32)).toBeNull();
  });
  it('gera parcelas com valor cheio e matrícula separada', () => {
    const p = gerarParcelas({ primeiraCobranca: '2026-11', qtd: 3, dia: 10, valor: 200, valorMatricula: 50, dataMatricula: '2026-11-03' });
    expect(p.map((x) => [x.tipo, x.vencimento, x.valor])).toEqual([['matricula', '2026-11-03', 50], ['mensalidade', '2026-11-10', 200], ['mensalidade', '2026-12-10', 200], ['mensalidade', '2027-01-10', 200]]);
  });
  it('vencimento dia 31 em fevereiro cai no último dia', () => { expect(vencimentoNoMes('2027-02', 31)).toBe('2027-02-28'); });
  it('desconto só até o dia limite', () => {
    const p = { tipo: 'mensalidade' as const, referencia: '2026-12', valor: 200 };
    expect(valorSugerido(p, desc, '2026-12-05')).toBe(180);
    expect(valorSugerido(p, desc, '2026-12-06')).toBe(200);
  });
  it('matrícula recebe desconto até o dia limite', () => {
    expect(valorSugerido({ tipo: 'matricula', referencia: '2026-12', valor: 200 }, { descontoTipo: 'valor', desconto: 50, diaLimiteDesconto: 5 }, '2026-12-05')).toBe(150);
    expect(valorSugerido({ tipo: 'matricula', referencia: '2026-12', valor: 200 }, { descontoTipo: 'valor', desconto: 50, diaLimiteDesconto: 5 }, '2026-12-06')).toBe(200);
  });
  it('desconto termina no dia limite, mesmo com vencimento no dia seguinte', () => {
    expect(valorParaBaixa({ tipo: 'mensalidade', referencia: '2026-12', vencimento: '2026-12-06', valor: 200 }, desc, '2026-12-06')).toBe(200);
  });
  it('valor com desconto em 1 clique ignora a data', () => { expect(valorComDesconto({ valor: 200 }, desc)).toBe(180); });
  it('baixa antecipada usa o desconto percentual do contrato', () => {
    expect(valorParaBaixa({ tipo: 'mensalidade', referencia: '2026-12', vencimento: '2026-12-06', valor: 200 }, desc, '2026-11-03')).toBe(180);
  });
  it('desconto em reais inclui o dia limite e acaba no dia seguinte', () => {
    const p = { tipo: 'mensalidade' as const, referencia: '2026-12', vencimento: '2026-12-11', valor: 200 };
    const a = { descontoTipo: 'valor' as const, desconto: 20, diaLimiteDesconto: 10 };
    expect(valorParaBaixa(p, a, '2026-12-10')).toBe(180);
    expect(valorParaBaixa(p, a, '2026-12-11')).toBe(200);
    expect(valorParaBaixa(p, a, '2026-12-12')).toBe(204.07);
  });
  it('prazo do desconto prevalece sobre vencimento renegociado', () => {
    expect(valorParaBaixa({ tipo: 'mensalidade', referencia: '2026-12', vencimento: '2026-12-01', valor: 200 }, desc, '2026-12-05')).toBe(180);
  });
  it('não inventa desconto quando não configurado', () => {
    expect(valorParaBaixa({ tipo: 'mensalidade', referencia: '2026-12', vencimento: '2026-12-06', valor: 200 }, undefined, '2026-11-03')).toBe(200);
  });
  it('conta origens dos últimos N alunos no período', () => {
    const al = [{ dataMatricula: '2026-01-01', origem_lead: 'Vídeo' }, { dataMatricula: '2026-02-01', origem_lead: 'Vídeo' }, { dataMatricula: '2026-03-01', origem_lead: 'Google' }, { dataMatricula: '2025-12-01', origem_lead: 'Vídeo' }];
    const r = origensDosUltimos(al, 2, '2026-01-01', '2026-12-31');
    expect(r.total).toBe(2); expect(r.linhas).toEqual([{ origem: 'Google', qtd: 1, pct: 50 }, { origem: 'Vídeo', qtd: 1, pct: 50 }]);
  });
});

import { valorComAtraso as vca } from './mensalidades';
import { describe as d2, it as i2, expect as e2 } from 'vitest';
d2('juros de atraso', () => {
  i2('sem atraso mantém valor', () => e2(vca(150, '2026-10-10', '2026-10-10')).toBe(150));
  i2('2% multa + 1% ao mês pro rata', () => e2(vca(150, '2026-10-10', '2026-11-09')).toBe(154.5));
  i2('um dia de atraso', () => e2(vca(100, '2026-10-10', '2026-10-11')).toBe(102.03));
});
