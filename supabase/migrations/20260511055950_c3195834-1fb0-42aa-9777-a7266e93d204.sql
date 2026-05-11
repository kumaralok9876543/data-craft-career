ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS external_job_id TEXT;

UPDATE public.jobs
SET external_job_id = substring(source_url from '([0-9]{8,})(?:/?$|[/?#])')
WHERE source = 'linkedin'
  AND source_url IS NOT NULL
  AND (external_job_id IS NULL OR external_job_id = '');

WITH ranked AS (
  SELECT
    id,
    external_job_id,
    FIRST_VALUE(id) OVER (
      PARTITION BY external_job_id
      ORDER BY
        CASE WHEN source_url NOT LIKE '%?%' THEN 0 ELSE 1 END,
        created_at DESC,
        id
    ) AS keep_id,
    ROW_NUMBER() OVER (
      PARTITION BY external_job_id
      ORDER BY
        CASE WHEN source_url NOT LIKE '%?%' THEN 0 ELSE 1 END,
        created_at DESC,
        id
    ) AS rn
  FROM public.jobs
  WHERE source = 'linkedin'
    AND external_job_id IS NOT NULL
), dupes AS (
  SELECT id, keep_id FROM ranked WHERE rn > 1
)
UPDATE public.bookmarks b
SET job_id = d.keep_id
FROM dupes d
WHERE b.job_id = d.id
  AND NOT EXISTS (
    SELECT 1 FROM public.bookmarks existing
    WHERE existing.user_id = b.user_id AND existing.job_id = d.keep_id
  );

WITH ranked AS (
  SELECT
    id,
    external_job_id,
    FIRST_VALUE(id) OVER (
      PARTITION BY external_job_id
      ORDER BY
        CASE WHEN source_url NOT LIKE '%?%' THEN 0 ELSE 1 END,
        created_at DESC,
        id
    ) AS keep_id,
    ROW_NUMBER() OVER (
      PARTITION BY external_job_id
      ORDER BY
        CASE WHEN source_url NOT LIKE '%?%' THEN 0 ELSE 1 END,
        created_at DESC,
        id
    ) AS rn
  FROM public.jobs
  WHERE source = 'linkedin'
    AND external_job_id IS NOT NULL
), dupes AS (
  SELECT id, keep_id FROM ranked WHERE rn > 1
)
DELETE FROM public.bookmarks b
USING dupes d
WHERE b.job_id = d.id;

WITH ranked AS (
  SELECT
    id,
    external_job_id,
    FIRST_VALUE(id) OVER (
      PARTITION BY external_job_id
      ORDER BY
        CASE WHEN source_url NOT LIKE '%?%' THEN 0 ELSE 1 END,
        created_at DESC,
        id
    ) AS keep_id,
    ROW_NUMBER() OVER (
      PARTITION BY external_job_id
      ORDER BY
        CASE WHEN source_url NOT LIKE '%?%' THEN 0 ELSE 1 END,
        created_at DESC,
        id
    ) AS rn
  FROM public.jobs
  WHERE source = 'linkedin'
    AND external_job_id IS NOT NULL
), dupes AS (
  SELECT id, keep_id FROM ranked WHERE rn > 1
)
UPDATE public.applied_jobs a
SET job_id = d.keep_id
FROM dupes d
WHERE a.job_id = d.id
  AND NOT EXISTS (
    SELECT 1 FROM public.applied_jobs existing
    WHERE existing.user_id = a.user_id AND existing.job_id = d.keep_id
  );

WITH ranked AS (
  SELECT
    id,
    external_job_id,
    FIRST_VALUE(id) OVER (
      PARTITION BY external_job_id
      ORDER BY
        CASE WHEN source_url NOT LIKE '%?%' THEN 0 ELSE 1 END,
        created_at DESC,
        id
    ) AS keep_id,
    ROW_NUMBER() OVER (
      PARTITION BY external_job_id
      ORDER BY
        CASE WHEN source_url NOT LIKE '%?%' THEN 0 ELSE 1 END,
        created_at DESC,
        id
    ) AS rn
  FROM public.jobs
  WHERE source = 'linkedin'
    AND external_job_id IS NOT NULL
), dupes AS (
  SELECT id, keep_id FROM ranked WHERE rn > 1
)
DELETE FROM public.applied_jobs a
USING dupes d
WHERE a.job_id = d.id;

WITH ranked AS (
  SELECT
    id,
    external_job_id,
    FIRST_VALUE(id) OVER (
      PARTITION BY external_job_id
      ORDER BY
        CASE WHEN source_url NOT LIKE '%?%' THEN 0 ELSE 1 END,
        created_at DESC,
        id
    ) AS keep_id,
    ROW_NUMBER() OVER (
      PARTITION BY external_job_id
      ORDER BY
        CASE WHEN source_url NOT LIKE '%?%' THEN 0 ELSE 1 END,
        created_at DESC,
        id
    ) AS rn
  FROM public.jobs
  WHERE source = 'linkedin'
    AND external_job_id IS NOT NULL
), dupes AS (
  SELECT id, keep_id FROM ranked WHERE rn > 1
)
UPDATE public.recommendations r
SET job_id = d.keep_id
FROM dupes d
WHERE r.job_id = d.id;

WITH ranked AS (
  SELECT
    id,
    external_job_id,
    FIRST_VALUE(id) OVER (
      PARTITION BY external_job_id
      ORDER BY
        CASE WHEN source_url NOT LIKE '%?%' THEN 0 ELSE 1 END,
        created_at DESC,
        id
    ) AS keep_id,
    ROW_NUMBER() OVER (
      PARTITION BY external_job_id
      ORDER BY
        CASE WHEN source_url NOT LIKE '%?%' THEN 0 ELSE 1 END,
        created_at DESC,
        id
    ) AS rn
  FROM public.jobs
  WHERE source = 'linkedin'
    AND external_job_id IS NOT NULL
), dupes AS (
  SELECT id, keep_id FROM ranked WHERE rn > 1
)
UPDATE public.auto_apply_queue q
SET job_id = d.keep_id
FROM dupes d
WHERE q.job_id = d.id
  AND NOT EXISTS (
    SELECT 1 FROM public.auto_apply_queue existing
    WHERE existing.user_id = q.user_id AND existing.job_id = d.keep_id
  );

WITH ranked AS (
  SELECT
    id,
    external_job_id,
    FIRST_VALUE(id) OVER (
      PARTITION BY external_job_id
      ORDER BY
        CASE WHEN source_url NOT LIKE '%?%' THEN 0 ELSE 1 END,
        created_at DESC,
        id
    ) AS keep_id,
    ROW_NUMBER() OVER (
      PARTITION BY external_job_id
      ORDER BY
        CASE WHEN source_url NOT LIKE '%?%' THEN 0 ELSE 1 END,
        created_at DESC,
        id
    ) AS rn
  FROM public.jobs
  WHERE source = 'linkedin'
    AND external_job_id IS NOT NULL
), dupes AS (
  SELECT id, keep_id FROM ranked WHERE rn > 1
)
DELETE FROM public.auto_apply_queue q
USING dupes d
WHERE q.job_id = d.id;

WITH ranked AS (
  SELECT
    id,
    external_job_id,
    ROW_NUMBER() OVER (
      PARTITION BY external_job_id
      ORDER BY
        CASE WHEN source_url NOT LIKE '%?%' THEN 0 ELSE 1 END,
        created_at DESC,
        id
    ) AS rn
  FROM public.jobs
  WHERE source = 'linkedin'
    AND external_job_id IS NOT NULL
)
DELETE FROM public.jobs j
USING ranked r
WHERE j.id = r.id
  AND r.rn > 1;

UPDATE public.jobs
SET source_url = regexp_replace(source_url, '\?.*$', '')
WHERE source = 'linkedin'
  AND source_url LIKE '%?%';

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_linkedin_external_job_id_unique
ON public.jobs (external_job_id)
WHERE source = 'linkedin' AND external_job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_external_job_id
ON public.jobs (external_job_id);