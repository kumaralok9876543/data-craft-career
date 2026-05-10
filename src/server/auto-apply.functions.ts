import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ---------- Settings ----------
export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    let { data } = await supabase
      .from("auto_apply_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) {
      const ins = await supabase
        .from("auto_apply_settings")
        .insert({ user_id: userId })
        .select("*")
        .single();
      data = ins.data ?? null;
    }
    return { settings: data };
  });

const SettingsSchema = z.object({
  enabled: z.boolean().optional(),
  demo_mode: z.boolean().optional(),
  preferred_roles: z.array(z.string()).optional(),
  preferred_locations: z.array(z.string()).optional(),
  work_modes: z.array(z.string()).optional(),
  min_salary: z.number().int().nullable().optional(),
  experience_buckets: z.array(z.string()).optional(),
  daily_limit: z.number().int().min(1).max(200).optional(),
  min_ats_score: z.number().int().min(0).max(100).optional(),
  blacklisted_companies: z.array(z.string()).optional(),
  default_resume_id: z.string().uuid().nullable().optional(),
  ai_autoanswer: z.boolean().optional(),
  otp_autofill: z.boolean().optional(),
  gmail_connected: z.boolean().optional(),
  linkedin_connected: z.boolean().optional(),
});

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SettingsSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("auto_apply_settings")
      .upsert({ user_id: userId, ...data }, { onConflict: "user_id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { settings: row };
  });

// ---------- Profile ----------
export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("applicant_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return { profile: data };
  });

const ProfileSchema = z.object({
  full_name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  linkedin_url: z.string().nullable().optional(),
  github_url: z.string().nullable().optional(),
  portfolio_url: z.string().nullable().optional(),
  current_salary: z.string().nullable().optional(),
  expected_salary: z.string().nullable().optional(),
  notice_period: z.string().nullable().optional(),
  work_authorization: z.string().nullable().optional(),
  preferred_job_types: z.array(z.string()).nullable().optional(),
  skills: z.array(z.string()).nullable().optional(),
  experience_years: z.number().nullable().optional(),
});

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ProfileSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("applicant_profiles")
      .upsert({ user_id: userId, ...data }, { onConflict: "user_id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { profile: row };
  });

// ---------- Queue ----------
export const enqueueJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ job_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: job } = await supabase
      .from("jobs")
      .select("apply_url, source")
      .eq("id", data.job_id)
      .maybeSingle();
    const { data: row, error } = await supabase
      .from("auto_apply_queue")
      .upsert(
        {
          user_id: userId,
          job_id: data.job_id,
          apply_url: job?.apply_url ?? null,
          ats_platform: detectPlatform(job?.apply_url ?? ""),
          status: "pending",
        },
        { onConflict: "user_id,job_id" }
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { item: row };
  });

export const listQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: items } = await supabase
      .from("auto_apply_queue")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);
    const { data: logs } = await supabase
      .from("application_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    const counts = (items ?? []).reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});
    return { items: items ?? [], logs: logs ?? [], counts };
  });

export const cancelQueueItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await supabase
      .from("auto_apply_queue")
      .update({ status: "skipped" })
      .eq("id", data.id)
      .eq("user_id", userId);
    return { ok: true };
  });

// ---------- Worker tokens ----------
function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return (
    "lva_worker_" +
    Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  );
}

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const createWorkerToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ label: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const plain = randomToken();
    const hash = await sha256(plain);
    const prefix = plain.slice(0, 18);
    const { error } = await supabase
      .from("worker_tokens")
      .insert({ user_id: userId, label: data.label, token_hash: hash, prefix });
    if (error) throw new Error(error.message);
    return { token: plain, prefix }; // only returned once
  });

export const listWorkerTokens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("worker_tokens")
      .select("id,label,prefix,last_used_at,revoked_at,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return { tokens: data ?? [] };
  });

export const revokeWorkerToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await supabase
      .from("worker_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId);
    return { ok: true };
  });

// ---------- Demo seed ----------
export const seedDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    return seedDemoForUser(userId, "demoautouser@test.com");
  });

export const seedDemoAccount = createServerFn({ method: "POST" }).handler(
  async () => {
    // Idempotent: create the demo auth user if missing then seed
    const email = "demoautouser@test.com";
    const password = "Demo@12345";
    // Try to find user
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    let user = list?.users?.find((u) => u.email === email);
    if (!user) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) throw new Error(error.message);
      user = data.user!;
    }
    await seedDemoForUser(user!.id, email);
    return { ok: true, email, password };
  }
);

async function seedDemoForUser(userId: string, email: string) {
  await supabaseAdmin.from("applicant_profiles").upsert(
    {
      user_id: userId,
      full_name: "Demo Auto Apply",
      email,
      phone: "+91 90000 00000",
      linkedin_url: "https://linkedin.com/in/demo-auto-apply",
      github_url: "https://github.com/demo-auto-apply",
      portfolio_url: "https://demo-auto-apply.dev",
      current_salary: "12 LPA",
      expected_salary: "20 LPA",
      notice_period: "30 days",
      work_authorization: "Indian citizen",
      preferred_job_types: ["Full-time", "Remote"],
      skills: ["Python", "SQL", "Spark", "Airflow", "AWS", "dbt", "Snowflake"],
      experience_years: 3,
    },
    { onConflict: "user_id" }
  );
  await supabaseAdmin.from("auto_apply_settings").upsert(
    {
      user_id: userId,
      enabled: false,
      demo_mode: true,
      preferred_roles: ["Data Engineer", "Analytics Engineer"],
      preferred_locations: ["India", "Remote"],
      work_modes: ["Remote", "Hybrid"],
      experience_buckets: ["1-2 years", "3-4 years"],
      daily_limit: 25,
      min_ats_score: 65,
      ai_autoanswer: true,
    },
    { onConflict: "user_id" }
  );
  return { ok: true };
}

function detectPlatform(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("greenhouse.io")) return "greenhouse";
  if (u.includes("lever.co")) return "lever";
  if (u.includes("myworkdayjobs") || u.includes("workday")) return "workday";
  if (u.includes("smartrecruiters")) return "smartrecruiters";
  if (u.includes("taleo")) return "taleo";
  if (u.includes("successfactors") || u.includes("sap")) return "sap";
  if (u.includes("linkedin.com")) return "linkedin";
  return "generic";
}
