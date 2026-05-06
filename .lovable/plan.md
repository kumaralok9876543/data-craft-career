
# AI Job Aggregator & Career Assistant

## Platform Adaptation

Your original spec calls for Next.js, FastAPI, Docker, Redis, Playwright. Lovable runs **TanStack Start** on **Cloudflare Workers** with **Lovable Cloud** (Supabase PostgreSQL). Here's how each requirement maps:

| Original | Lovable Equivalent |
|---|---|
| Next.js | TanStack Start (React 19, SSR) |
| FastAPI | Server functions (`createServerFn`) |
| PostgreSQL | Lovable Cloud (Supabase PostgreSQL) |
| Redis | Not available; use DB-based caching |
| Playwright scraper | `linkedin-jobs-api` npm package + public job APIs in server functions |
| OpenAI/Claude | Lovable AI Gateway (built-in, no API key needed) |
| Docker | Lovable hosting (automatic) |

**What's NOT possible on Lovable:** Playwright browser scraping, Redis, cron jobs, Celery workers, Docker. Job data will come from the `linkedin-jobs-api` package (public LinkedIn listings) and can be manually refreshed or triggered via UI.

---

## What Gets Built

### 1. Database Schema (Lovable Cloud)

**Tables:**
- `jobs` — job_id, title, company, location, experience_required, salary, description, apply_link, posted_date, source, created_at
- `companies` — id, name, logo_url, website
- `skills` — id, name, category
- `job_skills` — job_id, skill_id (many-to-many)
- `users` — handled by Supabase Auth
- `profiles` — user_id, full_name, target_role, experience_years, location
- `resumes` — id, user_id, file_url, parsed_data (JSONB), uploaded_at
- `bookmarks` — user_id, job_id
- `recommendations` — id, user_id, job_id, match_score, reasoning, created_at

With proper RLS policies, indexes on frequently queried columns, and foreign key relationships.

### 2. Server Functions (Backend API)

All in `src/server/`:

- **Job Fetching** — `jobs.functions.ts`: Uses `linkedin-jobs-api` to fetch Data Engineering jobs in India, parses and stores them in DB. Filters by location, experience, skills. Pagination support.
- **Resume Processing** — `resume.functions.ts`: Upload resume (PDF/text), store in Supabase Storage, use Lovable AI to parse skills/experience/education into structured JSONB.
- **AI Analysis** — `ai.functions.ts`: 
  - Resume vs job match scoring (percentage + missing skills)
  - Skill gap analysis
  - 30-day personalized study plan for Data Engineering (SQL, Python, Spark, Airflow, Cloud)
- **Recommendations** — `recommendations.functions.ts`: AI-powered job recommendations based on user profile and resume.
- **Bookmarks** — `bookmarks.functions.ts`: Save/unsave jobs.

### 3. Frontend Pages

| Route | Purpose |
|---|---|
| `/` | Landing page with hero, features overview |
| `/login` | Email/password + Google auth |
| `/dashboard` | Job listings with filters (location, skills, experience), search, pagination |
| `/jobs/$jobId` | Full job detail + apply button + match score if resume uploaded |
| `/resume` | Upload resume, view parsed data, AI analysis |
| `/recommendations` | Personalized job recommendations |
| `/study-plan` | AI-generated 30-day Data Engineering roadmap |
| `/bookmarks` | Saved jobs |

### 4. Design

Dark theme by default with light mode toggle. Modern, clean UI using shadcn components. Mobile-responsive. Color palette: deep navy background, electric blue primary, clean whites for cards.

### 5. Job Data Pipeline

- "Fetch Jobs" button on admin/dashboard triggers server function
- Server function calls `linkedin-jobs-api` with keyword "Data Engineer", location "India", experience "entry level"
- Deduplicates by job URL
- AI extracts skills from descriptions and normalizes them
- Stores structured data in Lovable Cloud

### 6. AI Features (via Lovable AI Gateway)

- **Resume Parser**: Extract skills, experience, education from uploaded resume text
- **Match Scorer**: Compare resume against job description → percentage + gaps
- **Study Plan Generator**: Personalized 30-day roadmap based on skill gaps
- **Job Recommender**: Rank jobs by relevance to user profile

---

## Implementation Order

1. Enable Lovable Cloud + create database schema (migrations)
2. Set up auth (email/password + Google)
3. Build job fetching server functions + seed initial data
4. Build dashboard page with job listings, filters, search
5. Build job detail page
6. Build resume upload + AI parsing
7. Build AI analysis (match scoring, skill gaps)
8. Build recommendations page
9. Build study plan generator
10. Build bookmarks
11. Add dark/light mode toggle
12. Polish UI, responsive design

---

## Technical Details

- **`linkedin-jobs-api`**: npm package, runs server-side in `createServerFn`. Scrapes public LinkedIn job pages (no auth needed, no policy violation — uses public job board pages).
- **AI calls**: All go through Lovable AI Gateway via Supabase edge function, using `google/gemini-3-flash-preview` for fast responses.
- **File storage**: Resume PDFs stored in Supabase Storage bucket with RLS.
- **Auth**: Supabase Auth with `requireSupabaseAuth` middleware on protected server functions.
