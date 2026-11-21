export const quantidadePadraoAlunos = 20;
export const quantidadesAlunos = [10, 20, 50, 100] as const;

export function quantidadeAlunos(value: unknown): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 500 ? n : quantidadePadraoAlunos;
}

export function paginaAlunos<T>(rows: readonly T[], page: number, size: number) {
  const quantidade = quantidadeAlunos(size);
  const paginas = Math.max(1, Math.ceil(rows.length / quantidade));
  const atual = Math.min(paginas, Math.max(1, Math.trunc(page) || 1));
  const inicio = (atual - 1) * quantidade;
  return { itens: rows.slice(inicio, inicio + quantidade), atual, paginas, inicio, fim: Math.min(inicio + quantidade, rows.length) };
}