import type { Aluno } from './alunos';
import type { Lead } from './crm';
import type { RegistroFinanceiro } from './financeiro';
import type { Lancamento } from './lancamentos';
import type { Curso, Horario, Turma, MatriculaInput } from './pedagogico';

/** Copy only own, explicitly editable fields; absent optional fields stay absent. */
function fields<T, K extends keyof T>(input: T, keys: readonly K[]): Pick<T, K> {
  const output = {} as Pick<T, K>;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(input, key)) output[key] = input[key];
  }
  return output;
}

export const financialRecordWrite = (r: RegistroFinanceiro) => fields(r, [
  'id', 'tipo', 'descricao', 'categoria', 'data', 'valor', 'quantidade', 'observacoes',
] as const);

export const courseWrite = (r: Omit<Curso, 'created_at'>) => fields(r, [
  'id', 'nome', 'descricao', 'carga_horaria', 'valor_mensal_padrao', 'valor_matricula_padrao', 'ativo',
] as const);
export const scheduleWrite = (r: Horario) => fields(r, [
  'id', 'descricao', 'dias_semana', 'hora_inicio', 'hora_fim', 'ativo',
] as const);
export const classWrite = (r: Omit<Turma, 'created_at'>) => fields(r, [
  'id', 'codigo', 'curso_id', 'horario_id', 'data_inicio', 'data_previsao_termino',
  'disponivel_matricula', 'status', 'observacoes',
] as const);

// Contact timestamps and enrollment date are editable; audit creation and post-sale
// completion belong to database defaults and the dedicated contact operation.
export const leadWrite = (r: Lead) => fields(r, [
  'id', 'telefone', 'nome_responsavel', 'nome_aluno', 'idade_aluno', 'turno_interesse',
  'curso_interesse', 'origem', 'consultor_responsavel', 'valor_mensalidade_negociado',
  'etapa', 'observacoes', 'data_ultimo_contato', 'data_proximo_contato', 'aluno_id',
  'data_fechamento', 'motivo_perda',
] as const);

export const enrollmentWrite = (r: MatriculaInput) => fields(r, [
  'ordem', 'curso_id', 'turma_id', 'horario_id', 'status', 'data_conclusao',
  'motivo_cancelamento', 'valor_mensal',
] as const);
export const studentWrite = (r: Aluno) => fields(r, [
  'id', 'codigo', 'nome', 'responsavel', 'telefone', 'telefoneResponsavel', 'cep', 'rua',
  'numero', 'bairro', 'cidade', 'dataMatricula', 'curso', 'turma', 'horario', 'status',
  'dataStatus', 'valorMensal', 'descontoTipo', 'desconto', 'diaLimiteDesconto',
  'diaVencimento', 'qtdMensalidades', 'primeiraCobranca', 'observacoes', 'foto_url',
  'valor_matricula', 'data_matricula',
] as const);

type ProviderInput = {id?: string; nome: string; valor_hora: number; ativo: boolean};
export const providerWrite = (r: ProviderInput) => fields(r, ['id', 'nome', 'valor_hora', 'ativo'] as const);
type LessonInput = {id?: string; prestador_id: string; data: string; horas: number; valor_hora: number; descricao: string};
export const lessonWrite = (r: LessonInput) => fields(r, [
  'id', 'prestador_id', 'data', 'horas', 'valor_hora', 'descricao',
] as const);

// Confirmation is passed separately, never as a database field. Ownership,
// audit timestamps and transfer pairing cannot be supplied by this save action.
export const cashEntryWrite = (r: Lancamento) => fields(r, [
  'id', 'mes', 'data_lancamento', 'tipo', 'grupo', 'categoria', 'valor', 'descricao',
  'conta_id', 'situacao', 'data_pagamento', 'aluno_id', 'referencia_mensalidade',
] as const);