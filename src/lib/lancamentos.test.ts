import { describe, expect, it } from 'vitest';
import { totalPorTipo, validarLancamento } from './lancamentos';
import { dataValida, hojeFinanceiro, nomeChave, tipoPermitido } from './financeiro-cadastros';

const l = (mes: string, tipo: 'entrada' | 'saida', valor: number) => ({ mes, tipo, grupo: '', categoria: 'x', valor, descricao: null });

describe('lancamentos', () => {
  it('soma só as saídas do mês', () => expect(totalPorTipo([l('2025-01', 'saida', 10), l('2025-01', 'entrada', 99), l('2025-02', 'saida', 5)], 'saida', '2025-01')).toBe(10));
  it('soma o ano inteiro', () => expect(totalPorTipo([l('2025-01', 'saida', 10), l('2025-12', 'saida', 5)], 'saida', '2025')).toBe(15));
  it('sem lançamentos é desconhecido, não zero', () => expect(totalPorTipo([], 'saida', '2025')).toBeNull());
  it('rejeita valor negativo', () => expect(() => validarLancamento(l('2025-01', 'saida', -1))).toThrow());
  it('deriva mês da data escolhida e mantém valor',()=>{const r=validarLancamento({...l('2025-01','saida',25),data_lancamento:'2026-11-06'});expect(r.mes).toBe('2026-11');expect(r.valor).toBe(25);});
  it('dia atual considera Brasília à noite',()=>expect(hojeFinanceiro(new Date('2026-11-07T00:06:00Z'))).toBe('2026-11-06'));
  it('permite passado e futuro mas rejeita datas inexistentes',()=>{expect(dataValida('2023-01-01')).toBe(true);expect(dataValida('2030-12-31')).toBe(true);expect(dataValida('2026-02-30')).toBe(false);});
  it('normaliza acentos, caixa e espaços sem duplicar',()=>expect(nomeChave('  ALIMENTAÇÃO   funcionários ')).toBe(nomeChave('alimentacao funcionarios')));
  it('filtra Entrada Saída e Ambos',()=>{const base={id:'a',nome:'Teste',tipo:'Entrada',ativo:true,created_at:''};expect(tipoPermitido(base,'entrada')).toBe(true);expect(tipoPermitido(base,'saida')).toBe(false);expect(tipoPermitido({...base,tipo:'Ambos'},'saida')).toBe(true);});
  it('totais mensais e anuais continuam iguais com datas antigas no dia 1',()=>{const rows=[{...l('2025-01','saida',10),data_lancamento:'2025-01-01'},{...l('2025-12','saida',5),data_lancamento:'2025-12-01'}];expect(totalPorTipo(rows,'saida','2025')).toBe(15);expect(totalPorTipo(rows,'saida','2025-01')).toBe(10);});
});
