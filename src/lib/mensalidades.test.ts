import { describe, expect, it } from 'vitest';
import { gerarParcelas, valorSugerido, vencimentoNoMes, origensDosUltimos } from './mensalidades';
const desc = { descontoTipo: 'percentual' as const, desconto: 10, diaLimiteDesconto: 5 };
describe('mensalidades', () => {
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
  it('matrícula não recebe desconto', () => { expect(valorSugerido({ tipo: 'matricula', referencia: '2026-12', valor: 50 }, desc, '2026-12-01')).toBe(50); });
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
