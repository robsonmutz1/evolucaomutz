import { describe, expect, it } from 'vitest';
import { conclusoesPorMes } from './conclusoes';

const aluno = (id: string) => ({ id, nome: id, status: 'Ativo' as const });
const parcela = (aluno_id: string, referencia: string, situacao: 'aberta' | 'paga' | 'cancelada' = 'aberta') => ({ aluno_id, referencia, situacao, tipo: 'mensalidade' as const });

describe('conclusões baseadas nas mensalidades lançadas', () => {
  it('separa mês atual, próximo mês e daqui a dois meses atravessando o ano', () => {
    const grupos = conclusoesPorMes([aluno('a'), aluno('b'), aluno('c')], [parcela('a', '2026-11'), parcela('b', '2026-12'), parcela('c', '2027-01')], '2026-11');
    expect(grupos.map(g => [g.mes, g.alunos.map(a => a.id)])).toEqual([['2026-11', ['a']], ['2026-12', ['b']], ['2027-01', ['c']]]);
  });
  it('inclui mensalidades abertas, atrasadas e quitadas, contando cada aluno uma vez', () => {
    const grupos = conclusoesPorMes([aluno('aberta'), aluno('atrasada'), aluno('quitada')], [parcela('aberta', '2026-11'), parcela('atrasada', '2026-11'), parcela('quitada', '2026-10', 'paga'), parcela('quitada', '2026-11', 'paga')], '2026-11');
    expect(grupos[0]?.alunos.map(a => a.id)).toEqual(['aberta', 'atrasada', 'quitada']);
  });
  it('não inclui alunos sem mensalidades nem com apenas taxa de matrícula', () => {
    const grupos = conclusoesPorMes([aluno('sem'), aluno('matricula')], [{ ...parcela('matricula', '2026-11'), tipo: 'matricula' }], '2026-11');
    expect(grupos.flatMap(g => g.alunos)).toEqual([]);
  });
  it('usa o último mês registrado, não parcelas anteriores ou canceladas', () => {
    const grupos = conclusoesPorMes([aluno('a')], [parcela('a', '2026-11'), parcela('a', '2026-12', 'paga'), parcela('a', '2027-01', 'cancelada')], '2026-11');
    expect(grupos.map(g => g.alunos.length)).toEqual([0, 1, 0]);
  });
  it('não apresenta alunos já concluídos ou cancelados nem prazos fora dos três meses', () => {
    const grupos = conclusoesPorMes([{ ...aluno('concluido'), status: 'Concluído' }, { ...aluno('cancelado'), status: 'Cancelado' }, aluno('antigo'), aluno('futuro')], [parcela('concluido', '2026-11'), parcela('cancelado', '2026-11'), parcela('antigo', '2026-10'), parcela('futuro', '2027-02')], '2026-11');
    expect(grupos.flatMap(g => g.alunos)).toEqual([]);
  });
});