import { describe, expect, it } from 'vitest';
import { idadeAluno, filtrarAniversariantes, validarNascimento } from './aniversariantes';
import type { Aluno } from './alunos';
const aluno = {id:'a',nome:'Aluno',data_nascimento:'2011-11-13',bairro:'Centro',cidade:'Serra',rua:'Rua das Flores',status:'Ativo'} as Aluno;
const filtros = {mes:'todos',idadeMin:'',idadeMax:'',bairro:'todos',cidade:'todos',localizacao:'',status:'todos'};
describe('nascimento e aniversariantes',()=>{
  it('idade muda no dia do aniversário, não antes',()=>{
    expect(idadeAluno('2011-11-13','2026-11-12')).toBe(14);
    expect(idadeAluno('2011-11-13','2026-11-13')).toBe(15);
  });
  it('datas ausentes não geram idade',()=>expect(idadeAluno(null,'2026-11-13')).toBeNull());
  it('rejeita datas futuras e impossíveis',()=>{
    expect(()=>validarNascimento('2027-01-01','2026-11-13')).toThrow();
    expect(()=>validarNascimento('2011-02-30','2026-11-13')).toThrow();
  });
  it('filtra aniversários por mês',()=>{
    expect(filtrarAniversariantes([aluno],{...filtros,mes:'11'},'2026-11-13')).toHaveLength(1);
    expect(filtrarAniversariantes([aluno],{...filtros,mes:'12'},'2026-11-13')).toHaveLength(0);
  });
  it('filtra faixa de idade inclusive',()=>{
    expect(filtrarAniversariantes([aluno],{...filtros,idadeMin:'15',idadeMax:'15'},'2026-11-13')).toHaveLength(1);
    expect(filtrarAniversariantes([aluno],{...filtros,idadeMax:'14'},'2026-11-13')).toHaveLength(0);
  });
  it.each([['bairro','Outro'],['cidade','Outra'],['localizacao','Avenida']])('filtra %s', (key,value)=>{
    expect(filtrarAniversariantes([aluno],{...filtros,[key]:value},'2026-11-13')).toHaveLength(0);
  });
  it('localização inclui rua',()=>expect(filtrarAniversariantes([aluno],{...filtros,localizacao:'flores'},'2026-11-13')).toHaveLength(1));
});