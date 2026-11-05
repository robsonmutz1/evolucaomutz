import type { Database } from '@/integrations/supabase/types';
export type Lead = Database['public']['Tables']['leads']['Row'];
export type Interacao = Database['public']['Tables']['lead_interacoes']['Row'];
export const etapas = ['Novo lead','Respondeu','Sem resposta','Em negociação','Matriculado','Perdido'] as const;
export const turnos = ['Sábado','Semana - Manhã','Semana - Tarde','Semana - Noite','Ainda não definiu'] as const;
export const origens = ['Anúncio Instagram/Facebook','Indicação','WhatsApp direto','Passou na frente','Google','Outro'] as const;
export const tiposContato = ['WhatsApp','Ligação','Visita','Aula experimental','Pós-venda','Anotação'] as const;
export function normalizarTelefone(t: string) { const n = t.replace(/\D/g, ''); return n.length > 11 && n.startsWith('55') ? n.slice(2) : n; }
export function chaveTelefone(t: string) { const n = normalizarTelefone(t); return n.length === 11 && n[2] === '9' ? n.slice(0,2) + n.slice(3) : n; }
export function hojeCRM(d = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d); }
export function diasDesde(iso: string, agora = new Date()) { return Math.max(0, Math.floor((agora.getTime() - new Date(iso).getTime()) / 86400000)); }
export function nivelContato(l: Lead, agora = new Date()) { const dias = diasDesde(l.data_ultimo_contato ?? l.created_at, agora); return dias > 7 ? 'forte' : dias > 3 ? 'atencao' : 'normal'; }
export function followUp(l: Lead, agora = new Date()) { return !['Matriculado','Perdido'].includes(l.etapa) && ((!!l.data_proximo_contato && l.data_proximo_contato <= hojeCRM(agora)) || (['Novo lead','Sem resposta'].includes(l.etapa) && diasDesde(l.data_ultimo_contato ?? l.created_at, agora) > 2)); }
export function posVenda(l: Lead, agora = new Date()) { return l.etapa === 'Matriculado' && !l.pos_venda_realizado && !!l.data_fechamento && new Date(l.data_fechamento).getTime() <= agora.getTime() && agora.getTime() - new Date(l.data_fechamento).getTime() <= 30 * 86400000; }
export function validarLead(l: Lead) {
 if (!l.nome_responsavel.trim()) throw new Error('Informe o nome do responsável.');
 if (![10,11].includes(normalizarTelefone(l.telefone).length)) throw new Error('Informe um telefone com DDD válido.');
 if (!etapas.includes(l.etapa as typeof etapas[number]) || !turnos.includes(l.turno_interesse as typeof turnos[number]) || !origens.includes(l.origem as typeof origens[number])) throw new Error('Opção inválida.');
 if (l.etapa === 'Perdido' && !l.motivo_perda?.trim()) throw new Error('Informe o motivo da perda.');
 if (l.valor_mensalidade_negociado !== null && (!Number.isFinite(l.valor_mensalidade_negociado) || l.valor_mensalidade_negociado < 0)) throw new Error('Mensalidade inválida.');
 if (l.idade_aluno !== null && (!Number.isInteger(l.idade_aluno) || l.idade_aluno < 0 || l.idade_aluno > 120)) throw new Error('Idade inválida.');
 return {...l, telefone: normalizarTelefone(l.telefone)};
}
export function metricasCRM(leads: Lead[], mes: string) {
 const coorte = leads.filter(l => hojeCRM(new Date(l.created_at)).startsWith(mes));
 const matriculados = coorte.filter(l => l.etapa === 'Matriculado');
 const valores = matriculados.flatMap(l => l.valor_mensalidade_negociado === null ? [] : [l.valor_mensalidade_negociado]);
 const tempos = matriculados.flatMap(l => l.data_fechamento ? [Math.max(0,(new Date(l.data_fechamento).getTime()-new Date(l.created_at).getTime())/86400000)] : []);
 return {coorte, matriculados: matriculados.length, conversao: coorte.length ? matriculados.length / coorte.length * 100 : 0,
 semResposta: coorte.filter(l=>l.etapa==='Sem resposta').length, perdidos: coorte.filter(l=>l.etapa==='Perdido').length,
 potencial: coorte.filter(l=>!['Matriculado','Perdido'].includes(l.etapa)).reduce((n,l)=>n+(l.valor_mensalidade_negociado??0),0),
 mensalMatriculados: valores.reduce((n,v)=>n+v,0), ticket: valores.length ? valores.reduce((n,v)=>n+v,0)/valores.length : null,
 tempo: tempos.length ? tempos.reduce((n,v)=>n+v,0)/tempos.length : null};
}