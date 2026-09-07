// Fitbit connection (client side) — via the Google Health API.
// Fitbit's legacy Web API registration closed (sunset Sep 2026); the only path to
// Fitbit device data now is Google's Health API, over standard Google OAuth.
// The browser only handles the short-lived `code`; the real token exchange and
// storage happen in the `fitbit-auth` edge function (holds the client secret).
// The client tracks connection state in its own snapshot (DB.fitbit), never the token.
//
// NOTE: googlehealth.* scopes are Restricted. With the OAuth app in "Testing"
// publishing status, Google refresh tokens expire after 7 days — so Avi re-connects
// weekly. access_type=offline + prompt=consent make Google mint a fresh refresh
// token on every consent.
import { supabase } from './cloud';

// Public Google OAuth client id (Web application). NOT a secret — safe in the public
// repo. The matching client SECRET lives only as the FITBIT_CLIENT_SECRET Supabase secret.
export const FITBIT_CLIENT_ID = '24754643464-5d6jg05iqa3tn9uapq95vb2v53gqvt7q.apps.googleusercontent.com';

// Must match EXACTLY an "Authorized redirect URI" on the Google OAuth client.
export const FITBIT_REDIRECT_URI = 'https://avikomemi.github.io/gain-goals/';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

// Requested up front so we never need a new consent screen when we add a metric later.
const HEALTH_SCOPES = [
  'https://www.googleapis.com/auth/googlehealth.sleep.readonly',
  'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
];

const STATE_KEY = 'fitbit-oauth-state';

export const fitbitConfigured = () => FITBIT_CLIENT_ID.length > 0;

// Kick off the Google consent redirect. Stores a random `state` to guard the callback.
export function beginFitbitConnect() {
  if (!fitbitConfigured()) { alert('חיבור Fitbit עדיין לא הוגדר (חסר Client ID).'); return; }
  const state = crypto.randomUUID();
  localStorage.setItem(STATE_KEY, state);
  const p = new URLSearchParams({
    client_id: FITBIT_CLIENT_ID,
    redirect_uri: FITBIT_REDIRECT_URI,
    response_type: 'code',
    scope: HEALTH_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  window.location.href = `${GOOGLE_AUTH_URL}?${p.toString()}`;
}

// If this page load is the OAuth callback (?code + matching state), return the code.
export function readFitbitCallback(): { code: string } | null {
  const q = new URLSearchParams(window.location.search);
  const code = q.get('code');
  const state = q.get('state');
  if (!code) return null;
  const saved = localStorage.getItem(STATE_KEY);
  if (!state || state !== saved) return null; // not ours / CSRF guard
  return { code };
}

// Strip the ?code=... from the address bar after we've consumed it.
export function clearFitbitCallbackUrl() {
  localStorage.removeItem(STATE_KEY);
  const url = new URL(window.location.href);
  url.search = '';
  window.history.replaceState({}, '', url.toString());
}

export function exchangeFitbitCode(code: string) {
  return supabase.functions.invoke('fitbit-auth', {
    body: { action: 'connect', code, redirectUri: FITBIT_REDIRECT_URI },
  });
}

export function disconnectFitbit() {
  return supabase.functions.invoke('fitbit-auth', { body: { action: 'disconnect' } });
}

// Pull sleep + steps for the last `days`. Returns { ok, steps, sleep, syncedAt } or
// { needsReconnect } when the Google refresh token has expired (weekly, in Testing).
export function syncFitbit(days = 14) {
  return supabase.functions.invoke('fitbit-sync', { body: { days } });
}
