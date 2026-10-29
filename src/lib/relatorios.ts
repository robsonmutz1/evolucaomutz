import type { Aluno } from './alunos';

export type ReceitaMensal = { mes: string; valor: number };
export type TipoRelatorio = 'financeiro' | 'matriculas' | 'ativos' | 'cancelamentos' | 'formados';
export const horizontes = [1, 3, 6, 9, 12] as const;

export function totalAnual(receitas: ReceitaMensal[], ano: string): number | null {
  const registros = receitas.filter((r) => r.mes.startsWith(`${ano}-`));
  return registros.length ? registros.reduce((s, r) => s + r.valor, 0) : null;
}

/** Cancellation rate relative to enrollments of the same period; unknown without enrollments. */
export function taxaCancelamento(matriculas: number, cancelamentos: number): number | null {
  if (!Number.isFinite(matriculas) || matriculas <= 0) return null;
  return Math.round((cancelamentos / matriculas) * 1000) / 10;
}

/** Average of the last twelve recorded completed months; missing months are not zero revenue. */
export function projetarFaturamento(receitas: ReceitaMensal[], mesAtual: string) {
  const base = receitas.filter((r) => r.mes < mesAtual && Number.isFinite(r.valor))
    .sort((a, b) => a.mes.localeCompare(b.mes)).slice(-12);
  if (base.length < 3) return null;
  const media = base.reduce((s, r) => s + r.valor, 0) / base.length;
  const [ano, mes] = mesAtual.split('-').map(Number);
  if (!ano || !mes) return null;
  const mensal = Array.from({ length: 12 }, (_, i) => {
    const n = ano * 12 + mes - 1 + i + 1;
    return { mes: `${Math.floor(n / 12)}-${String(n % 12 + 1).padStart(2, '0')}`, valor: Math.round(media * 100) / 100 };
  });
  return { base, media, mensal, totais: horizontes.map((meses) => ({ meses, valor: Math.round(media * meses * 100) / 100 })) };
}

export function alunosDoRelatorio(alunos: Aluno[], tipo: TipoRelatorio, de: string, ate: string, curso = 'todos', turma = 'todos') {
  const status = tipo === 'ativos' ? 'Ativo' : tipo === 'cancelamentos' ? 'Cancelado' : tipo === 'formados' ? 'Concluído' : null;
  const porEvento = tipo === 'cancelamentos' || tipo === 'formados';
  const candidatos = alunos.filter((a) => (!status || a.status === status) && (curso === 'todos' || a.curso === curso) && (turma === 'todos' || a.turma === turma));
  const data = (a: Aluno) => porEvento ? a.dataStatus : a.dataMatricula;
  return {
    semData: candidatos.filter((a) => !data(a)).length,
    alunos: candidatos.filter((a) => {
      const d = data(a);
      return !!d && (!de || d >= de) && (!ate || d <= ate);
    }).sort((a, b) => String(data(b)).localeCompare(String(data(a))) || a.nome.localeCompare(b.nome)),
  };
}

/** Quote cells and neutralize spreadsheet formulas, including user-controlled names. */
export function gerarCsv(linhas: (string | number | null)[][]) {
  return '\uFEFF' + linhas.map((linha) => linha.map((v) => {
    const texto = v === null ? 'Não informado' : String(v);
    const seguro = /^[\s]*[=+@-]/.test(texto) ? `'${texto}` : texto;
    return `"${seguro.replaceAll('"', '""')}"`;
  }).join(';')).join('\r\n');
}