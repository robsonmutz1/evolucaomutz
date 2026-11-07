import { describe, it, expect } from 'vitest';
import { valorAula, resumoPrestador, validarAula, variacaoEnergia } from './energia-prestadores';
const a = {id:'a',prestador_id:'p',data:'2026-10-07',horas:2.5,valor_hora:20,descricao:'',pagamento_id:null,created_at:''};
describe('energia e prestadores',()=>{
 it('calcula aulas horistas sem arredondar horas fracionadas',()=>expect(valorAula(a)).toBe(50));
 it('aulas diárias ficam pendentes, sem pagamento de caixa',()=>expect(resumoPrestador([a],[],'p','2026-10','2026-10')).toEqual({horas:2.5,ganho:50,pendente:50,pago:0}));
 it('pagamento distingue competência das aulas da data de caixa',()=>{const p={id:'pay',prestador_id:'p',mes:'2026-10',data_pagamento:'2026-11-03',valor:50,lancamento_id:'l'};expect(resumoPrestador([{...a,pagamento_id:'pay'}],[p],'p','2026-10','2026-10')).toEqual({horas:2.5,ganho:50,pendente:0,pago:50});});
 it('ganhos pertencem somente ao prestador e período filtrados',()=>expect(resumoPrestador([a,{...a,prestador_id:'outro'},{...a,data:'2026-09-01'}],[],'p','2026-10','2026-10').ganho).toBe(50));
 it('rejeita horas nulas e negativas',()=>{expect(()=>validarAula({...a,horas:0})).toThrow();expect(()=>validarAula({...a,horas:-1})).toThrow();});
 it('mostra economia e não inventa comparação sem base',()=>{expect(variacaoEnergia(80,100)).toBe(-20);expect(variacaoEnergia(80,null)).toBeNull();});
});