// Password gate for the Amanda Salazar dining-nook banquette proposal.
//
// This runs on Netlify's edge before the static file is served, so the
// proposal HTML is NEVER sent to the browser until the correct password is
// supplied. That makes it genuinely protected — unlike a client-side JS gate,
// the content isn't hidden in page source. It also stamps X-Robots-Tag so the
// page (and the login screen) stay out of search indexes.

const PASSWORD = "AmandaSalazarJuly26";
const COOKIE = "ff_proposal_amanda";
const COOKIE_PATH = "/proposals/amanda-salazar";
const LANDING = "/proposals/amanda-salazar/";

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseCookies(header) {
  const out = {};
  for (const part of (header || "").split(";")) {
    const i = part.indexOf("=");
    if (i > -1) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

function loginPage(error) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Flatow Furniture — Private Proposal</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,500;1,400&display=swap" rel="stylesheet">
<style>
  :root {
    color-scheme: light;
    --bg: #f3efe8;
    --card: #faf8f5;
    --ink: #2c2825;
    --muted: #8a7a5e;
    --accent: #8a7a5e;
    --border: rgba(100, 90, 70, 0.2);
    --serif: 'Crimson Pro', Georgia, serif;
    --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; min-height: 100dvh; display: flex; align-items: center; justify-content: center;
    background: var(--bg); color: var(--ink); font-family: var(--serif); padding: 24px; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 3px;
    box-shadow: 0 1px 2px rgba(44,40,37,0.04), 0 18px 50px -28px rgba(44,40,37,0.28);
    padding: 48px 44px 40px; width: 100%; max-width: 400px; text-align: center; }
  .eyebrow { font-family: var(--sans); font-size: 11px; font-weight: 600; letter-spacing: 0.22em;
    text-transform: uppercase; color: var(--accent); margin: 0 0 24px; }
  .logo { width: 190px; max-width: 72%; height: auto; margin: 0 auto 4px; display: block; }
  .rule { width: 40px; height: 1px; background: var(--border); border: 0; margin: 24px auto 20px; }
  .lead { font-size: 19px; line-height: 1.4; margin: 0 0 4px; color: var(--ink); }
  .lead em { font-style: italic; }
  .sub { font-size: 16px; line-height: 1.5; color: var(--muted); margin: 0 0 26px; }
  form { display: flex; flex-direction: column; gap: 12px; text-align: left; }
  label.field { font-family: var(--sans); font-size: 11px; font-weight: 600; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--muted); margin-bottom: -4px; }
  input[type=password] { width: 100%; padding: 13px 15px; font-family: var(--serif); font-size: 17px;
    color: var(--ink); border: 1px solid var(--border); border-radius: 2px; background: #fff; transition: border-color .15s, box-shadow .15s; }
  input[type=password]::placeholder { color: #b3a998; }
  input[type=password]:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(138,122,94,0.15); }
  button { margin-top: 4px; padding: 14px 16px; font-family: var(--sans); font-size: 12px; font-weight: 600;
    letter-spacing: 0.14em; text-transform: uppercase; color: var(--card); background: var(--ink);
    border: none; border-radius: 2px; cursor: pointer; transition: background .15s; }
  button:hover { background: #46403a; }
  .err { font-family: var(--sans); color: #a3352b; font-size: 13px; margin: 2px 0 0; text-align: center; ${error ? "" : "display:none;"} }
  .foot { font-family: var(--sans); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
    color: #b3a998; margin: 28px 0 0; }
</style>
</head>
<body>
  <div class="card">
    <p class="eyebrow">Private Proposal</p>
    <img class="logo" src="/images/logo/dark-logo.png" alt="Flatow Furniture" width="449" height="270">
    <hr class="rule">
    <p class="lead">Prepared for <em>Amanda Salazar</em></p>
    <p class="sub">Please enter the password to view this proposal.</p>
    <form method="POST" action="${LANDING}">
      <label class="field" for="pw">Password</label>
      <input id="pw" type="password" name="password" placeholder="Enter password" autofocus autocomplete="current-password" required>
      <button type="submit">View proposal</button>
      <p class="err">That password isn’t right. Please try again.</p>
    </form>
    <p class="foot">flatowfurniture.com</p>
  </div>
</body>
</html>`;
}

function htmlResponse(body, status) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

export default async (request, context) => {
  const expected = await sha256(PASSWORD);

  // Login submission
  if (request.method === "POST") {
    const form = await request.formData();
    if ((form.get("password") || "") === PASSWORD) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: LANDING,
          "Set-Cookie": `${COOKIE}=${expected}; Path=${COOKIE_PATH}; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
        },
      });
    }
    return htmlResponse(loginPage(true), 401);
  }

  // Already authenticated → serve the real page, kept out of search indexes.
  const cookies = parseCookies(request.headers.get("cookie"));
  if (cookies[COOKIE] === expected) {
    const res = await context.next();
    const out = new Response(res.body, res);
    out.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return out;
  }

  // Not authenticated → show the password form.
  return htmlResponse(loginPage(false), 401);
};

export const config = {
  path: ["/proposals/amanda-salazar", "/proposals/amanda-salazar/*"],
};
