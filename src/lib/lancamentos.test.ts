import { describe, expect, it } from 'vitest';
import { lancamentosPorDia, totalPorTipo, validarLancamento } from './lancamentos';
import { dataValida, hojeFinanceiro, nomeChave, tipoPermitido } from './financeiro-cadastros';

const l = (mes: string, tipo: 'entrada' | 'saida', valor: number) => ({ mes, tipo, grupo: '', categoria: 'x', valor, descricao: null });

describe('lancamentos', () => {
  it('no dia 10 acumula os saldos desde o dia 1 independentemente da ordenação', () => {
    const rows = [
      {...l('2026-11', 'entrada', 150.10), data_lancamento:'2026-11-10'},
      {...l('2026-11', 'saida', 50.15), data_lancamento:'2026-11-05'},
      {...l('2026-11', 'entrada', 170.20), data_lancamento:'2026-11-01'},
    ];
    expect(lancamentosPorDia(rows).map(d => d.acumulado)).toEqual([270.15,120.05,170.20]);
    expect(lancamentosPorDia([...rows].reverse()).map(d => d.acumulado)).toEqual([170.20,120.05,270.15]);
  });
  it('reinicia o valor acumulado no dia 1 de cada mês sem trazer saldo anterior', () => {
    expect(lancamentosPorDia([
      {...l('2026-10','entrada',1000),data_lancamento:'2026-10-31'},
      {...l('2026-11','saida',25),data_lancamento:'2026-11-01'},
      {...l('2026-11','entrada',100),data_lancamento:'2026-11-10'},
    ]).map(d => d.acumulado)).toEqual([1000,-25,75]);
  });
  it('mantém o total desde o dia 1 mesmo quando dias anteriores não estão visíveis', () => {
    const primeiro={...l('2026-11','entrada',150),data_lancamento:'2026-11-01'};
    const decimo={...l('2026-11','saida',50),data_lancamento:'2026-11-10'};
    expect(lancamentosPorDia([decimo],[primeiro,decimo]).map(d => ({saldo:d.saldo,acumulado:d.acumulado})))
      .toEqual([{saldo:-50,acumulado:100}]);
  });
  it('separa os dias mantendo todos os dados e a ordem da lista', () => {
    const rows = [
      {...l('2026-11', 'entrada', 150), data_lancamento: '2026-11-19'},
      {...l('2026-11', 'saida', 50), data_lancamento: '2026-11-19'},
      {...l('2026-11', 'entrada', 170), data_lancamento: '2026-11-18'},
    ];
    const dias = lancamentosPorDia(rows);
    expect(dias.map(d => d.data)).toEqual(['2026-11-19', '2026-11-18']);
    expect(dias.flatMap(d => d.lancamentos)).toEqual(rows);
    expect(lancamentosPorDia([...rows].reverse()).map(d => d.data)).toEqual(['2026-11-18', '2026-11-19']);
  });
  it('soma entradas e saídas separadas e calcula saldo só do dia em centavos', () => {
    const dias = lancamentosPorDia([
      {...l('2026-11', 'entrada', 150.10), data_lancamento: '2026-11-19'},
      {...l('2026-11', 'entrada', 170.20), data_lancamento: '2026-11-19'},
      {...l('2026-11', 'saida', 50.15), data_lancamento: '2026-11-19'},
      {...l('2026-11', 'saida', 10), data_lancamento: '2026-11-18'},
    ]);
    expect(dias.map(({entradas, saidas, saldo}) => ({entradas, saidas, saldo}))).toEqual([
      {entradas: 320.30, saidas: 50.15, saldo: 270.15},
      {entradas: 0, saidas: 10, saldo: -10},
    ]);
  });
  it('usa somente os lançamentos visíveis e preserva a data legada', () => {
    expect(lancamentosPorDia([l('2026-11', 'entrada', 150)]).map(d => ({data:d.data,saldo:d.saldo})))
      .toEqual([{data:'2026-11-01',saldo:150}]);
    expect(lancamentosPorDia([])).toEqual([]);
  });
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
