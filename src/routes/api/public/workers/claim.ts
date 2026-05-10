import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authWorker, json } from "@/server/worker-auth";

// POST /api/public/workers/claim
// Body: { worker_id?: string, lease_seconds?: number }
// Atomically claims one pending job for the authenticated user.
export const Route = createFileRoute("/api/public/workers/claim")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const a = await authWorker(request);
        if (a instanceof Response) return a;
        const body = await request.json().catch(() => ({})) as {
          worker_id?: string;
          lease_seconds?: number;
        };
        const workerId = body.worker_id ?? "anon";
        const lease = Math.min(Math.max(body.lease_seconds ?? 300, 30), 3600);
        const leaseExpires = new Date(Date.now() + lease * 1000).toISOString();

        // Find oldest pending row
        const { data: candidate } = await supabaseAdmin
          .from("auto_apply_queue")
          .select("*")
          .eq("user_id", a.userId)
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (!candidate) return json({ item: null });

        const { data: claimed } = await supabaseAdmin
          .from("auto_apply_queue")
          .update({
            status: "claimed",
            claimed_by: workerId,
            claimed_at: new Date().toISOString(),
            lease_expires_at: leaseExpires,
            attempts: (candidate.attempts ?? 0) + 1,
          })
          .eq("id", candidate.id)
          .eq("status", "pending")
          .select("*")
          .maybeSingle();

        if (!claimed) return json({ item: null });

        // Attach job + profile + settings snapshot
        const [{ data: job }, { data: profile }, { data: settings }] = await Promise.all([
          supabaseAdmin.from("jobs").select("*").eq("id", claimed.job_id).maybeSingle(),
          supabaseAdmin.from("applicant_profiles").select("*").eq("user_id", a.userId).maybeSingle(),
          supabaseAdmin.from("auto_apply_settings").select("*").eq("user_id", a.userId).maybeSingle(),
        ]);

        return json({ item: claimed, job, profile, settings });
      },
    },
  },
});
