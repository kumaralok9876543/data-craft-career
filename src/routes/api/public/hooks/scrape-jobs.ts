import { createFileRoute } from "@tanstack/react-router";
import { fetchJobsFromLinkedIn } from "@/server/jobs.functions";

export const Route = createFileRoute("/api/public/hooks/scrape-jobs")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const result = await fetchJobsFromLinkedIn({
            data: { keyword: "Data Engineer", location: "India", limit: 200 },
          });
          return new Response(JSON.stringify({ ok: true, ...result }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return new Response(
            JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "scrape failed" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
      GET: async () => new Response("ok"),
    },
  },
});
