import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getSettings, updateSettings,
  getProfile, updateProfile,
  listQueue, cancelQueueItem,
  createWorkerToken, listWorkerTokens, revokeWorkerToken,
  seedDemoData,
} from "@/server/auto-apply.functions";

export const Route = createFileRoute("/auto-apply")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: AutoApplyPage,
});

function AutoApplyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Auto-Apply Agent</h1>
          <p className="text-muted-foreground mt-1">
            Configure your agent. An external Playwright worker polls the public
            API and processes your queue.
          </p>
        </div>
        <Tabs defaultValue="dashboard">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="workers">Workers & API</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard"><DashboardTab /></TabsContent>
          <TabsContent value="settings"><SettingsTab /></TabsContent>
          <TabsContent value="profile"><ProfileTab /></TabsContent>
          <TabsContent value="workers"><WorkersTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function DashboardTab() {
  const fetchQueue = useServerFn(listQueue);
  const cancel = useServerFn(cancelQueueItem);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["aa-queue"],
    queryFn: () => fetchQueue(),
    refetchInterval: 5000,
  });
  const cancelMut = useMutation({
    mutationFn: (id: string) => cancel({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["aa-queue"] }),
  });

  if (isLoading) return <p className="py-8 text-muted-foreground">Loading…</p>;
  const counts = data?.counts ?? {};
  const items = data?.items ?? [];
  const logs = data?.logs ?? [];

  return (
    <div className="space-y-6 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(["pending", "claimed", "running", "succeeded", "failed"] as const).map((s) => (
          <Card key={s}><CardContent className="pt-6">
            <div className="text-xs uppercase text-muted-foreground">{s}</div>
            <div className="text-2xl font-bold">{counts[s] ?? 0}</div>
          </CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Queue</CardTitle></CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No jobs queued. Use the Apply button on any job card (coming soon)
              or POST to <code>/api/public/workers/claim</code> to pull a job.
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-2 border rounded-lg p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={it.status === "succeeded" ? "default" : it.status === "failed" ? "destructive" : "secondary"}>
                        {it.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{it.ats_platform}</span>
                      <span className="text-xs text-muted-foreground">attempts: {it.attempts}</span>
                    </div>
                    <a href={it.apply_url ?? "#"} target="_blank" rel="noreferrer" className="text-sm text-primary truncate block hover:underline">
                      {it.apply_url}
                    </a>
                    {it.error && <p className="text-xs text-destructive mt-1">{it.error}</p>}
                  </div>
                  {(it.status === "pending" || it.status === "failed") && (
                    <Button size="sm" variant="ghost" onClick={() => cancelMut.mutate(it.id)}>Skip</Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Recent automation logs</CardTitle></CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No logs yet.</p>
          ) : (
            <div className="space-y-1 font-mono text-xs">
              {logs.map((l) => (
                <div key={l.id} className="flex gap-2">
                  <span className="text-muted-foreground">{new Date(l.created_at).toLocaleTimeString()}</span>
                  <Badge variant="outline" className="text-[10px]">{l.level}</Badge>
                  <span className="text-muted-foreground">[{l.step}]</span>
                  <span>{l.message}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsTab() {
  const fetchSettings = useServerFn(getSettings);
  const save = useServerFn(updateSettings);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["aa-settings"], queryFn: () => fetchSettings() });
  const [s, setS] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { if (data?.settings) setS(data.settings as Record<string, unknown>); }, [data]);

  const mut = useMutation({
    mutationFn: (patch: Record<string, unknown>) => save({ data: patch as never }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["aa-settings"] }); toast.success("Saved"); },
    onError: (e) => toast.error(String(e)),
  });

  if (isLoading || !s) return <p className="py-8 text-muted-foreground">Loading…</p>;

  const text = (k: string) => Array.isArray(s[k]) ? (s[k] as string[]).join(", ") : "";
  const setArr = (k: string, v: string) =>
    setS({ ...s, [k]: v.split(",").map((x) => x.trim()).filter(Boolean) });

  return (
    <Card className="mt-4">
      <CardContent className="pt-6 space-y-6">
        <Row label="Enable Auto-Apply Agent" hint="Workers only process queue when this is on.">
          <Switch checked={!!s.enabled} onCheckedChange={(v) => setS({ ...s, enabled: v })} />
        </Row>
        <Row label="Demo / Test mode" hint="When on, workers should target sandbox ATS portals only.">
          <Switch checked={!!s.demo_mode} onCheckedChange={(v) => setS({ ...s, demo_mode: v })} />
        </Row>
        <Row label="AI auto-answer questions">
          <Switch checked={!!s.ai_autoanswer} onCheckedChange={(v) => setS({ ...s, ai_autoanswer: v })} />
        </Row>
        <Row label="OTP autofill (requires Gmail)">
          <Switch checked={!!s.otp_autofill} onCheckedChange={(v) => setS({ ...s, otp_autofill: v })} />
        </Row>

        <Field label="Preferred roles (comma-separated)">
          <Input value={text("preferred_roles")} onChange={(e) => setArr("preferred_roles", e.target.value)} />
        </Field>
        <Field label="Preferred locations">
          <Input value={text("preferred_locations")} onChange={(e) => setArr("preferred_locations", e.target.value)} />
        </Field>
        <Field label="Work modes">
          <Input value={text("work_modes")} onChange={(e) => setArr("work_modes", e.target.value)} />
        </Field>
        <Field label="Experience buckets">
          <Input value={text("experience_buckets")} onChange={(e) => setArr("experience_buckets", e.target.value)} />
        </Field>
        <Field label="Blacklisted companies">
          <Input value={text("blacklisted_companies")} onChange={(e) => setArr("blacklisted_companies", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Daily limit">
            <Input type="number" value={Number(s.daily_limit ?? 20)} onChange={(e) => setS({ ...s, daily_limit: Number(e.target.value) })} />
          </Field>
          <Field label="Min ATS score">
            <Input type="number" value={Number(s.min_ats_score ?? 70)} onChange={(e) => setS({ ...s, min_ats_score: Number(e.target.value) })} />
          </Field>
        </div>

        <Button onClick={() => mut.mutate(s)} disabled={mut.isPending}>
          {mut.isPending ? "Saving…" : "Save settings"}
        </Button>
      </CardContent>
    </Card>
  );
}

function ProfileTab() {
  const fetchProfile = useServerFn(getProfile);
  const save = useServerFn(updateProfile);
  const seed = useServerFn(seedDemoData);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["aa-profile"], queryFn: () => fetchProfile() });
  const [p, setP] = useState<Record<string, unknown>>({});
  useEffect(() => { if (data?.profile) setP(data.profile as Record<string, unknown>); }, [data]);
  const mut = useMutation({
    mutationFn: (patch: Record<string, unknown>) => save({ data: patch as never }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["aa-profile"] }); toast.success("Saved"); },
  });
  const seedMut = useMutation({
    mutationFn: () => seed(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["aa-profile"] }); toast.success("Demo data seeded"); },
  });

  if (isLoading) return <p className="py-8 text-muted-foreground">Loading…</p>;

  const F = (k: string, label: string, type = "text") => (
    <Field label={label}>
      <Input type={type} value={String(p[k] ?? "")} onChange={(e) => setP({ ...p, [k]: e.target.value })} />
    </Field>
  );

  return (
    <Card className="mt-4">
      <CardContent className="pt-6 space-y-4">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => seedMut.mutate()}>
            Fill with demo data
          </Button>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {F("full_name", "Full name")}
          {F("email", "Email", "email")}
          {F("phone", "Phone")}
          {F("linkedin_url", "LinkedIn URL")}
          {F("github_url", "GitHub URL")}
          {F("portfolio_url", "Portfolio URL")}
          {F("current_salary", "Current salary")}
          {F("expected_salary", "Expected salary")}
          {F("notice_period", "Notice period")}
          {F("work_authorization", "Work authorization")}
          <Field label="Skills (comma-separated)">
            <Input
              value={Array.isArray(p.skills) ? (p.skills as string[]).join(", ") : ""}
              onChange={(e) => setP({ ...p, skills: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })}
            />
          </Field>
          <Field label="Experience (years)">
            <Input type="number" value={Number(p.experience_years ?? 0)} onChange={(e) => setP({ ...p, experience_years: Number(e.target.value) })} />
          </Field>
        </div>
        <Button onClick={() => mut.mutate(p)} disabled={mut.isPending}>Save profile</Button>
      </CardContent>
    </Card>
  );
}

function WorkersTab() {
  const fetchTokens = useServerFn(listWorkerTokens);
  const create = useServerFn(createWorkerToken);
  const revoke = useServerFn(revokeWorkerToken);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["aa-tokens"], queryFn: () => fetchTokens() });
  const [label, setLabel] = useState("my-worker");
  const [issued, setIssued] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: () => create({ data: { label } }),
    onSuccess: (r) => { setIssued(r.token); qc.invalidateQueries({ queryKey: ["aa-tokens"] }); },
  });
  const revokeMut = useMutation({
    mutationFn: (id: string) => revoke({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["aa-tokens"] }),
  });

  const base = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader><CardTitle>Worker API token</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Token label" />
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>Generate</Button>
          </div>
          {issued && (
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
              <p className="text-xs uppercase text-primary mb-1">Copy now — shown only once</p>
              <code className="text-sm break-all">{issued}</code>
            </div>
          )}
          <div className="space-y-1">
            {(data?.tokens ?? []).map((t) => (
              <div key={t.id} className="flex items-center justify-between border rounded p-2 text-sm">
                <div>
                  <div className="font-medium">{t.label} <span className="text-muted-foreground">({t.prefix}…)</span></div>
                  <div className="text-xs text-muted-foreground">
                    {t.revoked_at ? "revoked" : t.last_used_at ? `last used ${new Date(t.last_used_at).toLocaleString()}` : "never used"}
                  </div>
                </div>
                {!t.revoked_at && (
                  <Button size="sm" variant="ghost" onClick={() => revokeMut.mutate(t.id)}>Revoke</Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Worker contract</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Run your Playwright/BullMQ worker anywhere (VPS, Render, Fly). It must:</p>
          <pre className="rounded bg-muted p-3 text-xs overflow-x-auto">{`# 1. Claim a job
curl -X POST ${base}/api/public/workers/claim \\
  -H "Authorization: Bearer <YOUR_WORKER_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"worker_id":"vps-1","lease_seconds":300}'

# Response includes { item, job, profile, settings }
# Drive Playwright using profile + settings, upload resume, fill ATS form.

# 2. Stream logs/screenshots
curl -X POST ${base}/api/public/workers/update \\
  -H "Authorization: Bearer <YOUR_WORKER_TOKEN>" \\
  -d '{"id":"<queue_id>","status":"running","logs":[{"step":"open","message":"page loaded"}]}'

# 3. Mark final state
curl -X POST ${base}/api/public/workers/update \\
  -H "Authorization: Bearer <YOUR_WORKER_TOKEN>" \\
  -d '{"id":"<queue_id>","status":"succeeded","result":{"confirmation":"abc123"}}'`}</pre>
          <p className="text-muted-foreground">
            Successful submissions are mirrored to your <strong>Applied</strong>{" "}
            list automatically. Statuses: <code>pending → claimed → running →
            succeeded | failed | needs_human</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
