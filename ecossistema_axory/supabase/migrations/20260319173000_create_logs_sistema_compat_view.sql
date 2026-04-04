-- Compatibilidade para rotinas antigas que ainda referenciam public.logs_sistema
-- O nome atual correto da tabela é public.sis_logs_sistema.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'sis_logs_sistema'
  ) THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.logs_sistema AS SELECT * FROM public.sis_logs_sistema';
  END IF;
END $$;
