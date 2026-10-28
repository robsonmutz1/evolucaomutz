import { describe, expect, it } from 'vitest';
import { totalConhecido, validarMes, validarRegistro } from './financeiro';

const base = { tipo: 'despesa' as const, descricao: 'Luz', categoria: '', data: null, valor: 100, quantidade: null, observacoes: null };

describe('financeiro', () => {
  it('rejeita mês 13', () => expect(() => validarMes('2026-13')).toThrow());
  it('aceita mês 2026-10', () => expect(() => validarMes('2026-10')).not.toThrow());
  it('rejeita valor negativo', () => expect(() => validarRegistro({ ...base, valor: -1 })).toThrow());
  it('não soma valores desconhecidos como zero', () => expect(totalConhecido([{ ...base, valor: null }])).toBeNull());
  it('produto multiplica pela quantidade', () => expect(totalConhecido([{ ...base, tipo: 'produto', valor: 10, quantidade: 3 }])).toBe(30));
});
