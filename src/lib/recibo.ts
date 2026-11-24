// Client-safe helpers for provider payment receipts.
export const ESCOLA = { nome: 'R M GONCALVES EVOLUCAO MUTZ', cnpj: '45.655.281/0001-59', endereco: 'Rua Nelson Sampaio, 270 - Glória', cidade: 'Vila Velha/ES', cep: '29.122-340' };
export const PASSAGEM_PADRAO = 5.1;
const cents = (v: number) => Math.round(v * 100);
export function totalPagamento(aulas: number, passagens: number, valorPassagem: number, extras: { valor: number }[]) {
  return (cents(aulas) + Math.round(passagens * cents(valorPassagem)) + extras.reduce((s, e) => s + (e.valor > 0 ? cents(e.valor) : 0), 0)) / 100;
}
export const mesSeguinte = (mes: string) => { const y = Number(mes.slice(0, 4)), m = Number(mes.slice(5, 7)); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; };
export const formatCpf = (v: string | null | undefined) => { const d = (v ?? '').replace(/\D/g, ''); return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : (v ?? ''); };
const U = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const D = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const C = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
function ate999(n: number): string {
  if (n === 100) return 'cem';
  const c = Math.floor(n / 100), r = n % 100, parts: string[] = [];
  if (c) parts.push(C[c] ?? '');
  if (r < 20) { if (r) parts.push(U[r] ?? ''); } else { parts.push((D[Math.floor(r / 10)] ?? '') + (r % 10 ? ' e ' + (U[r % 10] ?? '') : '')); }
  return parts.join(' e ');
}
function inteiro(n: number): string {
  if (n === 0) return 'zero';
  const mi = Math.floor(n / 1e6), mil = Math.floor((n % 1e6) / 1000), r = n % 1000, parts: string[] = [];
  if (mi) parts.push(mi === 1 ? 'um milhão' : ate999(mi) + ' milhões');
  if (mil) parts.push(mil === 1 ? 'mil' : ate999(mil) + ' mil');
  if (r) parts.push(ate999(r));
  if (parts.length > 1 && (r < 100 || r % 100 === 0) && r) return parts.slice(0, -1).join(' ') + ' e ' + (parts.at(-1) ?? '');
  return parts.join(' ');
}
export function porExtenso(valor: number) {
  const total = cents(valor), reais = Math.floor(total / 100), cent = total % 100, out: string[] = [];
  if (reais) out.push(inteiro(reais) + (reais === 1 ? ' real' : (reais % 1e6 === 0 ? ' de reais' : ' reais')));
  if (cent) out.push(inteiro(cent) + (cent === 1 ? ' centavo' : ' centavos'));
  return out.length ? out.join(' e ') : 'zero reais';
}
