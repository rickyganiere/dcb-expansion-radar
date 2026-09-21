let jwksCache = { expiresAt: 0, keys: [] };

function decodeBase64UrlBytes(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, ch => ch.charCodeAt(0));
}

function decodeBase64UrlJson(value) {
  const bytes = decodeBase64UrlBytes(value);
  return JSON.parse(new TextDecoder().decode(bytes));
}

function cookieValue(request, name) {
  const raw = request?.headers?.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

async function loadAccessKeys(teamDomain, force = false) {
  const now = Date.now();
  if (!force && jwksCache.keys.length && jwksCache.expiresAt > now) {
    return jwksCache.keys;
  }

  const response = await fetch(teamDomain + "/cdn-cgi/access/certs", {
    headers: { accept: "application/json" }
  });
  if (!response.ok) throw new Error("access_jwks_unavailable");

  const payload = await response.json();
  const keys = Array.isArray(payload?.keys) ? payload.keys : [];
  if (!keys.length) throw new Error("access_jwks_empty");

  jwksCache = {
    keys,
    expiresAt: now + 60 * 60 * 1000
  };
  return keys;
}

async function verifyJwtSignature(token, teamDomain) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new Error("access_jwt_malformed");

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeBase64UrlJson(encodedHeader);
  const payload = decodeBase64UrlJson(encodedPayload);

  if (header?.alg !== "RS256" || !header?.kid) {
    throw new Error("access_jwt_algorithm");
  }

  let keys = await loadAccessKeys(teamDomain);
  let jwk = keys.find(key => key.kid === header.kid);
  if (!jwk) {
    keys = await loadAccessKeys(teamDomain, true);
    jwk = keys.find(key => key.kid === header.kid);
  }
  if (!jwk) throw new Error("access_jwt_key_missing");

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const verified = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    decodeBase64UrlBytes(encodedSignature),
    new TextEncoder().encode(encodedHeader + "." + encodedPayload)
  );
  if (!verified) throw new Error("access_jwt_invalid_signature");

  const now = Math.floor(Date.now() / 1000);
  const issuer = String(payload?.iss || "").replace(/\/$/, "");
  if (issuer !== teamDomain) throw new Error("access_jwt_invalid_issuer");
  if (payload?.exp && Number(payload.exp) <= now) throw new Error("access_jwt_expired");
  if (payload?.nbf && Number(payload.nbf) > now + 30) throw new Error("access_jwt_not_active");
  if (payload?.type && payload.type !== "app") throw new Error("access_jwt_wrong_type");

  const email = String(payload?.email || "").trim().toLowerCase();
  if (!email) throw new Error("access_email_missing");

  const aud = Array.isArray(payload.aud)
    ? payload.aud.map(String).filter(Boolean)
    : payload.aud ? [String(payload.aud)] : [];

  if (!aud.length) throw new Error("access_audience_missing");

  return { email, aud, method: "signed-jwt" };
}

export async function getVerifiedAccessIdentity(request, env, ctx) {
  if (ctx?.access) {
    try {
      const identity = await ctx.access.getIdentity();
      const email = String(identity?.email || "").trim().toLowerCase();
      const aud = ctx.access.aud ? [String(ctx.access.aud)] : [];
      if (email) return { email, aud, method: "ctx-access" };
    } catch {
      // Static Assets routing can make ctx.access unavailable; fall through to JWT.
    }
  }

  const teamDomain = String(env?.ACCESS_TEAM_DOMAIN || "").replace(/\/$/, "");
  if (!teamDomain) return null;

  const assertion =
    request?.headers?.get("cf-access-jwt-assertion") ||
    cookieValue(request, "CF_Authorization");

  if (!assertion) return null;

  try {
    const verified = await verifyJwtSignature(assertion, teamDomain);
    const headerEmail = String(
      request?.headers?.get("cf-access-authenticated-user-email") || ""
    ).trim().toLowerCase();

    if (headerEmail && headerEmail !== verified.email) return null;
    return verified;
  } catch {
    return null;
  }
}

export async function enforcePinnedAudience(db, identity) {
  if (!db || !identity) return false;

  const audiences = Array.isArray(identity.aud)
    ? identity.aud.map(String).filter(Boolean)
    : [];

  // ctx.access is already directly verified by Cloudflare. It can occasionally
  // expose identity before an aud value is available, so only JWT fallback
  // requires explicit audience pinning.
  if (!audiences.length && identity.method === "ctx-access") return true;
  if (!audiences.length) return false;

  const existing = await db
    .prepare("SELECT value FROM app_meta WHERE key = 'access_aud' LIMIT 1")
    .first();

  if (existing?.value) {
    return audiences.includes(String(existing.value));
  }

  const selected = audiences[0];
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO app_meta (key, value, updated_at)
    VALUES ('access_aud', ?1, ?2)
    ON CONFLICT(key) DO NOTHING`)
    .bind(selected, now)
    .run();

  const pinned = await db
    .prepare("SELECT value FROM app_meta WHERE key = 'access_aud' LIMIT 1")
    .first();

  return Boolean(pinned?.value && audiences.includes(String(pinned.value)));
}
