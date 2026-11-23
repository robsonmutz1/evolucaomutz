export type Lancamento = {
  id?: string | undefined; mes: string; data_lancamento?: string | null | undefined; tipo: 'entrada' | 'saida'; grupo: string; categoria: string; valor: number; descricao: string | null;
  conta_id?:string|null; situacao?:'realizado'|'pendente'|'cancelado'|'estornado'; data_pagamento?:string|null; aluno_id?:string|null; referencia_mensalidade?:string|null; transferencia_id?:string|null; created_at?:string; updated_at?:string; confirmar_caixa?:boolean;
};

/** Sums entries of one type whose month starts with the prefix ("2025" or "2025-03"); null when none exist. */
export function totalPorTipo(ls: Lancamento[], tipo: Lancamento['tipo'], prefixo: string) {
  const v = ls.filter((l) => l.tipo === tipo && l.mes.startsWith(prefixo));
  return v.length ? Math.round(v.reduce((s, l) => s + l.valor, 0) * 100) / 100 : null;
}

/** Groups the visible rows in their existing date order; daily balance is not cumulative. */
export function lancamentosPorDia(lista: Lancamento[], baseAcumulado: Lancamento[] = lista) {
  const movimentos = new Map<string, number>();
  for (const l of baseAcumulado) {
    const data = l.data_lancamento ?? `${l.mes}-01`;
    movimentos.set(data, (movimentos.get(data) ?? 0) + Math.round(l.valor * 100) * (l.tipo === 'entrada' ? 1 : -1));
  }
  const acumulados = new Map<string, number>();
  let mesAtual = '', acumulado = 0;
  for (const data of [...movimentos.keys()].sort()) {
    const mes = data.slice(0, 7);
    if (mes !== mesAtual) { acumulado = 0; mesAtual = mes; }
    acumulado += movimentos.get(data) ?? 0;
    acumulados.set(data, acumulado / 100);
  }
  const dias = new Map<string, { data: string; lancamentos: Lancamento[]; entradas: number; saidas: number }>();
  for (const l of lista) {
    const data = l.data_lancamento ?? `${l.mes}-01`;
    const dia = dias.get(data) ?? { data, lancamentos: [], entradas: 0, saidas: 0 };
    dia.lancamentos.push(l);
    if (l.tipo === 'entrada') dia.entradas += Math.round(l.valor * 100);
    else dia.saidas += Math.round(l.valor * 100);
    dias.set(data, dia);
  }
  return [...dias.values()].map(dia => ({
    ...dia, entradas: dia.entradas / 100, saidas: dia.saidas / 100,
    saldo: (dia.entradas - dia.saidas) / 100,
    acumulado: acumulados.get(dia.data) ?? 0,
  }));
}

import { dataValida } from './financeiro-cadastros';
export function validarLancamento(l: Lancamento): Lancamento {
  if(l.data_lancamento){if(!dataValida(l.data_lancamento))throw new Error('Informe uma data válida.');l={...l,mes:l.data_lancamento.slice(0,7)};}
  const m = /^(\d{4})-(\d{2})$/.exec(l.mes);
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) throw new Error('Informe um mês válido.');
  if (l.tipo !== 'entrada' && l.tipo !== 'saida') throw new Error('Tipo inválido.');
  if (!l.categoria?.trim()) throw new Error('Preencha a categoria.');
  if (!Number.isFinite(l.valor) || l.valor < 0) throw new Error('Informe um valor válido.');
  return { ...l, categoria: l.categoria.trim(), grupo: l.grupo?.trim() ?? '', descricao: l.descricao?.trim() || null };
}
