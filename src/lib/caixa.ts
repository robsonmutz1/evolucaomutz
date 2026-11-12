import type { Database } from '@/integrations/supabase/types';
import type { Lancamento } from './lancamentos';
import { nomeChave, dataValida } from './financeiro-cadastros';
export type ContaCaixa = Database['public']['Tables']['contas_caixa']['Row'];
export type Conferencia = Database['public']['Tables']['conferencias_caixa']['Row'];
export type AlteracaoCaixa = Database['public']['Tables']['caixa_alteracoes']['Row'];
export function centavos(v: number) { return Math.round(v * 100); }
export function lerDinheiro(v: string) {
 const s=v.trim();
 if(!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(s)) throw new Error('Informe um valor válido, por exemplo 1.500,00.');
 const n=Number(s.replace(/\./g,'').replace(',','.'));
 if(!Number.isSafeInteger(centavos(n))||Math.abs(n)>9999999999.99)throw new Error('Valor fora do limite permitido.');
 return n;
}
export const dataCaixa=(l:Lancamento)=>l.data_pagamento??l.data_lancamento??`${l.mes}-01`;
export function saldoConta(c:ContaCaixa, ls:Lancamento[], data:string):number|null {
 if(c.saldo_inicial===null||!c.data_saldo_inicial||c.data_saldo_inicial>data)return null;
 return (centavos(Number(c.saldo_inicial))+ls.filter(l=>l.conta_id===c.id&&l.situacao==='realizado'&&dataCaixa(l)>String(c.data_saldo_inicial)&&dataCaixa(l)<=data).reduce((s,l)=>s+(l.tipo==='entrada'?1:-1)*centavos(l.valor),0))/100;
}
export function diasSemConferencia(c:Conferencia|undefined,hoje:string){return c?Math.floor((Date.parse(hoje+'T12:00:00Z')-Date.parse(c.criado_em.slice(0,10)+'T12:00:00Z'))/86400000):null;}
export type CausaCaixa={tipo:string;texto:string;ids:string[]};
export function diagnosticarCaixa(cs:ContaCaixa[],ls:Lancamento[],conta:string|null,data:string,diferenca:number,ultima?:Conferencia){
 const causas:CausaCaixa[]=[];const rows=ls.filter(l=>conta===null||l.conta_id===conta);const alvo=Math.abs(centavos(diferenca));
 const add=(tipo:string,texto:string,rows:Lancamento[]=[])=>causas.push({tipo,texto,ids:rows.flatMap(l=>l.id?[l.id]:[])});
 const valores=rows.filter(l=>dataCaixa(l)<=data);
 if(alvo>0){
 const exatos=valores.filter(l=>centavos(l.valor)===alvo);if(exatos.length)add('exato',diferenca<0?'Uma receita deste valor pode não ter entrado, ou pode faltar uma despesa paga deste valor.':'Pode faltar uma receita recebida deste valor, ou uma despesa registrada pode não ter sido paga.',exatos);
 const busca=valores.slice(0,300);let pares=0;for(let i=0;i<busca.length&&pares<5;i++)for(let j=i+1;j<busca.length&&pares<5;j++){const a=busca[i],b=busca[j];if(a&&b&&centavos(a.valor)+centavos(b.valor)===alvo){add('par','Estes dois valores somados são iguais à diferença. Confira se ambos realmente entraram ou saíram.',[a,b]);pares++;}}
 }
 const dup=new Map<string,Lancamento[]>();for(const l of valores){const key=[dataCaixa(l),centavos(l.valor),nomeChave(l.descricao??l.categoria),l.aluno_id??'',l.tipo,l.conta_id??''].join('|');dup.set(key,[...(dup.get(key)??[]),l]);}for(const group of dup.values())if(group.length>1)add('duplicado','Mesma data, valor e descrição ou aluno: estes registros podem representar um pagamento contado duas vezes.',group);
 if(alvo>0){const typo=valores.filter(l=>{const v=centavos(l.valor);if(Math.abs(v-v*10)===alvo||v%10===0&&Math.abs(v-v/10)===alvo)return true;for(const esperado of [v-alvo,v+alvo])if(esperado>=0&&esperado!==v&&String(esperado).split('').sort().join('')===String(v).split('').sort().join(''))return true;return false;});if(typo.length)add('digitacao','Confira os números e os centavos: trocar dígitos ou deslocar a vírgula nestes valores pode explicar a diferença.',typo);}
 const sem=ls.filter(l=>!l.conta_id&&dataCaixa(l)<=data);if(sem.length)add('sem-conta','Não sabemos em qual banco ou caixa este dinheiro entrou ou saiu. Defina a conta para completar o saldo.',sem);
 const pend=valores.filter(l=>l.situacao==='pendente'&&dataCaixa(l)<data);if(pend.length)add('pendente','Estes pagamentos venceram e ainda estão pendentes. Se já foram pagos ou recebidos, atualize a situação.',pend);
 const fora=rows.filter(l=>dataCaixa(l)>data||cs.some(c=>c.id===l.conta_id&&c.data_saldo_inicial&&dataCaixa(l)<=c.data_saldo_inicial));if(fora.length)add('periodo','Estes valores não entram no saldo: são futuros ou já pertencem ao saldo inicial. Confira as datas no extrato.',fora);
 for(const c of cs.filter(c=>conta===null||c.id===conta)){if(c.saldo_inicial===null||!c.data_saldo_inicial)add('inicial',`${c.nome}: conta sem saldo inicial. Informe o saldo real e a data de partida.`);else if(!dataValida(c.data_saldo_inicial)||c.data_saldo_inicial>data)add('inicial',`${c.nome}: a data do saldo inicial está depois da data de referência.`);}
 const transfers=new Map<string,Lancamento[]>();for(const l of ls)if(l.transferencia_id)transfers.set(l.transferencia_id,[...(transfers.get(l.transferencia_id)??[]),l]);for(const group of transfers.values())if(group.some(l=>conta===null||l.conta_id===conta)&&(group.length!==2||group[0]?.tipo===group[1]?.tipo||group[0]?.conta_id===group[1]?.conta_id||centavos(group[0]?.valor??0)!==centavos(group[1]?.valor??0)))add('transferencia','Transferência sem entrada e saída equivalentes em contas diferentes. Confira os dois lados.',group);
 if(ultima){const novos=rows.filter(l=>(l.created_at??'')>ultima.criado_em||(l.updated_at??'')>ultima.criado_em);if(novos.length)add('apos','Estes lançamentos foram criados ou alterados depois da última conferência correta. Compare com o extrato.',novos);}
 return causas;
}