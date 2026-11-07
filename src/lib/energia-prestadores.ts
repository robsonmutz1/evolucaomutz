import type { Database } from '@/integrations/supabase/types';
import { dataValida } from './financeiro-cadastros';
export type Prestador = Database['public']['Tables']['prestadores']['Row'];
export type Aula = Database['public']['Tables']['prestador_aulas']['Row'];
export type Pagamento = Database['public']['Tables']['prestador_pagamentos']['Row'];
export type Energia = Database['public']['Tables']['energia_registros']['Row'];
export const valorAula = (a: Pick<Aula, 'horas' | 'valor_hora'>) => Math.round(a.horas * a.valor_hora * 100) / 100;
export function resumoPrestador(aulas: Aula[], pagamentos: Pagamento[], id: string, de: string, ate: string) {
 const rows = aulas.filter(a => a.prestador_id === id && a.data.slice(0,7) >= de && a.data.slice(0,7) <= ate);
 return { horas: rows.reduce((s,a)=>s+a.horas,0), ganho: Math.round(rows.reduce((s,a)=>s+valorAula(a),0)*100)/100, pendente: Math.round(rows.filter(a=>!a.pagamento_id).reduce((s,a)=>s+valorAula(a),0)*100)/100, pago: Math.round(pagamentos.filter(p=>p.prestador_id===id&&p.mes>=de&&p.mes<=ate).reduce((s,p)=>s+p.valor,0)*100)/100 };
}
export function validarAula(a: { prestador_id: string; data: string; horas: number; valor_hora: number; descricao: string; id?: string }) {
 if (!a.prestador_id || !dataValida(a.data) || !Number.isFinite(a.horas) || a.horas<=0 || !Number.isFinite(a.valor_hora) || a.valor_hora<0) throw new Error('Informe prestador, data, horas e valor válidos.');
 return {...a, descricao:a.descricao.trim()};
}
export function variacaoEnergia(atual: number | null, anterior: number | null) { return atual===null||anterior===null||anterior===0 ? null : (atual-anterior)/anterior*100; }