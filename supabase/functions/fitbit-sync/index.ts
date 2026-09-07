import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// fitbit-sync — pulls sleep + steps from the Google Health API for the calling user.
// Refreshes the Google access token when stale (using the stored refresh token),
// then reads the last N days and returns normalized per-day arrays. Tokens stay in
// public.fitbit_tokens (service role); the client only receives the aggregated numbers.
//
// In "Testing" publishing status the Google refresh token dies after 7 days: a refresh
// that fails with invalid_grant returns { needsReconnect: true } so the client can prompt
// the user to reconnect.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const HEALTH_BASE = "https://health.googleapis.com/v4/users/me/dataTypes";
const CLIENT_ID_FALLBACK = "24754643464-5d6jg05iqa3tn9uapq95vb2v53gqvt7q.apps.googleusercontent.com";

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

// Verify the caller's JWT signature (don't just decode it) and return the user id.
// verify_jwt=true already gates at the gateway; this is defense-in-depth for health data.
async function verifiedUid(req: Request): Promise<string | null> {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await createClient(SB_URL, SB_ANON).auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}
function dbFetch(path: string, init: RequestInit) {
  return fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: { year: number; month: number; day: number }) => `${d.year}-${pad(d.month)}-${pad(d.day)}`;
const offsetSecs = (o?: string) => parseInt(String(o || "0").replace(/s$/, ""), 10) || 0;
// civil (local) calendar date of a UTC timestamp given its utc offset
function civilDate(iso: string, off?: string): string {
  return new Date(new Date(iso).getTime() + offsetSecs(off) * 1000).toISOString().slice(0, 10);
}
const minutesBetween = (a: string, b: string) => Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000));

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const uid = await verifiedUid(req);
    if (!uid) return json({ error: "no_user" }, 401);

    const clientId = Deno.env.get("FITBIT_CLIENT_ID") || CLIENT_ID_FALLBACK;
    const clientSecret = Deno.env.get("FITBIT_CLIENT_SECRET");
    if (!clientSecret) return json({ error: "missing_fitbit_config" }, 500);

    const days = Math.min(90, Math.max(1, Number((await req.json().catch(() => ({})))?.days) || 14));

    // load stored tokens
    const rowRes = await dbFetch(`fitbit_tokens?user_id=eq.${uid}&select=access_token,refresh_token,expires_at`, { method: "GET" });
    const row = (await rowRes.json())?.[0];
    if (!row) return json({ error: "not_connected", needsReconnect: true }, 409);

    // refresh access token if it expires within 2 minutes
    let accessToken = row.access_token as string;
    if (new Date(row.expires_at).getTime() - Date.now() < 120_000) {
      const rr = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: row.refresh_token,
          client_id: clientId,
          client_secret: clientSecret,
        }).toString(),
      });
      const rj = await rr.json();
      if (!rr.ok || !rj.access_token) {
        // refresh token expired/revoked (7-day Testing limit) → user must reconnect
        if (rj?.error === "invalid_grant") return json({ error: "invalid_grant", needsReconnect: true }, 401);
        return json({ error: "refresh_failed", detail: rj?.error_description || rj?.error || String(rr.status) }, 502);
      }
      accessToken = rj.access_token;
      const expiresAt = new Date(Date.now() + (rj.expires_in ?? 3600) * 1000).toISOString();
      await dbFetch(`fitbit_tokens?user_id=eq.${uid}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ access_token: accessToken, expires_at: expiresAt, updated_at: new Date().toISOString() }),
      });
    }

    const auth = { Authorization: `Bearer ${accessToken}`, Accept: "application/json" };
    const now = new Date();
    const startD = new Date(now.getTime() - (days - 1) * 864e5);
    const startCivil = { year: startD.getUTCFullYear(), month: startD.getUTCMonth() + 1, day: startD.getUTCDate() };
    const endCivil = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1, day: now.getUTCDate() };

    // ---- STEPS: daily totals via dailyRollUp ----
    const steps: { date: string; count: number }[] = [];
    const sr = await fetch(`${HEALTH_BASE}/steps/dataPoints:dailyRollUp`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ range: { start: { date: startCivil }, end: { date: { ...endCivil } } } }),
    });
    const sj = await sr.json();
    if (sr.ok && Array.isArray(sj.rollupDataPoints)) {
      for (const p of sj.rollupDataPoints) {
        const d = p?.civilStartTime?.date;
        const c = parseInt(p?.steps?.countSum ?? "0", 10);
        if (d && c > 0) steps.push({ date: ymd(d), count: c });
      }
    }

    // ---- SLEEP: sessions with stages, aggregated per wake-date ----
    // Sleep data points don't support interval filtering, so we page newest-first
    // (the API's default order) and stop once we pass the start of the window.
    const sleepByDate: Record<string, { minutes: number; deep: number; rem: number; light: number; awake: number; inBed: number }> = {};
    const startStr = ymd(startCivil);
    let pageToken = "";
    let reachedOld = false;
    for (let guard = 0; guard < 12 && !reachedOld; guard++) {
      const url = new URL(`${HEALTH_BASE}/sleep/dataPoints`);
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const slr = await fetch(url.toString(), { headers: auth });
      const slj = await slr.json();
      if (!slr.ok) break;
      for (const p of slj.dataPoints || []) {
        const sl = p.sleep;
        if (!sl?.interval) continue;
        const date = civilDate(sl.interval.endTime, sl.interval.endUtcOffset);
        if (date < startStr) { reachedOld = true; continue; } // past the window — stop after this page
        const b = sleepByDate[date] || (sleepByDate[date] = { minutes: 0, deep: 0, rem: 0, light: 0, awake: 0, inBed: 0 });
        b.inBed += minutesBetween(sl.interval.startTime, sl.interval.endTime);
        for (const st of sl.stages || []) {
          const m = minutesBetween(st.startTime, st.endTime);
          if (st.type === "DEEP") { b.deep += m; b.minutes += m; }
          else if (st.type === "REM") { b.rem += m; b.minutes += m; }
          else if (st.type === "LIGHT") { b.light += m; b.minutes += m; }
          else if (st.type === "AWAKE") { b.awake += m; }
        }
      }
      pageToken = slj.nextPageToken || "";
      if (!pageToken) break;
    }
    const sleep = Object.entries(sleepByDate)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    steps.sort((a, b) => a.date.localeCompare(b.date));
    return json({ ok: true, syncedAt: new Date().toISOString(), steps, sleep });
  } catch (e) {
    return json({ error: String(e) }, 400);
  }
});
