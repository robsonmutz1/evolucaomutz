import { describe, expect, it } from 'vitest';
import { mensalidadeDaPlanilha, pagaAtualmente, statusDaPlanilha } from './importacao';

describe('regras informadas por Robson para importação', () => {
  it('azul é formado e não paga mais', () => {
    expect(statusDaPlanilha('FF00B0F0')).toBe('Concluído');
    expect(pagaAtualmente(statusDaPlanilha('FF00B0F0'))).toBe(false);
  });
  it('vermelho é cancelado e não paga', () => {
    expect(statusDaPlanilha('FFFF0000')).toBe('Cancelado');
    expect(pagaAtualmente(statusDaPlanilha('FFFF0000'))).toBe(false);
  });
  it('sem cor é ativo atualmente', () => {
    expect(statusDaPlanilha('00000000')).toBe('Ativo');
    expect(pagaAtualmente(statusDaPlanilha(null))).toBe(true);
  });
  it('VALORES é a mensalidade e não deve ser dividida', () => {
    expect(mensalidadeDaPlanilha(180)).toBe(180);
  });
  it('mensalidade ausente não significa gratuita', () => {
    expect(mensalidadeDaPlanilha(null)).toBeNull();
  });
});