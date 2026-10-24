import { createContext, useContext, type ReactNode } from "react";
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { alunosQuery } from './alunos-query';
import { salvarAluno } from './alunos.functions';
import type { Aluno } from "./alunos";

interface Store {
  alunos: Aluno[];
  salvar: (a: Aluno) => Promise<void>;
}
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { data: alunos } = useSuspenseQuery(alunosQuery);
  const client = useQueryClient();
  const save = useServerFn(salvarAluno);
  const salvar = async (a: Aluno) => {
    await save({ data: a });
    await client.invalidateQueries({ queryKey: alunosQuery.queryKey });
  };
  return <Ctx.Provider value={{ alunos, salvar }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("StoreProvider ausente");
  return s;
}
