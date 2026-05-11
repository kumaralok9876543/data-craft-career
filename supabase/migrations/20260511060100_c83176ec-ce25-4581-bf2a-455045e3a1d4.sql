CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_external_job_id_unique
ON public.jobs (external_job_id);