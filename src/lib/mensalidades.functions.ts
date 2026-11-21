import { createServerFn } from '@tanstack/react-start';
import { queryOptions } from '@tanstack/react-query';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { dataValida } from './financeiro-cadastros';
import { type NovaParcela, type Parcela } from './mensalidades';

const owner = async (s: { rpc: (n: 'has_owner_access') => PromiseLike<{ data: unknown; error: unknown }> }) => { const { data, error } = await s.rpc('has_owner_access'); if (error || !data) throw new Error('Acesso não autorizado.'); };
const valorOk = (v: number) => Number.isFinite(v) && v >= 0 && Math.abs(Math.round(v * 100) - v * 100) < 1e-6;

export const listarMensalidades = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await owner(context.supabase);
  const rows: Parcela[] = [];
  for (let de = 0; ; de += 1000) { const { data, error } = await context.supabase.from('mensalidades').select('*').order('vencimento').order('id').range(de, de + 999); if (error) throw new Error('Não foi possível carregar as mensalidades.'); rows.push(...(data as Parcela[])); if (data.length < 1000) break; }
  return rows;
});
export const mensalidadesQuery = queryOptions({ queryKey: ['school', 'mensalidades'], queryFn: () => listarMensalidades(), staleTime: 30_000 });

export const gerarMensalidades = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((i: { aluno_id: string; parcelas: NovaParcela[] }) => {
    if (!i.aluno_id || !i.parcelas.length || i.parcelas.length > 61) throw new Error('Nenhuma parcela para lançar.');
    for (const p of i.parcelas) if (!['mensalidade', 'matricula'].includes(p.tipo) || !dataValida(p.vencimento) || !/^\d{4}-\d{2}$/.test(p.referencia) || !valorOk(p.valor) || !Number.isInteger(p.parcela)) throw new Error('Confira valores e vencimentos.');
    return i;
  }).handler(async ({ context, data }) => {
    await owner(context.supabase);
    const { data: exist, error: e1 } = await context.supabase.from('mensalidades').select('tipo,referencia').eq('aluno_id', data.aluno_id).is('extra_lote', null).neq('situacao', 'cancelada');
    if (e1) throw new Error('Não foi possível verificar as parcelas.');
    const dup = data.parcelas.find((p) => exist.some((x) => x.tipo === p.tipo && (p.tipo === 'matricula' || x.referencia === p.referencia)));
    if (dup) throw new Error(dup.tipo === 'matricula' ? 'A matrícula já foi lançada.' : `Já existe parcela para ${dup.referencia.split('-').reverse().join('/')}.`);
    const { error } = await context.supabase.from('mensalidades').insert(data.parcelas.map((p) => ({ aluno_id: data.aluno_id, tipo: p.tipo, parcela: p.parcela, referencia: p.referencia, vencimento: p.vencimento, valor: p.valor })));
    if (error) throw new Error(error.code === '23505' ? 'O financeiro deste aluno já foi gerado.' : 'Não foi possível lançar as parcelas.');
    return { success: true };
  });

export const adicionarParcelasExtras = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((i: { aluno_id: string; lote: string; descricao: string; parcelas: NovaParcela[] }) => {
    const descricao = i.descricao.trim();
    if (!i.aluno_id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(i.lote) || !descricao || descricao.length > 120 || !i.parcelas.length || i.parcelas.length > 60) throw new Error('Confira os dados das parcelas extras.');
    const parcelas = i.parcelas.map((p) => {
      if (p.tipo !== 'mensalidade' || !dataValida(p.vencimento) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(p.referencia) || !valorOk(p.valor) || p.valor <= 0 || !Number.isInteger(p.parcela) || p.parcela < 1 || p.parcela > 60) throw new Error('Confira valores e vencimentos.');
      return { tipo: p.tipo, parcela: p.parcela, referencia: p.referencia, vencimento: p.vencimento, valor: p.valor };
    });
    return { aluno_id: i.aluno_id, lote: i.lote, descricao, parcelas };
  }).handler(async ({ context, data }) => {
    await owner(context.supabase);
    const { data: quantidade, error } = await context.supabase.rpc('mensalidades_adicionar_extras', { p_aluno: data.aluno_id, p_lote: data.lote, p_descricao: data.descricao, p_parcelas: data.parcelas });
    if (error) throw new Error(error.code === 'P0001' ? error.message : 'Não foi possível adicionar as parcelas extras.');
    return { quantidade };
  });

export const alterarMensalidades = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((i: { rows: { id: string; valor: number; vencimento: string }[] }) => { for (const r of i.rows) if (!valorOk(r.valor) || !dataValida(r.vencimento)) throw new Error('Confira valores e vencimentos.'); return i; })
  .handler(async ({ context, data }) => {
    await owner(context.supabase);
    for (const r of data.rows) { const { error } = await context.supabase.from('mensalidades').update({ valor: r.valor, vencimento: r.vencimento }).eq('id', r.id).eq('situacao', 'aberta'); if (error) throw new Error(error.code === 'P0001' ? error.message : 'Não foi possível alterar as parcelas.'); }
    return { success: true };
  });

export const situacaoMensalidades = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((i: { ids: string[]; acao: 'cancelar' | 'reabrir' | 'excluir' }) => { if (!['cancelar', 'reabrir', 'excluir'].includes(i.acao)) throw new Error('Ação inválida.'); return i; })
  .handler(async ({ context, data }) => {
    await owner(context.supabase);
    if (!data.ids.length) return { success: true };
    const q = context.supabase.from('mensalidades');
    const { error } = data.acao === 'excluir' ? await q.delete().in('id', data.ids).neq('situacao', 'paga')
      : data.acao === 'cancelar' ? await q.update({ situacao: 'cancelada' }).in('id', data.ids).eq('situacao', 'aberta')
      : await q.update({ situacao: 'aberta' }).in('id', data.ids).eq('situacao', 'cancelada');
    if (error) throw new Error(error.code === '23505' ? 'Já existe parcela ativa para esse mês ou matrícula.' : error.code === 'P0001' ? error.message : 'Não foi possível atualizar as parcelas.');
    return { success: true };
  });

export const baixarMensalidade = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; data: string; valor: number; forma: string; banco: string; conta_id: string | null }) => {
    i.valor = Math.round(Number(i.valor) * 100) / 100;
    if (!dataValida(i.data) || !valorOk(i.valor) || i.valor <= 0) throw new Error('Informe data e valor válidos.');
    i.forma = String(i.forma ?? '').trim().slice(0, 60); if (!i.forma) throw new Error('Informe a forma de pagamento.');
    return i;
  }).handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc('mensalidade_baixar', { p_id: data.id, p_data: data.data, p_valor: data.valor, p_forma: data.forma, p_banco: data.banco.trim().slice(0, 80), p_conta: data.conta_id as string });
    if (error) throw new Error(error.code === 'P0001' ? error.message : 'Não foi possível dar baixa.');
    return { success: true };
  });

export const estornarMensalidade = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i).handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc('mensalidade_estornar', { p_id: data.id });
    if (error) throw new Error(error.code === 'P0001' ? error.message : 'Não foi possível desfazer a baixa.');
    return { success: true };
  });

export const listarOrigens = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from('origens_lead').select('id,nome,ativo').order('nome');
  if (error) throw new Error('Não foi possível carregar as origens.');
  return data;
});
export const origensQuery = queryOptions({ queryKey: ['school', 'origens'], queryFn: () => listarOrigens(), staleTime: 60_000 });
export const salvarOrigem = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((i: { nome: string }) => { const nome = i.nome.trim().slice(0, 60); if (!nome) throw new Error('Informe o nome da origem.'); return { nome }; })
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from('origens_lead').insert({ nome: data.nome });
    if (error) throw new Error(error.code === '23505' ? 'Essa origem já existe.' : 'Não foi possível salvar a origem.');
    return { success: true };
  });

export const editarOrigem = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; nome?: string; ativo?: boolean; excluir?: boolean }) => { if (!i.id) throw new Error('Origem inválida.'); const nome = i.nome?.trim().slice(0, 60); if (i.nome !== undefined && !nome) throw new Error('Informe o nome da origem.'); return { id: i.id, nome, ativo: i.ativo, excluir: !!i.excluir }; })
  .handler(async ({ context, data }) => {
    await owner(context.supabase);
    const { data: atual, error: e0 } = await context.supabase.from('origens_lead').select('nome').eq('id', data.id).single();
    if (e0 || !atual) throw new Error('Origem não encontrada.');
    if (data.excluir) {
      const { count } = await context.supabase.from('alunos').select('id', { count: 'exact', head: true }).eq('origem_lead', atual.nome);
      const { count: nl } = await context.supabase.from('leads').select('id', { count: 'exact', head: true }).eq('origem', atual.nome);
      if (count || nl) throw new Error(`Origem em uso (${count ?? 0} aluno(s), ${nl ?? 0} lead(s)). Desative em vez de excluir.`);
      const { error } = await context.supabase.from('origens_lead').delete().eq('id', data.id);
      if (error) throw new Error('Não foi possível excluir a origem.');
      return { success: true };
    }
    const patch: { nome?: string; ativo?: boolean } = {};
    if (data.nome !== undefined) patch.nome = data.nome;
    if (data.ativo !== undefined) patch.ativo = data.ativo;
    const { error } = await context.supabase.from('origens_lead').update(patch).eq('id', data.id);
    if (error) throw new Error(error.code === '23505' ? 'Essa origem já existe.' : 'Não foi possível salvar a origem.');
    if (data.nome && data.nome !== atual.nome) {
      const { error: e2 } = await context.supabase.from('alunos').update({ origem_lead: data.nome }).eq('origem_lead', atual.nome);
      if (e2) throw new Error('Origem renomeada, mas não foi possível atualizar os alunos.');
      const { error: e3 } = await context.supabase.from('leads').update({ origem: data.nome }).eq('origem', atual.nome);
      if (e3) throw new Error('Origem renomeada, mas não foi possível atualizar os leads.');
    }
    return { success: true };
  });

export type OpcaoPagamento = { id: string; tipo: 'forma' | 'banco'; nome: string; ativo: boolean };
export const listarOpcoesPagamento = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await owner(context.supabase);
  const { data, error } = await context.supabase.from('pagamento_opcoes').select('id,tipo,nome,ativo').order('created_at');
  if (error) throw new Error('Não foi possível carregar as opções de pagamento.');
  return data as OpcaoPagamento[];
});
export const opcoesPagamentoQuery = queryOptions({ queryKey: ['school', 'pagamento-opcoes'], queryFn: () => listarOpcoesPagamento(), staleTime: 60_000 });
export const criarOpcaoPagamento = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((i: { tipo: 'forma' | 'banco'; nome: string }) => { const nome = i.nome.trim().replace(/\s+/g, ' ').slice(0, 60); if (!nome || !['forma', 'banco'].includes(i.tipo)) throw new Error('Informe o nome.'); return { tipo: i.tipo, nome }; })
  .handler(async ({ context, data }) => {
    await owner(context.supabase);
    const { data: row, error } = await context.supabase.from('pagamento_opcoes').insert({ tipo: data.tipo, nome: data.nome }).select('id,tipo,nome,ativo').single();
    if (error) throw new Error(error.code === '23505' ? 'Essa opção já existe.' : 'Não foi possível adicionar a opção.');
    return row as OpcaoPagamento;
  });
