import { describe, expect, it } from 'vitest';
import { paginaAlunos, quantidadeAlunos, quantidadePadraoAlunos } from './visualizacao-alunos';

describe('visualização de alunos', () => {
  const rows = Array.from({ length: 65 }, (_, i) => i + 1);
  it('exibe 20 alunos por padrão', () => {
    expect(quantidadePadraoAlunos).toBe(20);
    expect(paginaAlunos(rows, 1, quantidadePadraoAlunos).itens).toEqual(rows.slice(0, 20));
  });
  it('aceita uma quantidade personalizada', () => {
    expect(quantidadeAlunos('35')).toBe(35);
    expect(paginaAlunos(rows, 2, 35).itens).toEqual(rows.slice(35));
  });
  it('não perde nem repete alunos ao avançar', () => {
    expect([1, 2, 3, 4].flatMap(p => paginaAlunos(rows, p, 20).itens)).toEqual(rows);
  });
  it('ajusta a página quando filtros reduzem a lista', () => {
    expect(paginaAlunos([7, 8], 4, 20)).toMatchObject({ itens: [7, 8], atual: 1, paginas: 1 });
  });
  it('restaura 20 para uma preferência inválida', () => {
    for (const v of [null, '', 0, -1, 1.5, 'abc', 501]) expect(quantidadeAlunos(v)).toBe(20);
  });
});