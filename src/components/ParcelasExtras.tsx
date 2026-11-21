import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { brl, formatData, type Aluno } from '@/lib/alunos';
import { dataBrasilia } from '@/lib/pedagogico';
import { gerarParcelasExtras } from '@/lib/mensalidades';
import { adicionarParcelasExtras } from '@/lib/mensalidades.functions';

export function ParcelasExtras({ aluno, initialOpen = false }: { aluno: Aluno; initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const [saving, setSaving] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [qtd, setQtd] = useState('');
  const [vencimento, setVencimento] = useState(dataBrasilia());
  const lote = useRef<string | null>(null);
  const adicionar = useServerFn(adicionarParcelasExtras);
  const qc = useQueryClient();
  const parcelas = useMemo(() => {
    try { return gerarParcelasExtras({ primeiroVencimento: vencimento, qtd: Number(qtd), valor: Number(valor) }); }
    catch { return []; }
  }, [vencimento, qtd, valor]);
  if (!open) return <Button type="button" variant="outline" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Adicionar parcelas extras</Button>;
  return <section aria-label="Parcelas extras" className="space-y-3 border-y py-4">
    <h3 className="font-semibold">Adicionar parcelas extras</h3>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="min-w-0 space-y-1"><Label htmlFor="extra-descricao">Curso / descrição</Label><Input id="extra-descricao" maxLength={120} placeholder="Nome do curso adicional" disabled={saving} value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
      <div className="min-w-0 space-y-1"><Label htmlFor="extra-valor">Valor de cada parcela (R$)</Label><Input id="extra-valor" type="number" min="0.01" step="0.01" disabled={saving} value={valor} onChange={(e) => setValor(e.target.value)} /></div>
      <div className="min-w-0 space-y-1"><Label htmlFor="extra-qtd">Quantidade de parcelas extras</Label><Input id="extra-qtd" type="number" min={1} max={60} step={1} disabled={saving} value={qtd} onChange={(e) => setQtd(e.target.value)} /></div>
      <div className="min-w-0 space-y-1"><Label htmlFor="extra-vencimento">Primeiro vencimento</Label><Input id="extra-vencimento" type="date" lang="pt-BR" disabled={saving} value={vencimento} onChange={(e) => setVencimento(e.target.value)} /></div>
    </div>
    {parcelas.length > 0 && <div className="space-y-2">
      <div className="flex flex-wrap justify-between gap-2 text-sm"><span>{parcelas.length} parcelas · {brl(Number(valor))} cada</span><strong>Total: {brl(Math.round(Number(valor) * parcelas.length * 100) / 100)}</strong></div>
      <div className="max-h-40 overflow-y-auto"><table className="w-full text-sm"><thead className="text-left text-muted-foreground"><tr><th className="py-1">Parcela extra</th><th>Vencimento</th><th className="text-right">Valor</th></tr></thead><tbody>{parcelas.map((p) => <tr key={p.referencia} className="border-t"><td className="py-1">{p.parcela}</td><td>{formatData(p.vencimento)}</td><td className="text-right">{brl(p.valor)}</td></tr>)}</tbody></table></div>
    </div>}
    <div className="flex flex-wrap gap-2"><Button type="button" disabled={saving || !parcelas.length || !descricao.trim()} onClick={async () => {
      if (saving || !window.confirm(`Adicionar ${parcelas.length} parcelas de ${brl(Number(valor))} para ${descricao.trim()}? As parcelas atuais serão mantidas.`)) return;
      setSaving(true);
      lote.current ??= crypto.randomUUID();
      try {
        const result = await adicionar({ data: { aluno_id: aluno.id, lote: lote.current, descricao, parcelas } });
        await qc.invalidateQueries({ queryKey: ['school', 'mensalidades'] });
        toast.success(result.quantidade ? 'Parcelas extras adicionadas' : 'Estas parcelas extras já foram adicionadas');
        lote.current = null; setDescricao(''); setValor(''); setQtd(''); setOpen(false);
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível adicionar parcelas extras.'); }
      finally { setSaving(false); }
    }}>{saving ? 'Adicionando…' : 'Confirmar parcelas extras'}</Button><Button type="button" variant="ghost" disabled={saving} onClick={() => setOpen(false)}>Voltar</Button></div>
  </section>;
}