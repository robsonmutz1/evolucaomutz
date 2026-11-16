export const FORMAS = { dinheiro: 'Dinheiro', pix: 'Pix', credito: 'Cartão de crédito', debito: 'Cartão de débito' } as const;
export type Forma = string;
/** Display label: legacy keys map to names, new rows store the name itself. */
export const rotuloForma = (f: string | null) => (f ? (FORMAS as Record<string, string>)[f] ?? f : '');
export type Situacao = 'aberta' | 'paga' | 'cancelada';
export type Parcela = {
  id: string; aluno_id: string; tipo: 'mensalidade' | 'matricula'; parcela: number; referencia: string; vencimento: string;
  valor: number; situacao: Situacao; data_pagamento: string | null; valor_pago: number | null; forma_pagamento: Forma | null;
  banco: string | null; conta_id: string | null; lancamento_id: string | null; observacao: string | null; created_at: string;
};
export type NovaParcela = Pick<Parcela, 'tipo' | 'parcela' | 'referencia' | 'vencimento' | 'valor'>;

/** Adds n months to a YYYY-MM reference. */
export function somarMes(ref: string, n: number): string {
  const [y = 0, m = 1] = ref.split('-').map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}
/** Due date inside the reference month, clamped to the month's last day. */
export function vencimentoNoMes(ref: string, dia: number): string {
  const [y = 0, m = 1] = ref.split('-').map(Number);
  const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${ref}-${String(Math.min(Math.max(1, Math.trunc(dia) || 1), ultimo)).padStart(2, '0')}`;
}
/** Installments at full price; enrollment fee as a separate item when informed. */
export function gerarParcelas(i: { primeiraCobranca: string; qtd: number; dia: number; valor: number | null; valorMatricula?: number | null; dataMatricula?: string | null }): NovaParcela[] {
  const out: NovaParcela[] = [];
  if (i.valorMatricula && i.valorMatricula > 0 && i.dataMatricula) out.push({ tipo: 'matricula', parcela: 1, referencia: i.dataMatricula.slice(0, 7), vencimento: i.dataMatricula, valor: i.valorMatricula });
  if (/^\d{4}-\d{2}$/.test(i.primeiraCobranca) && i.valor !== null && i.valor > 0)
    for (let n = 0; n < Math.min(Math.max(0, Math.trunc(i.qtd)), 60); n++) {
      const ref = somarMes(i.primeiraCobranca, n);
      out.push({ tipo: 'mensalidade', parcela: n + 1, referencia: ref, vencimento: vencimentoNoMes(ref, i.dia), valor: i.valor });
    }
  return out;
}
/** Suggested amount: discount applies only to tuition paid up to the limit day of its own month (or earlier). */
export function valorSugerido(p: Pick<Parcela, 'tipo' | 'referencia' | 'valor'>, a: { descontoTipo: 'percentual' | 'valor'; desconto: number; diaLimiteDesconto: number }, dataPagamento: string): number {
  if (p.tipo !== 'mensalidade' || !a.desconto || !a.diaLimiteDesconto) return p.valor;
  if (dataPagamento > vencimentoNoMes(p.referencia, a.diaLimiteDesconto)) return p.valor;
  const d = a.descontoTipo === 'percentual' ? (p.valor * a.desconto) / 100 : a.desconto;
  return Math.max(0, Math.round((p.valor - d) * 100) / 100);
}
/** Late payment: 2% fine after due date + 1% per month, pro rata by day (30-day month), on the original amount. */
export function valorComAtraso(valor: number, vencimento: string, dataPagamento: string): number {
  if (!dataPagamento || !vencimento || dataPagamento <= vencimento) return valor;
  const dias = Math.round((Date.parse(`${dataPagamento}T12:00:00Z`) - Date.parse(`${vencimento}T12:00:00Z`)) / 86400000);
  if (!(dias > 0)) return valor;
  const c = Math.round(valor * 100);
  return Math.round(c + c * 0.02 + c * 0.01 * dias / 30) / 100;
}
/** Shared settlement suggestion: the contracted discount deadline includes early payments. */
export function valorParaBaixa(p: Pick<Parcela, 'tipo' | 'referencia' | 'valor' | 'vencimento'>, a: Parameters<typeof valorSugerido>[1] | undefined, dataPagamento: string): number {
  if (!dataPagamento) return p.valor;
  const descontado = a ? valorSugerido(p, a, dataPagamento) : p.valor;
  if (descontado < p.valor) return descontado;
  return valorComAtraso(p.valor, p.vencimento, dataPagamento);
}
export const emAtraso = (p: Pick<Parcela, 'situacao' | 'vencimento'>, hoje: string) => p.situacao === 'aberta' && p.vencimento < hoje;
export const rotuloParcela = (p: Pick<Parcela, 'tipo' | 'parcela'>) => (p.tipo === 'matricula' ? 'Matrícula' : `Parcela ${p.parcela}`);

/** Counts lead origins among the last N students (by enrollment date) inside an optional period. */
export function origensDosUltimos<T extends { dataMatricula: string; origem_lead?: string | null }>(alunos: T[], n: number, de: string, ate: string) {
  const sel = alunos.filter((a) => a.dataMatricula && (!de || a.dataMatricula >= de) && (!ate || a.dataMatricula <= ate))
    .sort((a, b) => b.dataMatricula.localeCompare(a.dataMatricula)).slice(0, n > 0 ? n : undefined);
  const m = new Map<string, number>();
  for (const a of sel) { const k = a.origem_lead?.trim() || 'Não informado'; m.set(k, (m.get(k) ?? 0) + 1); }
  return { total: sel.length, linhas: [...m].map(([origem, qtd]) => ({ origem, qtd, pct: sel.length ? Math.round((qtd / sel.length) * 1000) / 10 : 0 })).sort((a, b) => b.qtd - a.qtd) };
}
