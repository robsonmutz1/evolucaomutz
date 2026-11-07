import { describe,it,expect } from 'vitest';
import { validarMatriculas,validarFollowup,turmaPermitida,receitasMatriculas,validarFoto,dataBrasilia,type MatriculaInput,type Turma } from './pedagogico';
const m=(ordem:number,curso='c'+ordem,turma='t'+ordem):MatriculaInput=>({ordem,curso_id:curso,turma_id:turma,horario_id:null,status:'cursando',data_conclusao:null,motivo_cancelamento:null,valor_mensal:100});
const t:Turma={id:'t1',codigo:'MAN-01',curso_id:'c1',horario_id:null,data_inicio:null,data_previsao_termino:null,disponivel_matricula:false,status:'em_andamento',observacoes:null,created_at:''};
describe('Regras pedagógicas',()=>{
 it('permite no máximo dois cursos',()=>{expect(validarMatriculas([m(1),m(2)])).toHaveLength(2);expect(()=>validarMatriculas([m(1),m(2),m(3)])).toThrow();});
 it('não permite repetir o curso',()=>expect(()=>validarMatriculas([m(1,'igual'),m(2,'igual')])).toThrow());
 it('não permite repetir a turma',()=>expect(()=>validarMatriculas([m(1,'a','igual'),m(2,'b','igual')])).toThrow());
 it('novas matrículas exigem turma aberta em andamento',()=>{expect(turmaPermitida(t,'c1',null)).toBe(false);expect(turmaPermitida({...t,disponivel_matricula:true},'c1',null)).toBe(true);expect(turmaPermitida({...t,disponivel_matricula:true,status:'encerrada'},'c1',null)).toBe(false);});
 it('preserva turma fechada do aluno em edição',()=>expect(turmaPermitida(t,'c1','t1')).toBe(true));
 it('conta receita de matrícula uma vez por aluno',()=>expect(receitasMatriculas([{id:'a',valor_matricula:50,data_matricula:'2026-11-07'},{id:'a',valor_matricula:50,data_matricula:'2026-11-07'}])).toEqual([{mes:'2026-11',valor:50}]));
 it('preserva valores de matrícula desconhecidos',()=>expect(receitasMatriculas([{id:'a',valor_matricula:null,data_matricula:null}])).toEqual([]));
 it('follow-up aceita data editada e rejeita data impossível',()=>{expect(validarFollowup({data:'2026-10-01',descricao:'Ocorrência'}).data).toBe('2026-10-01');expect(()=>validarFollowup({data:'2026-02-30',descricao:'Ocorrência'})).toThrow();});
 it('dia padrão usa Brasília',()=>expect(dataBrasilia(new Date('2026-11-08T01:00:00Z'))).toBe('2026-11-07'));
 it('foto limita formatos e 5 MB',()=>{expect(()=>validarFoto({type:'image/jpeg',size:5*1024*1024})).not.toThrow();expect(()=>validarFoto({type:'image/jpeg',size:5*1024*1024+1})).toThrow();expect(()=>validarFoto({type:'application/pdf',size:1})).toThrow();});
});
