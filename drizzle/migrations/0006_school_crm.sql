ALTER TABLE public.alunos ADD COLUMN telefone text NOT NULL DEFAULT '', ADD COLUMN "telefoneResponsavel" text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.crm_telefone(numero text) RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE n text := regexp_replace(coalesce(numero,''), '[^0-9]', '', 'g');
BEGIN
 IF length(n) > 11 AND left(n,2) = '55' THEN n := substring(n from 3); END IF;
 RETURN n;
END $$;
CREATE OR REPLACE FUNCTION public.crm_chave_telefone(numero text) RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE n text := public.crm_telefone(numero);
BEGIN
 IF length(n) = 11 AND substring(n from 3 for 1) = '9' THEN n := left(n,2) || substring(n from 4); END IF;
 RETURN n;
END $$;

CREATE TABLE public.leads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(),
 telefone text NOT NULL, nome_responsavel text NOT NULL, nome_aluno text,
 idade_aluno integer CHECK (idade_aluno BETWEEN 0 AND 120),
 turno_interesse text NOT NULL DEFAULT 'Ainda não definiu' CHECK (turno_interesse IN ('Sábado','Semana - Manhã','Semana - Tarde','Semana - Noite','Ainda não definiu')),
 curso_interesse text NOT NULL DEFAULT '', origem text NOT NULL DEFAULT 'WhatsApp direto' CHECK (origem IN ('Anúncio Instagram/Facebook','Indicação','WhatsApp direto','Passou na frente','Google','Outro')),
 consultor_responsavel uuid, valor_mensalidade_negociado numeric CHECK (valor_mensalidade_negociado >= 0),
 etapa text NOT NULL DEFAULT 'Novo lead' CHECK (etapa IN ('Novo lead','Respondeu','Sem resposta','Em negociação','Matriculado','Perdido')),
 observacoes text NOT NULL DEFAULT '', data_ultimo_contato timestamptz, data_proximo_contato date,
 aluno_id uuid REFERENCES public.alunos(id), data_fechamento timestamptz,
 motivo_perda text, pos_venda_realizado boolean NOT NULL DEFAULT false, data_pos_venda timestamptz,
 CHECK (etapa <> 'Perdido' OR length(trim(coalesce(motivo_perda,''))) > 0)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner only CRM leads" ON public.leads FOR ALL TO authenticated USING (public.has_owner_access()) WITH CHECK (public.has_owner_access());
CREATE UNIQUE INDEX leads_telefone_unique ON public.leads (public.crm_chave_telefone(telefone));
CREATE INDEX leads_proximo_contato ON public.leads (data_proximo_contato);
CREATE INDEX leads_created_at ON public.leads (created_at);

CREATE TABLE public.lead_interacoes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), tipo text NOT NULL CHECK (tipo IN ('WhatsApp','Ligação','Visita','Aula experimental','Pós-venda','Anotação','Automático')),
 descricao text NOT NULL CHECK (length(trim(descricao)) > 0)
);
GRANT SELECT, INSERT ON public.lead_interacoes TO authenticated;
GRANT ALL ON public.lead_interacoes TO service_role;
ALTER TABLE public.lead_interacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads CRM history" ON public.lead_interacoes FOR SELECT TO authenticated USING (public.has_owner_access());
CREATE POLICY "Owner adds CRM contacts" ON public.lead_interacoes FOR INSERT TO authenticated WITH CHECK (public.has_owner_access() AND tipo <> 'Automático');
CREATE INDEX lead_interacoes_lead ON public.lead_interacoes (lead_id, created_at);

CREATE OR REPLACE FUNCTION public.crm_validar_lead() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 NEW.telefone := public.crm_telefone(NEW.telefone);
 IF length(NEW.telefone) NOT IN (10,11) THEN RAISE EXCEPTION 'Informe um telefone com DDD válido.'; END IF;
 IF length(trim(NEW.nome_responsavel)) = 0 THEN RAISE EXCEPTION 'Informe o nome do responsável.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(public.crm_chave_telefone(NEW.telefone), 0));
 IF TG_OP = 'INSERT' OR NEW.telefone IS DISTINCT FROM OLD.telefone THEN
  IF EXISTS (SELECT 1 FROM public.leads l WHERE l.id <> NEW.id AND public.crm_chave_telefone(l.telefone) = public.crm_chave_telefone(NEW.telefone)) THEN RAISE EXCEPTION 'Já existe um lead com esse telefone.'; END IF;
  IF EXISTS (SELECT 1 FROM public.alunos a WHERE (public.crm_chave_telefone(a.telefone) = public.crm_chave_telefone(NEW.telefone) OR public.crm_chave_telefone(a."telefoneResponsavel") = public.crm_chave_telefone(NEW.telefone)) AND (NEW.aluno_id IS NULL OR a.id <> NEW.aluno_id)) THEN RAISE EXCEPTION 'Esse telefone já pertence a um aluno cadastrado.'; END IF;
 END IF;
 IF NEW.consultor_responsavel IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.consultor_responsavel AND role = 'owner') THEN RAISE EXCEPTION 'Consultor sem acesso à escola.'; END IF;
 IF NEW.etapa = 'Matriculado' AND NEW.data_fechamento IS NULL THEN NEW.data_fechamento := now(); END IF;
 IF NEW.etapa <> 'Perdido' THEN NEW.motivo_perda := NULL; END IF;
 IF NEW.etapa <> 'Matriculado' THEN NEW.data_fechamento := NULL; NEW.pos_venda_realizado := false; NEW.data_pos_venda := NULL; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER crm_validar_lead BEFORE INSERT OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.crm_validar_lead();

CREATE OR REPLACE FUNCTION public.crm_historico_lead() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE mensagem text;
BEGIN
 IF TG_OP = 'INSERT' THEN
  INSERT INTO public.lead_interacoes(lead_id,tipo,descricao) VALUES(NEW.id,'Automático','Lead cadastrado - etapa: ' || NEW.etapa);
 ELSE
  IF NEW.etapa IS DISTINCT FROM OLD.etapa THEN
   mensagem := CASE WHEN NEW.etapa = 'Matriculado' AND NEW.aluno_id IS NOT NULL THEN 'Matrícula realizada - convertido automaticamente' ELSE 'Etapa alterada: ' || OLD.etapa || ' → ' || NEW.etapa END;
   IF NEW.etapa = 'Perdido' THEN mensagem := mensagem || '. Motivo: ' || NEW.motivo_perda; END IF;
   INSERT INTO public.lead_interacoes(lead_id,tipo,descricao) VALUES(NEW.id,'Automático',mensagem);
  END IF;
  IF NEW.valor_mensalidade_negociado IS DISTINCT FROM OLD.valor_mensalidade_negociado THEN
   INSERT INTO public.lead_interacoes(lead_id,tipo,descricao) VALUES(NEW.id,'Automático','Mensalidade negociada alterada: ' || coalesce(OLD.valor_mensalidade_negociado::text,'Não informada') || ' → ' || coalesce(NEW.valor_mensalidade_negociado::text,'Não informada'));
  END IF;
  IF NEW.consultor_responsavel IS DISTINCT FROM OLD.consultor_responsavel THEN
   INSERT INTO public.lead_interacoes(lead_id,tipo,descricao) VALUES(NEW.id,'Automático','Consultor responsável alterado.');
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER crm_historico_lead AFTER INSERT OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.crm_historico_lead();

CREATE OR REPLACE FUNCTION public.crm_converter_aluno() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NEW.status = 'Ativo' THEN
  UPDATE public.leads SET etapa = 'Matriculado', aluno_id = NEW.id, data_fechamento = now()
  WHERE etapa NOT IN ('Matriculado','Perdido') AND (
   (public.crm_chave_telefone(NEW.telefone) <> '' AND public.crm_chave_telefone(telefone) = public.crm_chave_telefone(NEW.telefone)) OR
   (public.crm_chave_telefone(NEW."telefoneResponsavel") <> '' AND public.crm_chave_telefone(telefone) = public.crm_chave_telefone(NEW."telefoneResponsavel"))
  );
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER crm_converter_aluno AFTER INSERT OR UPDATE OF telefone, "telefoneResponsavel" ON public.alunos FOR EACH ROW EXECUTE FUNCTION public.crm_converter_aluno();

CREATE OR REPLACE FUNCTION public.crm_consultores() RETURNS TABLE(id uuid, nome text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT public.has_owner_access() THEN RAISE EXCEPTION 'Acesso não autorizado.'; END IF;
 RETURN QUERY SELECT DISTINCT r.user_id, u.email::text FROM public.user_roles r JOIN auth.users u ON u.id = r.user_id WHERE r.role = 'owner';
END $$;
REVOKE ALL ON FUNCTION public.crm_consultores() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_consultores() TO authenticated;

CREATE OR REPLACE FUNCTION public.crm_registrar_contato(p_lead_id uuid, p_tipo text, p_descricao text, p_proximo date DEFAULT NULL) RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NOT public.has_owner_access() THEN RAISE EXCEPTION 'Acesso não autorizado.'; END IF;
 IF p_tipo NOT IN ('WhatsApp','Ligação','Visita','Aula experimental','Pós-venda','Anotação') THEN RAISE EXCEPTION 'Tipo de contato inválido.'; END IF;
 IF p_tipo = 'Pós-venda' AND NOT EXISTS(SELECT 1 FROM public.leads WHERE id = p_lead_id AND etapa = 'Matriculado') THEN RAISE EXCEPTION 'Pós-venda exige matrícula.'; END IF;
 INSERT INTO public.lead_interacoes(lead_id,tipo,descricao) VALUES(p_lead_id,p_tipo,p_descricao);
 UPDATE public.leads SET data_ultimo_contato = CASE WHEN p_tipo = 'Anotação' THEN data_ultimo_contato ELSE now() END,
 data_proximo_contato = p_proximo,
 pos_venda_realizado = CASE WHEN p_tipo = 'Pós-venda' THEN true ELSE pos_venda_realizado END,
 data_pos_venda = CASE WHEN p_tipo = 'Pós-venda' THEN now() ELSE data_pos_venda END
 WHERE id = p_lead_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Lead não encontrado.'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.crm_registrar_contato(uuid,text,text,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_registrar_contato(uuid,text,text,date) TO authenticated;

REVOKE ALL ON FUNCTION public.crm_validar_lead(), public.crm_historico_lead(), public.crm_converter_aluno() FROM PUBLIC, anon, authenticated;
