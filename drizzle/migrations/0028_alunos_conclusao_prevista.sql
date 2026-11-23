ALTER TABLE public.alunos ADD COLUMN conclusao_prevista text;
UPDATE public.alunos a SET conclusao_prevista = m.ref
FROM (SELECT aluno_id, max(referencia) ref FROM public.mensalidades
      WHERE tipo='mensalidade' AND situacao<>'cancelada' AND referencia ~ '^\d{4}-(0[1-9]|1[0-2])$' GROUP BY aluno_id) m
WHERE m.aluno_id = a.id AND a.conclusao_prevista IS NULL;
ALTER TABLE public.alunos ADD CONSTRAINT alunos_conclusao_prevista_formato CHECK (conclusao_prevista IS NULL OR conclusao_prevista ~ '^\d{4}-(0[1-9]|1[0-2])$');