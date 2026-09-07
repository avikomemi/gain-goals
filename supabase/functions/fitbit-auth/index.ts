import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// fitbit-auth — OAuth token exchange + connection status for Fitbit, via the
// Google Health API (the successor to the legacy Fitbit Web API).
// Actions (POST body { action }):
//   connect    — exchange an authorization `code` (Google OAuth) for tokens, store them
//   status     — is this user connected? (no tokens returned to the client, ever)
//   disconnect — delete this user's tokens
// Tokens live only in public.fitbit_tokens, written with the service role.
// The client never sees them; it tracks connection state in its own snapshot.
//
// NOTE: googlehealth.* scopes are Restricted; in "Testing" publishing status Google
// refresh tokens expire after 7 days, so the user re-connects weekly.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
// Public Google OAuth client id (Web application). Not a secret. Env override wins.
const CLIENT_ID_FALLBACK = "24754643464-5d6jg05iqa3tn9uapq95vb2v53gqvt7q.apps.googleusercontent.com";

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// decode a JWT payload (no verification — used only to read our own id_token's sub)
function jwtPayload(token: string): Record<string, unknown> | null {
  const parts = (token || "").split(".");
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)));
  } catch {
    return null;
  }
}

// user_id from the already-verified Supabase JWT (verify_jwt=true gates before we run)
function userIdFromJwt(req: Request): string | null {
  const auth = req.headers.get("Authorization") || "";
  const p = jwtPayload(auth.replace(/^Bearer\s+/i, ""));
  return (p?.sub as string) || null;
}

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function dbFetch(path: string, init: RequestInit) {
  return fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SB_SERVICE,
      Authorization: `Bearer ${SB_SERVICE}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const uid = userIdFromJwt(req);
    if (!uid) return json({ error: "no_user" }, 401);

    const clientId = Deno.env.get("FITBIT_CLIENT_ID") || CLIENT_ID_FALLBACK;
    const clientSecret = Deno.env.get("FITBIT_CLIENT_SECRET");
    if (!clientId || !clientSecret) return json({ error: "missing_fitbit_config" }, 500);

    const body = await req.json().catch(() => ({}));
    const action = body.action || "connect";

    if (action === "status") {
      const r = await dbFetch(
        `fitbit_tokens?user_id=eq.${uid}&select=scope,updated_at,fitbit_user_id`,
        { method: "GET" },
      );
      const rows = await r.json();
      const row = Array.isArray(rows) ? rows[0] : null;
      return json({ connected: !!row, scope: row?.scope, connectedAt: row?.updated_at });
    }

    if (action === "disconnect") {
      await dbFetch(`fitbit_tokens?user_id=eq.${uid}`, { method: "DELETE" });
      return json({ ok: true, connected: false });
    }

    // action === "connect" — exchange the Google authorization code for tokens
    const { code, redirectUri } = body;
    if (!code || !redirectUri) return json({ error: "missing_code" }, 400);

    const form = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });
    const tr = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const tj = await tr.json();
    if (!tr.ok || !tj.access_token) {
      return json(
        { error: "google_token_error", detail: tj?.error_description || tj?.error || String(tr.status) },
        502,
      );
    }
    if (!tj.refresh_token) {
      // Without a refresh token we can't sync in the background. Happens if consent
      // was granted before without prompt=consent — the client forces it, so treat as an error.
      return json({ error: "no_refresh_token", detail: "Google did not return a refresh token — reconnect and approve access." }, 502);
    }

    const googleSub = (jwtPayload(tj.id_token)?.sub as string) || null;
    const expiresAt = new Date(Date.now() + (tj.expires_in ?? 3600) * 1000).toISOString();
    const up = await dbFetch(`fitbit_tokens?on_conflict=user_id`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([
        {
          user_id: uid,
          access_token: tj.access_token,
          refresh_token: tj.refresh_token,
          expires_at: expiresAt,
          fitbit_user_id: googleSub,
          scope: tj.scope,
          updated_at: new Date().toISOString(),
        },
      ]),
    });
    if (!up.ok) return json({ error: "db_write_failed", detail: await up.text() }, 500);

    return json({ ok: true, connected: true, scope: tj.scope });
  } catch (e) {
    return json({ error: String(e) }, 400);
  }
});
