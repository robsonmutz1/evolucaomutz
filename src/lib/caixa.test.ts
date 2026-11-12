import {describe,it,expect} from 'vitest';
import {lerDinheiro,saldoConta,diagnosticarCaixa,diasSemConferencia,type ContaCaixa,type Conferencia} from './caixa';
import type {Lancamento} from './lancamentos';
const c:ContaCaixa={id:'c',user_id:'u',nome:'Banco',tipo:'banco',saldo_inicial:8500,data_saldo_inicial:'2026-01-01',ativa:true,criado_em:''};
const l=(id:string,valor:number,extra:Partial<Lancamento>={}):Lancamento=>({id,mes:'2026-02',data_lancamento:'2026-02-01',data_pagamento:'2026-02-01',tipo:'entrada',grupo:'',categoria:'Mensalidade',descricao:'Pagamento',valor,conta_id:'c',situacao:'realizado',...extra});
describe('caixa',()=>{
 it('saldo informado igual a 8500 não tem diferença',()=>expect(lerDinheiro('8.500,00')-(saldoConta(c,[],'2026-02-01')??0)).toBe(0));
 it('10000 informado e 8500 calculado dá 1500 e diagnóstico exato',()=>{const dif=lerDinheiro('10.000,00')-8500;expect(dif).toBe(1500);expect(diagnosticarCaixa([c],[l('a',1500)],'c','2026-02-02',dif).find(x=>x.tipo==='exato')?.ids).toEqual(['a']);});
 it('conta sem saldo inicial não inventa zero',()=>{expect(saldoConta({...c,saldo_inicial:null},[],'2026-02-01')).toBeNull();expect(diagnosticarCaixa([{...c,saldo_inicial:null}],[],'c','2026-02-01',0).some(x=>x.tipo==='inicial')).toBe(true);});
 it('detecta lançamentos duplicados',()=>expect(diagnosticarCaixa([c],[l('a',1500),l('b',1500)],'c','2026-02-02',1500).find(x=>x.tipo==='duplicado')?.ids).toEqual(['a','b']));
 it('exclui pendente cancelado estornado e futuro',()=>expect(saldoConta(c,[l('a',10),l('b',20,{situacao:'pendente'}),l('c',30,{situacao:'cancelado'}),l('d',40,{situacao:'estornado'}),l('e',50,{data_pagamento:'2027-01-01'})],'2026-03-01')).toBe(8510));
 it('saldo inicial é posição de fechamento e não duplica seu dia',()=>expect(saldoConta(c,[l('a',100,{data_pagamento:'2026-01-01'})],'2026-02-01')).toBe(8500));
 it('calcula em centavos sem erro de soma',()=>expect(saldoConta({...c,saldo_inicial:0},[l('a',0.1),l('b',0.2)],'2026-02-01')).toBe(0.3));
 it('detecta pendentes vencidos',()=>expect(diagnosticarCaixa([c],[l('a',1500,{situacao:'pendente'})],'c','2026-02-02',1500).some(x=>x.tipo==='pendente')).toBe(true));
 it('detecta combinação de dois valores',()=>expect(diagnosticarCaixa([c],[l('a',1000),l('b',500)],'c','2026-02-02',1500).some(x=>x.tipo==='par')).toBe(true));
 it('detecta vírgula deslocada',()=>expect(diagnosticarCaixa([c],[l('a',1500)],'c','2026-02-02',1350).some(x=>x.tipo==='digitacao')).toBe(true));
 it('rejeita vazio texto e três centavos',()=>{for(const v of ['','abc','1,234'])expect(()=>lerDinheiro(v)).toThrow();});
 it('lembrete após sete dias',()=>expect(diasSemConferencia({criado_em:'2026-02-01T12:00:00Z'} as Conferencia,'2026-02-09')).toBe(8));
});