import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// POST /api/public/demo-seed
// Idempotently creates demoautouser@test.com / Demo@12345 + seeds profile/settings.
// Safe because the account is pre-known; rate-limit upstream if abused.
export const Route = createFileRoute("/api/public/demo-seed")({
  server: {
    handlers: {
      POST: async () => {
        const email = "demoautouser@test.com";
        const password = "Demo@12345";

        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
          page: 1, perPage: 200,
        });
        if (listErr) return new Response(listErr.message, { status: 500 });

        let user = list?.users?.find((u) => u.email === email);
        if (!user) {
          const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email, password, email_confirm: true,
          });
          if (error) return new Response(error.message, { status: 500 });
          user = data.user!;
        }
        const userId = user!.id;

        await supabaseAdmin.from("applicant_profiles").upsert({
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
        }, { onConflict: "user_id" });

        await supabaseAdmin.from("auto_apply_settings").upsert({
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
        }, { onConflict: "user_id" });

        return Response.json({ ok: true, email, password, user_id: userId });
      },
    },
  },
});
