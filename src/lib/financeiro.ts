export type TipoRegistro = 'despesa' | 'produto' | 'patrimonio';
export type RegistroFinanceiro = {
  id?: string; tipo: TipoRegistro; descricao: string; categoria: string;
  data: string | null; valor: number | null; quantidade: number | null; observacoes: string | null;
};

export function validarMes(mes: string) {
  const m = /^(\d{4})-(\d{2})$/.exec(mes);
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) throw new Error('Informe um mês válido.');
}

export function validarRegistro(r: RegistroFinanceiro): RegistroFinanceiro {
  if (!['despesa', 'produto', 'patrimonio'].includes(r.tipo)) throw new Error('Tipo inválido.');
  if (!r.descricao?.trim()) throw new Error('Preencha a descrição.');
  if (r.valor !== null && (!Number.isFinite(r.valor) || r.valor < 0)) throw new Error('Informe um valor válido.');
  if (r.quantidade !== null && (!Number.isInteger(r.quantidade) || r.quantidade < 0)) throw new Error('Informe uma quantidade válida.');
  return { ...r, descricao: r.descricao.trim(), categoria: r.categoria?.trim() ?? '', data: r.data || null, observacoes: r.observacoes?.trim() || null };
}

/** Sum of known values; unknown values are not treated as zero. Returns null when nothing is known. */
export function totalConhecido(rs: RegistroFinanceiro[]) {
  const v = rs.filter((r) => r.valor !== null).map((r) => (r.valor as number) * (r.tipo === 'despesa' ? 1 : (r.quantidade ?? 1)));
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) * 100) / 100 : null;
}
