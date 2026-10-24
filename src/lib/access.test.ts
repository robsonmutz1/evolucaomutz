import { expect, it } from 'vitest';
import { acessoPermitido } from './access';

it('only explicitly granted owner can access school records', () => {
  expect(acessoPermitido([{ role: 'owner' }])).toBe(true);
  expect(acessoPermitido([{ role: 'user' }])).toBe(false);
  expect(acessoPermitido([])).toBe(false);
  expect(acessoPermitido(null)).toBe(false);
});