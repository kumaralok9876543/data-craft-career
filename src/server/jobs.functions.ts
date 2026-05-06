import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const fetchJobsFromLinkedIn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
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

    // Use linkedin-jobs-api to fetch jobs
    let jobs: Array<{
      position: string;
      company: string;
      companyLogo: string;
      location: string;
      date: string;
      agoTime: string;
      salary: string;
      jobUrl: string;
    }> = [];

    try {
      const linkedIn = await import("linkedin-jobs-api");
      const queryFn = linkedIn.default?.query || linkedIn.query;
      jobs = await queryFn({
        keyword: data.keyword,
        location: data.location,
        dateSincePosted: "past week",
        jobType: "full time",
        experienceLevel: "entry level",
        limit: String(data.limit),
        sortBy: "recent",
      });
    } catch (e) {
      console.error("LinkedIn jobs API error:", e);
      // Return empty if API fails - we'll still show existing DB jobs
      return { fetched: 0, message: "Could not fetch new jobs. Showing existing listings." };
    }

    let inserted = 0;
    for (const job of jobs) {
      if (!job.position || !job.company) continue;

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
          source_url: job.jobUrl || null,
          apply_link: job.jobUrl || null,
          experience_required: "1-2 years",
        },
        { onConflict: "source_url" }
      );

      if (!error) inserted++;
    }

    return { fetched: inserted, message: `Fetched ${inserted} new jobs.` };
  });
