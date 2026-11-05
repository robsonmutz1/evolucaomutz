import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { Aluno } from './alunos';

export const listarAlunos = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const rows: Aluno[] = [];
    for (let start = 0; ; start += 500) {
      const { data, error } = await context.supabase.from('alunos')
        .select('id,codigo,nome,responsavel,telefone,telefoneResponsavel,cep,rua,numero,bairro,cidade,dataMatricula,curso,turma,horario,status,dataStatus,valorMensal,descontoTipo,desconto,diaLimiteDesconto,diaVencimento,qtdMensalidades,primeiraCobranca,observacoes')
        .order('id').range(start, start + 499);
      if (error) throw new Error('Não foi possível carregar os alunos.');
      for (const row of data) {
        const { observacoes, ...student } = row;
        rows.push({ ...student, status: row.status as Aluno['status'], descontoTipo: row.descontoTipo as Aluno['descontoTipo'], dataStatus: row.dataStatus ?? undefined, ...(observacoes === null ? {} : { observacoes }) });
      }
      if (data.length < 500) break;
    }
    return rows;
  });

export const salvarAluno = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Aluno) => {
    if (!input.nome.trim() || !input.curso.trim()) throw new Error('Preencha nome e curso.');
    return input;
  })
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from('alunos').upsert({
      id: data.id, codigo: data.codigo, nome: data.nome, responsavel: data.responsavel, cep: data.cep ?? '', rua: data.rua ?? '', numero: data.numero ?? '', bairro: data.bairro, cidade: data.cidade,
      telefone: data.telefone ?? '', telefoneResponsavel: data.telefoneResponsavel ?? '',
      dataMatricula: data.dataMatricula, curso: data.curso, turma: data.turma, horario: data.horario, status: data.status,
      dataStatus: data.dataStatus ?? null, valorMensal: data.valorMensal, descontoTipo: data.descontoTipo, desconto: data.desconto,
      diaLimiteDesconto: data.diaLimiteDesconto, diaVencimento: data.diaVencimento, qtdMensalidades: data.qtdMensalidades,
      primeiraCobranca: data.primeiraCobranca, observacoes: data.observacoes ?? null,
    });
    if (error) throw new Error('Não foi possível salvar o aluno.');
    return { success: true };
  });