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
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #E7E3D9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1A1A18; padding: 24px; }
  .card { background: #FCFAF5; border: 2px solid #1A1A18; border-radius: 4px; padding: 40px 36px; width: 100%; max-width: 380px; text-align: center; }
  .mark { font-family: Georgia, "Times New Roman", serif; font-size: 56px; color: #B08A5B; line-height: 1; margin-bottom: 8px; }
  h1 { font-family: Georgia, serif; font-weight: 500; font-size: 20px; margin: 0 0 4px; }
  p.sub { margin: 0 0 24px; font-size: 14px; color: #6b6b63; }
  form { display: flex; flex-direction: column; gap: 12px; }
  input[type=password] { padding: 12px 14px; font-size: 16px; border: 1px solid #b7b3a8; border-radius: 3px; background: #fff; }
  input[type=password]:focus { outline: none; border-color: #1A1A18; }
  button { padding: 12px 14px; font-size: 15px; font-weight: 600; color: #FCFAF5; background: #1A1A18; border: none; border-radius: 3px; cursor: pointer; }
  button:hover { background: #333; }
  .err { color: #a3352b; font-size: 13px; margin: 0; ${error ? "" : "display:none;"} }
</style>
</head>
<body>
  <div class="card">
    <div class="mark">F</div>
    <h1>Flatow Furniture</h1>
    <p class="sub">This proposal is private. Please enter the password to view it.</p>
    <form method="POST" action="${LANDING}">
      <input type="password" name="password" placeholder="Password" autofocus autocomplete="current-password" required>
      <button type="submit">View proposal</button>
      <p class="err">Incorrect password. Please try again.</p>
    </form>
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
