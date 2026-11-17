import type { Aluno } from './alunos';
import { somarMes, type Parcela } from './mensalidades';

/** Forecast from the last recorded tuition month, regardless of settlement. */
export function conclusoesPorMes<T extends Pick<Aluno, 'id' | 'nome' | 'status'>>(
  alunos: T[],
  parcelas: Pick<Parcela, 'aluno_id' | 'tipo' | 'referencia' | 'situacao'>[],
  mesAtual: string,
) {
  const ultimas = new Map<string, string>();
  for (const p of parcelas) {
    if (p.tipo !== 'mensalidade' || p.situacao === 'cancelada' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(p.referencia)) continue;
    const anterior = ultimas.get(p.aluno_id);
    if (!anterior || p.referencia > anterior) ultimas.set(p.aluno_id, p.referencia);
  }
  return Array.from({ length: 3 }, (_, i) => {
    const mes = somarMes(mesAtual, i);
    return {
      mes,
      alunos: alunos.filter(a => a.status === 'Ativo' && ultimas.get(a.id) === mes)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    };
  });
}