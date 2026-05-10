// Helpers for /api/public/workers/* — token auth via SHA-256 hash lookup.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function authWorker(request: Request): Promise<{ userId: string } | Response> {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return new Response("Missing bearer token", { status: 401 });
  }
  const token = auth.slice(7).trim();
  if (!token.startsWith("lva_worker_")) {
    return new Response("Invalid token", { status: 401 });
  }
  const hash = await sha256Hex(token);
  const { data } = await supabaseAdmin
    .from("worker_tokens")
    .select("id,user_id,revoked_at")
    .eq("token_hash", hash)
    .maybeSingle();
  if (!data || data.revoked_at) {
    return new Response("Unknown token", { status: 401 });
  }
  // best-effort touch
  await supabaseAdmin
    .from("worker_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);
  return { userId: data.user_id };
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
