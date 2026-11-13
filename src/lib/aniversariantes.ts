import { dataBrasilia } from './pedagogico';
import type { Aluno } from './alunos';

export function validarNascimento(value?: string | null, hoje = dataBrasilia()) {
  if (!value) return;
  const date = new Date(`${value}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== value || value < '1900-01-01' || value > hoje) throw new Error('Informe uma data de nascimento válida, não futura.');
}
export function idadeAluno(value?: string | null, hoje = dataBrasilia()): number | null {
  if (!value) return null;
  try { validarNascimento(value, hoje); } catch { return null; }
  return Number(hoje.slice(0,4))-Number(value.slice(0,4))-(hoje.slice(5)<value.slice(5)?1:0);
}
export const idadeTexto = (idade: number | null) => idade === null ? 'Idade não informada' : `${idade} ${idade===1?'ano':'anos'}`;
export type FiltrosAniversario = { mes: string; idadeMin: string; idadeMax: string; bairro: string; cidade: string; localizacao: string; status: string };
export function filtrarAniversariantes(alunos: Aluno[], f: FiltrosAniversario, hoje = dataBrasilia()) {
  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
  return alunos.filter(a=> {
    const idade=idadeAluno(a.data_nascimento,hoje);
    if (idade===null || !a.data_nascimento) return false;
    return (f.mes==='todos'||a.data_nascimento.slice(5,7)===f.mes)
      && (!f.idadeMin||idade>=Number(f.idadeMin)) && (!f.idadeMax||idade<=Number(f.idadeMax))
      && (f.bairro==='todos'||a.bairro===f.bairro) && (f.cidade==='todos'||a.cidade===f.cidade)
      && (f.status==='todos'||a.status===f.status)
      && norm([a.rua,a.numero,a.cep,a.bairro,a.cidade].filter(Boolean).join(' ')).includes(norm(f.localizacao.trim()));
  }).sort((a,b)=>String(a.data_nascimento).slice(5).localeCompare(String(b.data_nascimento).slice(5))||a.nome.localeCompare(b.nome,'pt-BR'));
}