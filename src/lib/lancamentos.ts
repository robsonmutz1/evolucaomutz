export type Lancamento = {
  id?: string | undefined; mes: string; tipo: 'entrada' | 'saida'; grupo: string; categoria: string; valor: number; descricao: string | null;
};

/** Sums entries of one type whose month starts with the prefix ("2025" or "2025-03"); null when none exist. */
export function totalPorTipo(ls: Lancamento[], tipo: Lancamento['tipo'], prefixo: string) {
  const v = ls.filter((l) => l.tipo === tipo && l.mes.startsWith(prefixo));
  return v.length ? Math.round(v.reduce((s, l) => s + l.valor, 0) * 100) / 100 : null;
}

export function validarLancamento(l: Lancamento): Lancamento {
  const m = /^(\d{4})-(\d{2})$/.exec(l.mes);
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) throw new Error('Informe um mês válido.');
  if (l.tipo !== 'entrada' && l.tipo !== 'saida') throw new Error('Tipo inválido.');
  if (!l.categoria?.trim()) throw new Error('Preencha a categoria.');
  if (!Number.isFinite(l.valor) || l.valor < 0) throw new Error('Informe um valor válido.');
  return { ...l, categoria: l.categoria.trim(), grupo: l.grupo?.trim() ?? '', descricao: l.descricao?.trim() || null };
}
