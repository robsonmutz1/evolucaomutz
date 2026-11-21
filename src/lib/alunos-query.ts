import { queryOptions } from '@tanstack/react-query';
import { listarAlunos } from './alunos.functions';
export const alunosQuery = queryOptions({ queryKey: ['school', 'alunos'], queryFn: () => listarAlunos(), staleTime: 5 * 60_000, gcTime: 30 * 60_000 });