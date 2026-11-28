import { brl, formatData, formatMes, type Aluno } from '@/lib/alunos';
import { ESCOLA, porExtenso } from '@/lib/recibo';
import { rotuloForma, rotuloParcela, type Parcela } from '@/lib/mensalidades';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export interface DadosRecibo { data: string; valor: number; forma: string; banco?: string | null; conta?: string | null }

/** Printable receipt for a settled installment, handed to whoever paid. */
export function imprimirReciboMensalidade(p: Parcela, aluno: Aluno | undefined, d: DadosRecibo, target?: Window | null) {
  const w = target ?? window.open('', '_blank');
  if (!w) return;
  const pagador = aluno?.responsavel?.trim() || aluno?.nome || '';
  const diferenca = Math.round((d.valor - p.valor) * 100) / 100;
  const linhas = [`<tr><td>${esc(rotuloParcela(p))} · referência ${formatMes(p.referencia)} · vencimento ${formatData(p.vencimento)}${p.observacao?.startsWith('Curso extra: ') ? ` · ${esc(p.observacao)}` : ''}</td><td>${brl(p.valor)}</td></tr>`];
  if (diferenca < 0) linhas.push(`<tr><td>Desconto concedido</td><td>- ${brl(-diferenca)}</td></tr>`);
  if (diferenca > 0) linhas.push(`<tr><td>Multa e juros por atraso</td><td>${brl(diferenca)}</td></tr>`);
  const recebido = [rotuloForma(d.forma), d.banco, d.conta ? `Conta: ${d.conta}` : ''].filter(Boolean).map((x) => esc(String(x))).join(' · ');
  w.document.open();
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Recibo ${esc(aluno?.nome ?? '')} ${p.referencia}</title><style>
body{font-family:Arial,sans-serif;color:#111;max-width:760px;margin:32px auto;padding:0 24px;font-size:14px}h1{text-align:center;font-size:22px;letter-spacing:2px;margin:8px 0 24px}
.box{border:1px solid #333;padding:10px 14px;margin-bottom:14px}.box small{display:block;color:#555;font-size:11px;text-transform:uppercase}table{width:100%;border-collapse:collapse;margin:12px 0}td{border:1px solid #333;padding:8px}td:last-child{text-align:right;white-space:nowrap;width:130px}
tfoot td{font-weight:bold}.sign{display:flex;gap:40px;margin-top:70px}.sign div{flex:1;border-top:1px solid #111;text-align:center;padding-top:6px;font-size:12px}@media print{button{display:none}}</style></head><body>
<h1>RECIBO</h1>
<div class="box"><small>Escola</small><strong>${ESCOLA.nome}</strong> · CNPJ ${ESCOLA.cnpj}<br>${ESCOLA.endereco} · CEP ${ESCOLA.cep} · ${ESCOLA.cidade}</div>
<div class="box"><small>Aluno</small><strong>${esc(aluno ? `${aluno.codigo} ${aluno.nome}` : '—')}</strong>${aluno?.curso ? ` · Curso: ${esc(aluno.curso)}` : ''}${aluno?.responsavel ? `<br>Responsável: ${esc(aluno.responsavel)}` : ''}</div>
<p>Recebemos de <strong>${esc(pagador) || '________________________'}</strong> a importância de <strong>${brl(d.valor)}</strong> (${porExtenso(d.valor)}), referente a:</p>
<table><tbody>${linhas.join('')}</tbody><tfoot><tr><td>Total pago</td><td>${brl(d.valor)}</td></tr></tfoot></table>
<div class="box"><small>Forma de pagamento e recebimento</small>${recebido || '—'} · Pago em ${formatData(d.data)}</div>
<p style="text-align:right">${ESCOLA.cidade.split('/')[0]}, ${formatData(d.data)}</p>
<div class="sign"><div>${ESCOLA.nome}<br>Recebedor</div><div>${esc(pagador)}<br>Pagador</div></div>
<p style="text-align:center;margin-top:30px"><button onclick="window.print()">Imprimir / Salvar PDF</button></p></body></html>`);
  w.document.close();
}
