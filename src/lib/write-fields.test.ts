import { describe, expect, it } from 'vitest';
import {
  financialRecordWrite, courseWrite, scheduleWrite, classWrite, leadWrite,
  studentWrite, enrollmentWrite, providerWrite, lessonWrite, cashEntryWrite,
} from './write-fields';

// Deliberately send runtime properties outside TypeScript's declared shape.
const inject = <T>(value: T) => Object.assign({}, value, {
  created_at: '2000-01-01', updated_at: '2000-01-01', import_raw: { private: true },
  import_row: 99, pagamento_id: 'forged-payment', caixa_owner_id: 'other-owner',
  user_id: 'other-owner', arbitrary_column: 'injected',
});

describe('editable write field allowlists', () => {
  it('financial records strip extra fields for inserts and updates', () => {
    const row = { id: 'record', tipo: 'despesa' as const, descricao: 'Energia', categoria: 'Utilidades', data: null, valor: null, quantidade: null, observacoes: null };
    expect(financialRecordWrite(inject(row))).toEqual(row);
  });
  it('course, schedule and class writes strip audit and unknown fields', () => {
    const course = { id: 'course', nome: 'Curso', descricao: null, carga_horaria: null, valor_mensal_padrao: 100, valor_matricula_padrao: null, ativo: true };
    const schedule = { id: 'schedule', descricao: 'Manhã', dias_semana: [1], hora_inicio: '08:00', hora_fim: '10:00', ativo: true };
    const cls = { id: 'class', codigo: 'A', curso_id: 'course', horario_id: 'schedule', data_inicio: '2026-11-01', data_previsao_termino: null, disponivel_matricula: true, status: 'em_andamento', observacoes: null };
    expect(courseWrite(inject(course))).toEqual(course);
    expect(scheduleWrite(inject(schedule))).toEqual(schedule);
    expect(classWrite(inject(cls))).toEqual(cls);
  });
  it('lead inserts and updates cannot forge post-sale completion or creation time', () => {
    const editable = { id: 'lead', telefone: '27999999999', nome_responsavel: 'Responsável', nome_aluno: null, idade_aluno: null, turno_interesse: 'Ainda não definiu', curso_interesse: '', origem: 'WhatsApp direto', consultor_responsavel: null, valor_mensalidade_negociado: null, etapa: 'Novo lead', observacoes: '', data_ultimo_contato: null, data_proximo_contato: null, aluno_id: null, data_fechamento: null, motivo_perda: null };
    const payload = inject({ ...editable, created_at: '2026-11-01', pos_venda_realizado: true, data_pos_venda: '2026-11-01' });
    expect(leadWrite(payload)).toEqual(editable);
  });
  it('student and nested enrollments preserve editable fields, not import or audit fields', () => {
    const enrollment = { ordem: 1, curso_id: null, turma_id: null, horario_id: null, status: 'cursando', data_conclusao: null, motivo_cancelamento: null, valor_mensal: null };
    const student = { id: 'student', codigo: '701168', nome: 'Aluno', responsavel: '', bairro: '', cidade: '', dataMatricula: '', curso: 'Curso', turma: '', horario: '', status: 'Ativo' as const, valorMensal: null, descontoTipo: 'percentual' as const, desconto: 0, diaLimiteDesconto: 0, diaVencimento: 0, qtdMensalidades: 0, primeiraCobranca: '', foto_url: null, valor_matricula: null, data_matricula: null };
    expect(studentWrite(inject({ ...student, matriculas: [inject(enrollment)] }))).toEqual(student);
    expect(enrollmentWrite(inject(enrollment))).toEqual(enrollment);
  });
  it('providers cannot set creation metadata', () => {
    const row = { id: 'provider', nome: 'Professor', valor_hora: 20, ativo: true };
    expect(providerWrite(inject(row))).toEqual(row);
  });
  it('lessons cannot assign payment links, but preserve rate snapshots', () => {
    const row = { id: 'lesson', prestador_id: 'provider', data: '2026-11-13', horas: 2, valor_hora: 20, descricao: 'Aula' };
    expect(lessonWrite(inject(row))).toEqual(row);
  });
  it('cash entries cannot set ownership, transfer pairing or audit metadata', () => {
    const row = { id: 'cash', mes: '2026-11', data_lancamento: '2026-11-13', tipo: 'entrada' as const, grupo: '', categoria: 'Mensalidade', valor: 100, descricao: null, conta_id: null, situacao: 'realizado' as const, data_pagamento: '2026-11-13', aluno_id: null, referencia_mensalidade: null };
    expect(cashEntryWrite(inject({ ...row, transferencia_id: 'forged', confirmar_caixa: true, origem: 'forged' }))).toEqual(row);
  });
  it('absent optional ids remain absent so new writes keep database defaults', () => {
    expect(providerWrite(inject({nome: 'Novo', valor_hora: 20, ativo: true}))).toEqual({nome: 'Novo', valor_hora: 20, ativo: true});
  });
});