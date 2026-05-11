DO $$
DECLARE
  pat text := 'data engineer|analytics engineer|big ?data engineer|etl developer|data platform engineer|data infrastructure|lakehouse engineer';
BEGIN
  DELETE FROM public.bookmarks WHERE job_id IN (SELECT id FROM public.jobs WHERE title !~* pat);
  DELETE FROM public.recommendations WHERE job_id IN (SELECT id FROM public.jobs WHERE title !~* pat);
  DELETE FROM public.job_skills WHERE job_id IN (SELECT id FROM public.jobs WHERE title !~* pat);
  DELETE FROM public.applied_jobs WHERE job_id IN (SELECT id FROM public.jobs WHERE title !~* pat);
  DELETE FROM public.auto_apply_queue WHERE job_id IN (SELECT id FROM public.jobs WHERE title !~* pat);
  DELETE FROM public.jobs WHERE title !~* pat;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'applied_jobs_job_id_fkey'
  ) THEN
    ALTER TABLE public.applied_jobs
      ADD CONSTRAINT applied_jobs_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;
  END IF;
END $$;