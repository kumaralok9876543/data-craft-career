import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

function buildLinkedInUrl(keyword: string, location: string, start: number) {
  const params = new URLSearchParams();
  params.append("keywords", keyword.replace(/\s+/g, "+"));
  params.append("location", location.replace(/\s+/g, "+"));
  params.append("f_TPR", "r2592000"); // past month
  params.append("f_E", "2"); // entry level
  params.append("start", String(start));
  params.append("sortBy", "DD"); // recent
  return `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params.toString()}`;
}

async function scrapeLinkedInJobs(keyword: string, location: string, limit: number) {
  const { load } = await import("cheerio");

  const allJobs: Array<{
    position: string;
    company: string;
    companyLogo: string;
    location: string;
    date: string;
    agoTime: string;
    salary: string;
    jobUrl: string;
  }> = [];

  let start = 0;
  const batchSize = 25;
  let attempts = 0;

  while (allJobs.length < limit && attempts < 3) {
    const url = buildLinkedInUrl(keyword, location, start);
    console.log("Fetching LinkedIn URL:", url);

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://www.linkedin.com/jobs",
        },
      });

      if (!response.ok) {
        console.error(`LinkedIn returned ${response.status}`);
        attempts++;
        continue;
      }

      const html = await response.text();
      console.log("HTML length:", html.length);

      const $ = load(html);
      const jobElements = $("li");
      let batchCount = 0;

      jobElements.each((_i, el) => {
        const job = $(el);
        const position = job.find(".base-search-card__title").text().trim();
        const company = job.find(".base-search-card__subtitle").text().trim();
        if (!position || !company) return;

        const loc = job.find(".job-search-card__location").text().trim();
        const dateEl = job.find("time");
        const date = dateEl.attr("datetime") || "";
        const salary = job.find(".job-search-card__salary-info").text().trim().replace(/\s+/g, " ");
        const jobUrl = job.find(".base-card__full-link").attr("href") || "";
        const companyLogo = job.find(".artdeco-entity-image").attr("data-delayed-url") || "";
        const agoTime = job.find(".job-search-card__listdate").text().trim();

        allJobs.push({ position, company, companyLogo, location: loc, date, salary: salary || "", jobUrl, agoTime });
        batchCount++;
      });

      console.log(`Batch yielded ${batchCount} jobs, total: ${allJobs.length}`);

      if (batchCount === 0) break;
      start += batchSize;
    } catch (err) {
      console.error("Fetch error:", err);
      attempts++;
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
        limit: z.number().min(1).max(50).default(25),
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
      return { fetched: 0, message: "Could not fetch new jobs. Showing existing listings." };
    }

    if (jobs.length === 0) {
      return { fetched: 0, message: "No new jobs found from LinkedIn. Try again later." };
    }

    let inserted = 0;
    for (const job of jobs) {
      // Upsert company
      const { data: companyData } = await supabase
        .from("companies")
        .upsert({ name: job.company, logo_url: job.companyLogo || null }, { onConflict: "name" })
        .select("id")
        .single();

      // Insert job (skip if source_url already exists)
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
          experience_required: "1-2 years",
          description: `${job.position} at ${job.company} in ${job.location}`,
        },
        { onConflict: "source_url" }
      );

      if (!error) inserted++;
    }

    return { fetched: inserted, message: `Fetched ${inserted} new jobs from LinkedIn!` };
  });
