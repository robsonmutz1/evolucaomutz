import { createContext, useContext, useState, type ReactNode } from "react";
import type { Aluno } from "./alunos";
import { alunosIniciais } from "./mock-data";

// Armazenamento temporário em memória (etapa de revisão das telas).
// Será substituído pelo banco de dados após aprovação.
interface Store {
  alunos: Aluno[];
  salvar: (a: Aluno) => void;
}
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [alunos, setAlunos] = useState<Aluno[]>(alunosIniciais);
  const salvar = (a: Aluno) =>
    setAlunos((l) => (l.some((x) => x.id === a.id) ? l.map((x) => (x.id === a.id ? a : x)) : [...l, a]));
  return <Ctx.Provider value={{ alunos, salvar }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("StoreProvider ausente");
  return s;
}
