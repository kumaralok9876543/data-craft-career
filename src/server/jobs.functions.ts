import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type LinkedInJob = {
  position: string;
  company: string;
  companyLogo: string;
  location: string;
  date: string;
  agoTime: string;
  salary: string;
  jobUrl: string;
};

const DE_SKILLS = [
  "Python", "SQL", "Spark", "PySpark", "Airflow", "Kafka",
  "Snowflake", "Databricks", "dbt", "Hadoop", "Hive", "Flink",
  "BigQuery", "Redshift", "AWS", "Azure", "GCP", "Docker",
  "Kubernetes", "Terraform", "Git", "CI/CD", "ETL", "ELT",
  "Pandas", "NumPy", "Scala", "Java", "Go", "Rust",
  "PostgreSQL", "MySQL", "MongoDB", "Cassandra", "Redis",
  "Delta Lake", "Iceberg", "Parquet", "Avro", "Presto", "Trino",
  "Power BI", "Tableau", "Looker", "Metabase",
  "Data Modeling", "Data Warehouse", "Data Pipeline", "Data Lake",
  "Machine Learning", "Deep Learning", "NLP", "MLOps",
  "Linux", "Shell", "Bash", "REST API", "GraphQL", "Elasticsearch",
  "S3", "Glue", "Lambda", "EMR", "Kinesis", "SQS", "SNS",
  "Azure Data Factory", "Synapse", "Dataflow", "Pub/Sub",
  "Cloud Composer", "Dataproc", "NoSQL", "OLAP",
];

const SKILL_PATTERNS = DE_SKILLS.map((s) => ({
  name: s,
  regex: new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
}));

function extractSkills(text: string): string[] {
  const found = new Set<string>();
  for (const { name, regex } of SKILL_PATTERNS) {
    if (regex.test(text)) found.add(name);
  }
  return Array.from(found).slice(0, 20);
}

/**
 * Extract experience bucket from the FULL job description text.
 * We look for patterns like "7-10 Years", "3+ years", "Work Experience - 5-8 Years" etc.
 * Only falls back to title-based keywords if no year pattern is found in description.
 */
function extractExperienceBucket(title: string, description: string): string {
  // Prioritize description over title — description has the real requirements
  const descLower = description.toLowerCase();

  // Pattern 1: "X-Y years" or "X to Y years" — search description first
  const rangeMatches = [...descLower.matchAll(/(\d+)\s*[-–to]+\s*(\d+)\s*(?:years?|yrs?)/gi)];
  if (rangeMatches.length > 0) {
    // Use the FIRST match in description as it's usually the primary requirement
    const low = parseInt(rangeMatches[0][1]);
    const high = parseInt(rangeMatches[0][2]);
    return bucketFromRange(low, high);
  }

  // Pattern 2: "X+ years" or "X years" in description
  const plusMatches = [...descLower.matchAll(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp|work)?/gi)];
  if (plusMatches.length > 0) {
    // Take the highest year number as the primary requirement
    const years = plusMatches.map((m) => parseInt(m[1]));
    const maxYear = Math.max(...years);
    return bucketFromSingle(maxYear);
  }

  // Pattern 3: "experience: X-Y" or "experience - X-Y" 
  const expLabelMatch = descLower.match(/(?:experience|exp)\s*[-:]\s*(\d+)\s*[-–to]+\s*(\d+)/i);
  if (expLabelMatch) {
    return bucketFromRange(parseInt(expLabelMatch[1]), parseInt(expLabelMatch[2]));
  }

  // Now check title as fallback
  const titleLower = title.toLowerCase();
  const titleRange = titleLower.match(/(\d+)\s*[-–to]+\s*(\d+)\s*(?:years?|yrs?)/i);
  if (titleRange) {
    return bucketFromRange(parseInt(titleRange[1]), parseInt(titleRange[2]));
  }
  const titlePlus = titleLower.match(/(\d+)\+?\s*(?:years?|yrs?)/i);
  if (titlePlus) {
    return bucketFromSingle(parseInt(titlePlus[1]));
  }

  // Keyword-based inference from title only
  if (/\b(intern|trainee|fresher|graduate|entry[\s-]*level)\b/i.test(titleLower)) return "0-1 years";
  if (/\b(junior|jr\.?|associate)\b/i.test(titleLower)) return "1-2 years";
  if (/\b(mid[\s-]*level|intermediate)\b/i.test(titleLower)) return "3-4 years";
  if (/\b(senior|sr\.?|lead|staff)\b/i.test(titleLower)) return "5-8 years";
  if (/\b(principal|director|head|vp|architect|manager)\b/i.test(titleLower)) return "8+ years";

  return "Not specified";
}

function bucketFromRange(low: number, high: number): string {
  const mid = (low + high) / 2;
  if (mid <= 1) return "0-1 years";
  if (mid <= 2.5) return "1-2 years";
  if (mid <= 4.5) return "3-4 years";
  if (mid <= 8) return "5-8 years";
  return "8+ years";
}

function bucketFromSingle(num: number): string {
  if (num <= 1) return "0-1 years";
  if (num <= 2) return "1-2 years";
  if (num <= 4) return "3-4 years";
  if (num <= 8) return "5-8 years";
  return "8+ years";
}

function isDataEngineeringRole(title: string) {
  const normalized = title.toLowerCase().replace(/&amp;/g, "&");
  return (
    /\bdata\s*engineer/i.test(normalized) ||
    /\bdata\s*engineering/i.test(normalized) ||
    /\betl\b/i.test(normalized) ||
    /\bbig\s*data/i.test(normalized) ||
    /\b(data platform|data warehouse|data pipeline|analytics)\s*engineer/i.test(normalized) ||
    /\bdata\s*ops/i.test(normalized)
  );
}

function buildLinkedInUrl(keyword: string, location: string, start: number, expLevel: string) {
  const params = new URLSearchParams();
  params.append("keywords", keyword);
  params.append("location", location);
  params.append("f_TPR", "r2592000");
  if (expLevel) params.append("f_E", expLevel);
  params.append("start", String(start));
  params.append("sortBy", "DD");
  return `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params.toString()}`;
}

function normalizeLinkedInJobUrl(rawUrl: string) {
  if (!rawUrl) return "";
  try {
    const url = new URL(rawUrl, "https://www.linkedin.com");
    return `${url.origin}${url.pathname}`;
  } catch {
    return rawUrl.split("?")[0];
  }
}

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.linkedin.com/jobs",
};

/**
 * Fetch the actual job detail page from LinkedIn to get the full description.
 */
function extractJobId(jobUrl: string): string | null {
  const m = jobUrl.match(/(\d{8,})(?:\?|$)/);
  return m ? m[1] : null;
}

async function fetchJobDescription(jobUrl: string): Promise<string> {
  if (!jobUrl) return "";
  const jobId = extractJobId(jobUrl);
  // Prefer the jobPosting API endpoint — much more reliable than the full page
  const urls = jobId
    ? [
        `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`,
        jobUrl,
      ]
    : [jobUrl];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(url, { signal: controller.signal, headers: FETCH_HEADERS });
      clearTimeout(timeoutId);
      if (!response.ok) continue;

      const html = await response.text();
      const { load } = await import("cheerio");
      const $ = load(html);

      const descriptionHtml =
        $(".show-more-less-html__markup").text().trim() ||
        $(".description__text").text().trim() ||
        $(".core-section-container__content").text().trim() ||
        "";
      const criteria = $(".description__job-criteria-list").text().trim();
      const combined = `${descriptionHtml} ${criteria}`.trim();
      if (combined.length > 50) return combined;
    } catch {
      // try next URL
    }
  }
  return "";
}

async function scrapeLinkedInJobs(keyword: string, location: string, limit: number) {
  const { load } = await import("cheerio");
  const allJobs: (LinkedInJob & { fullDescription: string })[] = [];
  const seenJobUrls = new Set<string>();

  const expLevels = ["2", "3", "4", "1", "5"];

  for (const expLevel of expLevels) {
    if (allJobs.length >= limit) break;

    let start = 0;
    const batchSize = 10;
    const maxPages = 8;
    let emptyPages = 0;
    let pagesScraped = 0;

    while (allJobs.length < limit && emptyPages < 2 && pagesScraped < maxPages) {
      const url = buildLinkedInUrl(keyword, location, start, expLevel);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: FETCH_HEADERS,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          emptyPages++;
          start += batchSize;
          pagesScraped++;
          continue;
        }

        const html = await response.text();
        const $ = load(html);
        const jobElements = $("li");
        let batchCount = 0;

        const batchJobs: LinkedInJob[] = [];

        jobElements.each((_i, el) => {
          const job = $(el);
          const position = job.find(".base-search-card__title").text().trim();
          const company = job.find(".base-search-card__subtitle").text().trim();
          if (!position || !company) return;

          if (!isDataEngineeringRole(position)) return;

          const loc = job.find(".job-search-card__location").text().trim();
          const dateEl = job.find("time");
          const date = dateEl.attr("datetime") || "";
          const salary = job.find(".job-search-card__salary-info").text().trim().replace(/\s+/g, " ");
          const jobUrl = normalizeLinkedInJobUrl(job.find(".base-card__full-link").attr("href") || "");
          const companyLogo = job.find(".artdeco-entity-image").attr("data-delayed-url") || "";
          const agoTime = job.find(".job-search-card__listdate").text().trim();

          if (!jobUrl || seenJobUrls.has(jobUrl)) return;

          seenJobUrls.add(jobUrl);
          batchJobs.push({ position, company, companyLogo, location: loc, date, salary: salary || "", jobUrl, agoTime });
          batchCount++;
        });

        // Fetch detail pages for this batch (with small delays)
        for (const job of batchJobs) {
          const fullDescription = await fetchJobDescription(job.jobUrl);
          allJobs.push({ ...job, fullDescription });
          // Small delay to avoid rate limiting
          await new Promise((r) => setTimeout(r, 300));
        }

        emptyPages = batchCount === 0 ? emptyPages + 1 : 0;
        start += batchSize;
        pagesScraped++;

        await new Promise((r) => setTimeout(r, 400));
      } catch (err) {
        console.error("Fetch error:", err);
        emptyPages++;
        start += batchSize;
        pagesScraped++;
      }
    }
  }

  return allJobs.slice(0, limit);
}

export const fetchJobsFromLinkedIn = createServerFn({ method: "POST" })
  .inputValidator(
    z
      .object({
        keyword: z.string().min(1).max(200).default("Data Engineer"),
        location: z.string().min(1).max(100).default("India"),
        limit: z.number().min(1).max(500).default(200),
      }).parse
  )
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing backend configuration");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let jobs: Awaited<ReturnType<typeof scrapeLinkedInJobs>>;
    try {
      jobs = await scrapeLinkedInJobs(data.keyword, data.location, data.limit);
    } catch (e) {
      console.error("LinkedIn scraping error:", e);
      return { fetched: 0, message: "Could not fetch new jobs. Try again in a moment." };
    }

    if (jobs.length === 0) {
      return { fetched: 0, message: "No new jobs found from LinkedIn right now. Try again later." };
    }

    let saved = 0;
    for (const job of jobs) {
      const fullText = `${job.position} ${job.fullDescription}`;
      const skills = extractSkills(fullText);
      const experienceBucket = extractExperienceBucket(job.position, job.fullDescription);

      const { data: companyData } = await supabase
        .from("companies")
        .upsert({ name: job.company, logo_url: job.companyLogo || null }, { onConflict: "name" })
        .select("id")
        .single();

      const { error } = await supabase.from("jobs").upsert(
        {
          title: job.position,
          company_name: job.company,
          company_id: companyData?.id || null,
          location: job.location || data.location,
          salary: job.salary || null,
          posted_date: job.agoTime || job.date || null,
          source: "linkedin",
          source_url: job.jobUrl || `https://linkedin.com/jobs/search?keywords=${encodeURIComponent(job.position)}`,
          apply_link: job.jobUrl || null,
          experience_required: experienceBucket,
          experience_bucket: experienceBucket,
          skills_extracted: skills,
          description: job.fullDescription || `${job.position} at ${job.company} in ${job.location || data.location}`,
        },
        { onConflict: "source_url" }
      );

      if (!error) saved++;
    }

    return {
      fetched: saved,
      scraped: jobs.length,
      message: `Scraped ${jobs.length} Data Engineer jobs and saved ${saved} new listings.`,
    };
  });

/**
 * Repair existing jobs in the database by re-fetching their detail pages
 * and correcting experience_bucket and skills.
 */
export const repairExistingJobs = createServerFn({ method: "POST" })
  .handler(async () => {
    const { createClient } = await import("@supabase/supabase-js");

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing backend configuration");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Get all jobs with apply_link
    const { data: existingJobs, error } = await supabase
      .from("jobs")
      .select("id, title, apply_link, description")
      .not("apply_link", "is", null)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error || !existingJobs) {
      return { repaired: 0, message: "Failed to load existing jobs." };
    }

    let repaired = 0;
    let failed = 0;

    for (const job of existingJobs) {
      try {
        const fullDescription = await fetchJobDescription(job.apply_link!);

        if (!fullDescription || fullDescription.length < 20) {
          // Can't get description, try to re-extract from existing description
          const existingDesc = job.description || "";
          const bucket = extractExperienceBucket(job.title, existingDesc);
          const skills = extractSkills(`${job.title} ${existingDesc}`);

          await supabase
            .from("jobs")
            .update({
              experience_bucket: bucket,
              experience_required: bucket,
              skills_extracted: skills,
            })
            .eq("id", job.id);

          repaired++;
        } else {
          const bucket = extractExperienceBucket(job.title, fullDescription);
          const skills = extractSkills(`${job.title} ${fullDescription}`);

          await supabase
            .from("jobs")
            .update({
              experience_bucket: bucket,
              experience_required: bucket,
              skills_extracted: skills,
              description: fullDescription,
            })
            .eq("id", job.id);

          repaired++;
        }

        // Delay between requests
        await new Promise((r) => setTimeout(r, 350));
      } catch (err) {
        console.error(`Failed to repair job ${job.id}:`, err);
        failed++;
      }
    }

    return {
      repaired,
      failed,
      total: existingJobs.length,
      message: `Repaired ${repaired}/${existingJobs.length} jobs. ${failed > 0 ? `${failed} failed.` : ""}`,
    };
  });
