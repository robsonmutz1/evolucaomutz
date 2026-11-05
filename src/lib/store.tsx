import type { ReactNode } from "react";
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { alunosQuery } from './alunos-query';
import { salvarAluno } from './alunos.functions';
import type { Aluno } from "./alunos";

// Kept as a passthrough so layouts don't change; state lives in the shared query cache,
// which avoids context identity breaking when this module hot-reloads.
export function StoreProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useStore(): { alunos: Aluno[]; salvar: (a: Aluno) => Promise<void> } {
  const { data: alunos } = useSuspenseQuery(alunosQuery);
  const client = useQueryClient();
  const save = useServerFn(salvarAluno);
  const salvar = async (a: Aluno) => {
    await save({ data: a });
    await client.invalidateQueries({ queryKey: alunosQuery.queryKey });
    await client.invalidateQueries({ queryKey: ['school', 'crm'] });
  };
  return { alunos, salvar };
}
