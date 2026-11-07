import { useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FinanceiroDatePicker } from './FinanceiroDatePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs,TabsList,TabsTrigger,TabsContent } from '@/components/ui/tabs';
import { brl,formatMes,ultimaMensalidade,valorComDesconto,type Aluno } from '@/lib/alunos';
import { dataBrasilia,validarMatriculas,type MatriculaInput } from '@/lib/pedagogico';
import { pedagogicoQuery } from '@/lib/pedagogico.functions';
import { StudentCourses,emptyCourse } from './StudentCourses';
import { StudentFollowups } from './StudentFollowups';
import { StudentPhoto } from './StudentPhoto';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/lib/store';
export function AlunoForm({ aluno, onClose, onSave }: { aluno: Aluno; onClose: () => void; onSave?: (a: Aluno) => Promise<void> }) {
  const {salvar,alunos}=useStore();
  const {data:pedagogico}=useSuspenseQuery(pedagogicoQuery);
  const original:MatriculaInput[]=pedagogico.matriculas.filter(m=>m.aluno_id===aluno.id).sort((a,b)=>a.ordem-b.ordem);
  const [ms,setMs]=useState<MatriculaInput[]>(original.length?original:[emptyCourse(1)]);
  const [photo,setPhoto]=useState<Blob|null>(null);
  const [removePhoto,setRemovePhoto]=useState(false);
  const exists=alunos.some(a=>a.id===aluno.id);
  const [f, setF] = useState(aluno);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Aluno>(k: K, v: Aluno[K]) => setF((p) => ({ ...p, [k]: v }));
  const txt = (k: keyof Aluno, label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {type==='date'?<FinanceiroDatePicker label={label} value={String(f[k]??'')} onChange={v=>set(k,v as never)}/>:<Input
        aria-label={label}
        type={type}
        value={String(f[k] ?? "")}
        onChange={(e) => {set(k, (type === "number" ? (['valorMensal','valor_matricula'].includes(k) && e.target.value === '' ? null : Number(e.target.value)) : (type === 'date' && k==='data_matricula' && !e.target.value ? null : e.target.value)) as never);if(k==='valor_matricula'&&e.target.value)setF(p=>({...p,data_matricula:p.data_matricula??dataBrasilia()}));}}
      />}
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle className="font-display text-2xl">{aluno.nome ? "Editar aluno" : "Novo aluno"}</DialogTitle></DialogHeader>
        <Tabs defaultValue="cadastro"><TabsList className="mb-4"><TabsTrigger value="cadastro">Cadastro</TabsTrigger><TabsTrigger value="followup" disabled={!exists}>Follow-up</TabsTrigger></TabsList><TabsContent value="cadastro"><form
          className="space-y-6"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!f.nome.trim()) { toast.error("Preencha o nome"); return; }
            try { validarMatriculas(ms); if(!exists&&ms.some(m=>!m.curso_id||!m.turma_id))throw new Error('Selecione curso e turma.'); for(const m of ms){const old=original.find(o=>o.ordem===m.ordem);if(m.curso_id!==old?.curso_id&&!m.turma_id)throw new Error('Selecione a turma do curso.');} }catch(err){toast.error(err instanceof Error?err.message:'Confira os cursos.');return;}
            setSaving(true);
            let uploaded:string|null=null;
            try {
              let path=f.foto_url??null;
              if(photo){uploaded=`${f.id}/${crypto.randomUUID()}.webp`;const {error}=await supabase.storage.from('fotos-alunos').upload(uploaded,photo,{contentType:'image/webp'});if(error)throw new Error('Não foi possível enviar a foto.');path=uploaded;}else if(removePhoto)path=null;
              const course=pedagogico.cursos.find(c=>c.id===ms[0]?.curso_id);
              const next={...f,curso:course?.nome??f.curso,foto_url:path,matriculas:ms};
              await (onSave??salvar)(next);
              if(aluno.foto_url&&aluno.foto_url!==path){const {error}=await supabase.storage.from('fotos-alunos').remove([aluno.foto_url]);if(error)toast.error('Aluno salvo, mas não foi possível apagar a foto anterior.');}
              if(!onSave){toast.success('Aluno salvo');onClose();}
            } catch(err) { if(uploaded)await supabase.storage.from('fotos-alunos').remove([uploaded]);toast.error(err instanceof Error?err.message:'Não foi possível salvar o aluno.'); }
            finally { setSaving(false); }
          }}
        >
          <StudentPhoto nome={f.nome} path={f.foto_url} onChange={(blob,remove)=>{setPhoto(blob);setRemovePhoto(remove);}}/><section className="grid gap-4 sm:grid-cols-3">
            <h3 className="text-lg font-semibold sm:col-span-3">Dados do aluno</h3>
            {txt("codigo", "Código")}
            <div className="sm:col-span-2">{txt("nome", "Nome")}</div>
            {txt("responsavel", "Responsável")}
            {txt("telefone", "Telefone do aluno", "tel")}
            {txt("telefoneResponsavel", "Telefone do responsável", "tel")}
            <div className="space-y-1.5">
              <Label>CEP</Label>
              <Input value={f.cep ?? ""} inputMode="numeric" placeholder="00000-000" onChange={async (e) => {
                const v = e.target.value; set("cep", v);
                const d = v.replace(/\D/g, "");
                if (d.length !== 8) return;
                try {
                  const r = await (await fetch(`https://viacep.com.br/ws/${d}/json/`)).json();
                  if (r.erro) { toast.error("CEP não encontrado"); return; }
                  setF((p) => ({ ...p, rua: r.logradouro || p.rua, bairro: r.bairro || p.bairro, cidade: r.localidade || p.cidade }));
                } catch { toast.error("Não foi possível buscar o CEP"); }
              }} />
            </div>
            <div className="sm:col-span-2">{txt("rua", "Rua")}</div>
            {txt("numero", "Número")}
            {txt("bairro", "Bairro")}
            {txt("cidade", "Cidade")}
            {txt("dataMatricula", "Data da matrícula", "date")}

          </section>

          <StudentCourses value={ms} original={original} onChange={next=>{if(next.length===2&&next.some((m,i)=>m.valor_mensal!==ms[i]?.valor_mensal)&&next.every(m=>m.valor_mensal!==null))setF(p=>({...p,valorMensal:Math.round(next.reduce((s,m)=>s+(m.valor_mensal??0),0)*100)/100}));setMs(next);}} onDefault={(mensal,matricula)=>setF(p=>({...p,...(ms.length===1&&mensal!==null?{valorMensal:mensal}:{}),...(matricula!==null?{valor_matricula:matricula,data_matricula:p.data_matricula??dataBrasilia()}:{} )}))}/>
          <section className="grid gap-4 rounded-xl bg-muted/50 p-4 sm:grid-cols-3">
            <h3 className="text-lg font-semibold sm:col-span-3">Contrato financeiro</h3>
            {txt("valorMensal", "Valor mensal cheio / combo (R$)", "number")}
            {txt("valor_matricula", "Valor da matrícula (R$)", "number")}
            {txt("data_matricula", "Data da receita de matrícula", "date")}
            <div className="space-y-1.5">
              <Label>Tipo de desconto</Label>
              <Select value={f.descontoTipo} onValueChange={(v) => set("descontoTipo", v as Aluno["descontoTipo"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentual">Percentual (%)</SelectItem>
                  <SelectItem value="valor">Valor (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {txt("desconto", f.descontoTipo === "percentual" ? "Desconto (%)" : "Desconto (R$)", "number")}
            {txt("diaLimiteDesconto", "Dia limite do desconto", "number")}
            {txt("diaVencimento", "Dia de vencimento", "number")}
            {txt("qtdMensalidades", "Quantidade de mensalidades", "number")}
            {txt("primeiraCobranca", "Mês da 1ª cobrança", "month")}
            <Resumo label="Valor com desconto" value={brl(valorComDesconto(f))} />
            <Resumo label="Previsão da última mensalidade" value={f.primeiraCobranca && f.qtdMensalidades > 0 ? formatMes(ultimaMensalidade(f.primeiraCobranca, f.qtdMensalidades)) : "—"} />
          </section>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
          </DialogFooter>
        </form></TabsContent><TabsContent value="followup">{exists&&<StudentFollowups alunoId={aluno.id}/>}</TabsContent></Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Resumo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-xl font-semibold text-primary">{value}</div>
    </div>
  );
}
