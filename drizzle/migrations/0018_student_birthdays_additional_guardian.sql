ALTER TABLE public.alunos ADD COLUMN data_nascimento date, ADD COLUMN outro_responsavel text, ADD COLUMN telefone_outro_responsavel text;
ALTER TABLE public.alunos ADD CONSTRAINT alunos_nascimento_valido CHECK (data_nascimento IS NULL OR (data_nascimento >= DATE '1900-01-01' AND data_nascimento <= CURRENT_DATE));
DO $migration$ DECLARE definition text; BEGIN
SELECT pg_get_functiondef('public.pedagogico_salvar_aluno(jsonb,jsonb)'::regprocedure) INTO definition;
definition := replace(definition, 'codigo=EXCLUDED.codigo,nome=EXCLUDED.nome', 'data_nascimento=EXCLUDED.data_nascimento,outro_responsavel=EXCLUDED.outro_responsavel,telefone_outro_responsavel=EXCLUDED.telefone_outro_responsavel,codigo=EXCLUDED.codigo,nome=EXCLUDED.nome');
IF position('data_nascimento=EXCLUDED.data_nascimento' in definition)=0 THEN RAISE EXCEPTION 'Student update anchor missing'; END IF;
EXECUTE definition;
END $migration$;
CREATE OR REPLACE FUNCTION public.crm_converter_aluno() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
 IF NEW.status = 'Ativo' THEN
  UPDATE public.leads SET etapa = 'Matriculado', aluno_id = NEW.id, data_fechamento = now()
  WHERE etapa NOT IN ('Matriculado','Perdido') AND (
   (public.crm_chave_telefone(NEW.telefone) <> '' AND public.crm_chave_telefone(telefone) = public.crm_chave_telefone(NEW.telefone)) OR
   (public.crm_chave_telefone(NEW."telefoneResponsavel") <> '' AND public.crm_chave_telefone(telefone) = public.crm_chave_telefone(NEW."telefoneResponsavel")) OR
   (public.crm_chave_telefone(NEW.telefone_outro_responsavel) <> '' AND public.crm_chave_telefone(telefone) = public.crm_chave_telefone(NEW.telefone_outro_responsavel))
  );
 END IF;
 RETURN NEW;
END $function$;
DROP TRIGGER aaa_crm_lock_student ON public.alunos;
CREATE TRIGGER aaa_crm_lock_student BEFORE INSERT OR UPDATE OF telefone,"telefoneResponsavel",telefone_outro_responsavel ON public.alunos FOR EACH ROW EXECUTE FUNCTION public.crm_lock_phone_writes();
DROP TRIGGER crm_converter_aluno ON public.alunos;
CREATE TRIGGER crm_converter_aluno AFTER INSERT OR UPDATE OF telefone,"telefoneResponsavel",telefone_outro_responsavel ON public.alunos FOR EACH ROW EXECUTE FUNCTION public.crm_converter_aluno();