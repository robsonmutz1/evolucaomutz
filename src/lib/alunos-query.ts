import { queryOptions } from '@tanstack/react-query';
import { listarAlunos } from './alunos.functions';
export const alunosQuery = queryOptions({ queryKey: ['school', 'alunos'], queryFn: () => listarAlunos(), staleTime: 30_000 });