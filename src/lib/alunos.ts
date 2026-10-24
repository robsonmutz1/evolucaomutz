export type Status = "Ativo" | "Concluído" | "Cancelado";

export interface Aluno {
  id: string;
  codigo: string;
  nome: string;
  responsavel: string;
  bairro: string;
  cidade: string;
  dataMatricula: string; // YYYY-MM-DD
  curso: string;
  turma: string;
  horario: string;
  status: Status;
  dataStatus?: string | undefined; // YYYY-MM-DD (cancelamento/conclusão)
  valorMensal: number | null;
  descontoTipo: "percentual" | "valor";
  desconto: number;
  diaLimiteDesconto: number;
  diaVencimento: number;
  qtdMensalidades: number;
  primeiraCobranca: string; // YYYY-MM
  observacoes?: string;
}

/** Valor da mensalidade com desconto (pago até o dia limite). Nunca negativo. */
export function valorComDesconto(a: Pick<Aluno, "valorMensal" | "descontoTipo" | "desconto">): number | null {
  if (a.valorMensal === null) return null;
  const d = a.descontoTipo === "percentual" ? (a.valorMensal * a.desconto) / 100 : a.desconto;
  return Math.max(0, Math.round((a.valorMensal - d) * 100) / 100);
}

/** Mês (YYYY-MM) previsto da última mensalidade. */
export function ultimaMensalidade(primeiraCobranca: string, qtd: number): string {
  const [y = 0, m = 1] = primeiraCobranca.split("-").map(Number);
  const total = y * 12 + (m - 1) + Math.max(1, qtd) - 1;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

export type Alerta = "Verificar conclusão" | "Prazo de conclusão vencido" | null;

/** Alerta de conclusão para alunos ativos, comparando o mês atual (YYYY-MM) com a última mensalidade. */
export function alertaConclusao(
  a: Pick<Aluno, "status" | "primeiraCobranca" | "qtdMensalidades">,
  mesAtual: string,
): Alerta {
  if (a.status !== "Ativo" || !a.primeiraCobranca || a.qtdMensalidades < 1) return null;
  const ultima = ultimaMensalidade(a.primeiraCobranca, a.qtdMensalidades);
  if (mesAtual === ultima) return "Verificar conclusão";
  if (mesAtual > ultima) return "Prazo de conclusão vencido";
  return null;
}

export function mesAtualISO(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const brl = (v: number | null) => v === null ? 'Não informado' : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const formatMes = (ym: string) => {
  const [y, m] = ym.split("-");
  return `${m}/${y}`;
};

export const formatData = (iso: string) => iso.split("-").reverse().join("/");
