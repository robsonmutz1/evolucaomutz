import { describe, expect, it } from 'vitest';
import { alunosDoRelatorio, gerarCsv, horizontes, projetarFaturamento, totalAnual } from './relatorios';
import type { Aluno } from './alunos';

describe('Faturamento e projeções', () => {
  const receitas = [{ mes: '2025-12', valor: 90 }, { mes: '2026-01', valor: 120 }, { mes: '2026-02', valor: 150 }, { mes: '2026-03', valor: 900 }];
  it('soma o ano inteiro independentemente do filtro mensal', () => {
    expect(totalAnual(receitas, '2026')).toBe(1170);
    expect(totalAnual(receitas, '2025')).toBe(90);
    expect(totalAnual(receitas, '2027')).toBeNull();
  });
  it('projeta os cinco prazos solicitados sem usar o mês incompleto', () => {
    const p = projetarFaturamento(receitas, '2026-03');
    expect(horizontes).toEqual([1, 3, 6, 9, 12]);
    expect(p?.totais.map((t) => t.valor)).toEqual([120, 360, 720, 1080, 1440]);
    expect(p?.mensal[0]?.mes).toBe('2026-04');
    expect(p?.mensal[11]?.mes).toBe('2027-03');
  });
  it('preserva dados ausentes e exige três meses conhecidos', () => {
    expect(projetarFaturamento(receitas.slice(0, 2), '2026-03')).toBeNull();
    expect(projetarFaturamento([{ mes: '2025-01', valor: 0 }, { mes: '2025-03', valor: 300 }, { mes: '2025-09', valor: 600 }], '2026-01')?.media).toBe(300);
  });
});

describe('Relatórios de alunos', () => {
  const alunos = [
    { nome: 'A', status: 'Ativo', curso: 'INFO', turma: 'A', dataMatricula: '2026-01-01' },
    { nome: 'B', status: 'Cancelado', curso: 'INFO', turma: 'A', dataMatricula: '2025-01-01', dataStatus: '2026-03-31' },
    { nome: 'C', status: 'Cancelado', curso: 'INFO', turma: 'A', dataStatus: undefined },
    { nome: 'D', status: 'Concluído', curso: 'INFO', turma: 'B', dataStatus: '2026-04-01' },
  ] as Aluno[];
  it('conta matrículas e ativos pela matrícula no período', () => {
    expect(alunosDoRelatorio(alunos, 'matriculas', '2026-01-01', '2026-12-31').alunos.map((a) => a.nome)).toEqual(['A']);
    expect(alunosDoRelatorio(alunos, 'ativos', '2026-01-01', '2026-12-31', 'INFO', 'A').alunos.map((a) => a.nome)).toEqual(['A']);
  });
  it('usa datas de cancelamento e não inventa datas ausentes', () => {
    const r = alunosDoRelatorio(alunos, 'cancelamentos', '2026-03-01', '2026-03-31');
    expect(r.alunos.map((a) => a.nome)).toEqual(['B']);
    expect(r.semData).toBe(1);
  });
  it('usa datas de conclusão para formados', () => {
    expect(alunosDoRelatorio(alunos, 'formados', '2026-04-01', '2026-04-30').alunos.map((a) => a.nome)).toEqual(['D']);
  });
  it('protege a exportação de fórmulas e preserva valores desconhecidos', () => {
    expect(gerarCsv([['=1+1', null, 'a"b']])).toBe('\uFEFF"\'=1+1";"Não informado";"a""b"');
  });
});