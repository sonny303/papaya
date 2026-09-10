export const consentVersion = "2026-09-10";
export function validateSubmission(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { kind, email, consent, name = "", clinic = "", website = "" } = value;
  if (
    !["waitlist", "clinic"].includes(kind) ||
    consent !== true ||
    website !== ""
  )
    return null;
  if (
    typeof email !== "string" ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  )
    return null;
  if (typeof name !== "string" || typeof clinic !== "string") return null;
  if (
    name.length > 100 ||
    clinic.length > 160 ||
    [...(name + clinic)].some((character) => character.charCodeAt(0) < 32)
  )
    return null;
  if (kind === "clinic" && (!name.trim() || !clinic.trim())) return null;
  return {
    kind,
    email: email.trim().toLowerCase(),
    ...(kind === "clinic" ? { name: name.trim(), clinic: clinic.trim() } : {}),
    consentVersion,
  };
}

export async function handleSubmission(request, env, now = new Date()) {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  const reply = (status, body, extra = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...headers, ...extra },
    });
  if (request.method !== "POST")
    return reply(
      405,
      { error: "Use the signup form to submit." },
      { Allow: "POST" },
    );
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return reply(403, {
      error: "Please submit from the Papaya Health website.",
    });
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return reply(415, { error: "Invalid submission format." });
  if (Number(request.headers.get("content-length")) > 4096)
    return reply(413, { error: "Submission is too large." });
  let body;
  try {
    const reader = request.body?.getReader();
    if (!reader)
      return reply(400, { error: "Please check your details and try again." });
    let length = 0;
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 4096) {
        await reader.cancel();
        return reply(413, { error: "Submission is too large." });
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return reply(400, { error: "Please check your details and try again." });
  }
  const submission = validateSubmission(body);
  if (!submission)
    return reply(400, {
      error:
        "Enter a valid email, complete the required fields, and confirm consent.",
    });
  if (!env.DB || !env.SUBMISSION_HASH_SECRET)
    return reply(503, {
      error: "Signups are temporarily unavailable. Please try again shortly.",
    });
  const namespace = env.PAPAYA_ENV === "production" ? "production" : "preview";
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(env.SUBMISSION_HASH_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const hour = Math.floor(now.getTime() / 3600000);
    const bytes = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${namespace}:${hour}:${ip}`),
    );
    const rateId = Array.from(new Uint8Array(bytes), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    const results = await env.DB.batch([
      env.DB.prepare("DELETE FROM submission_limits WHERE expires_at < ?").bind(
        Math.floor(now.getTime() / 1000),
      ),
      env.DB.prepare(
        "INSERT INTO submission_limits (id,hits,expires_at) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET hits=hits+1 RETURNING hits",
      ).bind(rateId, (hour + 1) * 3600),
      env.DB.prepare(
        "INSERT INTO submissions (namespace,kind,email,name,clinic,consent_version,created_at) SELECT ?,?,?,?,?,?,? WHERE (SELECT hits FROM submission_limits WHERE id=?) <= 10 ON CONFLICT(namespace,kind,email) DO NOTHING",
      ).bind(
        namespace,
        submission.kind,
        submission.email,
        submission.name || "",
        submission.clinic || "",
        submission.consentVersion,
        now.toISOString(),
        rateId,
      ),
    ]);
    if (results.length !== 3 || results.some((result) => !result.success))
      throw Error("Storage did not acknowledge");
    const hits = results[1].results?.[0]?.hits;
    if (!Number.isInteger(hits)) throw Error("Missing rate result");
    if (hits > 10)
      return reply(
        429,
        { error: "Too many attempts. Please try again in an hour." },
        { "Retry-After": "3600" },
      );
    return reply(200, { saved: true });
  } catch {
    return reply(503, {
      error:
        "We could not confirm your signup. Please try again. Retrying will not create a duplicate.",
    });
  }
}
