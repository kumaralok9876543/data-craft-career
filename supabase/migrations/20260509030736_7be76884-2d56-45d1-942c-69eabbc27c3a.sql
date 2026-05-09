ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS work_mode text DEFAULT 'Not specified';

CREATE INDEX IF NOT EXISTS idx_jobs_work_mode ON public.jobs (work_mode);
CREATE INDEX IF NOT EXISTS idx_jobs_experience_bucket ON public.jobs (experience_bucket);