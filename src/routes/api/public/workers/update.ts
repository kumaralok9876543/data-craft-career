import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authWorker, json } from "@/server/worker-auth";

// POST /api/public/workers/update
// Body: {
//   id: queue_id,
//   status?: 'running'|'succeeded'|'failed'|'needs_human',
//   error?: string,
//   result?: object,
//   logs?: [{ level, step, message, data, screenshot_url }]
// }
export const Route = createFileRoute("/api/public/workers/update")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const a = await authWorker(request);
        if (a instanceof Response) return a;
        const body = await request.json().catch(() => null) as {
          id?: string;
          status?: "running" | "succeeded" | "failed" | "needs_human";
          error?: string;
          result?: Record<string, unknown>;
          logs?: Array<{
            level?: string;
            step?: string;
            message?: string;
            data?: unknown;
            screenshot_url?: string;
          }>;
        } | null;

        if (!body?.id) return json({ error: "missing id" }, 400);

        // Verify ownership
        const { data: row } = await supabaseAdmin
          .from("auto_apply_queue")
          .select("id,user_id")
          .eq("id", body.id)
          .maybeSingle();
        if (!row || row.user_id !== a.userId) {
          return json({ error: "not found" }, 404);
        }

        if (body.status) {
          const patch: Record<string, unknown> = { status: body.status };
          if (body.error) patch.error = body.error;
          if (body.result) patch.result = body.result;
          await supabaseAdmin.from("auto_apply_queue").update(patch).eq("id", body.id);

          // If succeeded, mirror to applied_jobs
          if (body.status === "succeeded") {
            const { data: q } = await supabaseAdmin
              .from("auto_apply_queue")
              .select("job_id")
              .eq("id", body.id)
              .maybeSingle();
            if (q?.job_id) {
              await supabaseAdmin
                .from("applied_jobs")
                .upsert(
                  { user_id: a.userId, job_id: q.job_id, notes: "auto-apply" },
                  { onConflict: "user_id,job_id" }
                );
            }
          }
        }

        if (body.logs?.length) {
          await supabaseAdmin.from("application_logs").insert(
            body.logs.map((l) => ({
              user_id: a.userId,
              queue_id: body.id!,
              level: l.level ?? "info",
              step: l.step ?? null,
              message: l.message ?? null,
              data: (l.data ?? null) as never,
              screenshot_url: l.screenshot_url ?? null,
            }))
          );
        }

        return json({ ok: true });
      },
    },
  },
});
