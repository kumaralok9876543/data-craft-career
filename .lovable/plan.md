
## Plan: Enhanced Job Aggregator with Experience & Skills Filters

### Problems to fix
1. **"Failed to fetch" intermittent errors** — scraping 35 pages sequentially with no timeout/retry per request causes timeouts in the Worker runtime. Will add per-request timeout, reduce max pages, and add retry logic with exponential backoff.
2. **Experience level is hardcoded to "1-2 years"** — currently every job is saved as "1-2 years" regardless of actual requirements. Will extract experience from job title and description text.
3. **No skill extraction** — job descriptions are minimal placeholder text. Will fetch individual job page details to extract skills and richer descriptions.

### Changes

#### 1. Scraper improvements (`src/server/jobs.functions.ts`)
- Add 5-second timeout per fetch request via `AbortSignal.timeout()`
- Reduce max pages to 20 and add 500ms delay between requests to avoid rate-limiting (fixes intermittent failures)
- Extract experience level from job title using regex patterns (e.g., "2+ years", "Entry Level", "Junior", "Lead") and map to buckets: "0-1 years", "1-2 years", "3-4 years", "5-8 years", "8+ years"
- Remove the `isDataEngineeringRole` filter that excludes senior/staff/principal — instead, keep ALL data engineering roles and let the UI filter by experience
- Extract common Data Engineering skills from the job description/title (Spark, Python, SQL, Airflow, Kafka, Snowflake, dbt, AWS, Azure, GCP, Hadoop, Databricks, etc.) and save to a `skills` text array column on the jobs table
- Generate richer description text including extracted details

#### 2. Database migration
- Add a `skills_extracted` text array column to the `jobs` table for storing extracted skills per job
- Add an `experience_bucket` text column for normalized experience level

#### 3. Dashboard UI (`src/routes/dashboard.tsx`)
- Add **Experience Level filter** dropdown: "All", "0-1 years", "1-2 years (Recommended)", "3-4 years", "5-8 years", "8+ years"
- Add **Skills filter** as multi-select chips for top Data Engineering skills (Python, SQL, Spark, Airflow, Kafka, Snowflake, dbt, AWS, Azure, GCP, Databricks, Hadoop)
- Default experience filter to "1-2 years" with a "Recommended" badge
- Show skills as badges on each job card (already partially supported)
- Update job count to reflect filtered results
- Add a retry button inline when fetch fails

#### 4. JobCard update (`src/components/JobCard.tsx`)
- Display experience bucket badge
- Show extracted skills from the new column

### Technical details
- Experience extraction regex will scan title for patterns like "X+ years", "X-Y years", "junior", "senior", "lead", "principal", "entry level"
- Skills extraction will use keyword matching against a predefined list of ~30 Data Engineering technologies
- The scraper will no longer filter OUT senior roles — all data engineering jobs are kept, tagged by experience level, and the UI handles filtering
