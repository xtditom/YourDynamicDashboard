const UPSTREAM_URL = "https://ac.duckduckgo.com/ac/";
const CACHE_SECONDS = 300;
const MAX_QUERY_LENGTH = 256;
const MAX_RESULTS = 10;

const CORS_HEADERS = Object.freeze({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
});

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}

function readSuggestions(payload, typedQuery) {
  const candidates = Array.isArray(payload?.[1])
    ? payload[1]
    : Array.isArray(payload)
      ? payload
      : [];
  const typed = typedQuery.toLocaleLowerCase();
  const seen = new Set();
  return candidates
    .map((candidate) => {
      if (typeof candidate === "string") return candidate;
      if (candidate && typeof candidate.phrase === "string") return candidate.phrase;
      if (candidate && typeof candidate.query === "string") return candidate.query;
      return "";
    })
    .filter((candidate) => {
      const normalized = candidate.trim().toLocaleLowerCase();
      if (!normalized || normalized === typed || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .slice(0, MAX_RESULTS)
    .map((candidate) => candidate.trim().slice(0, MAX_QUERY_LENGTH));
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== "GET") return json({ suggestions: [] }, 405);

    const requestUrl = new URL(request.url);
    if (requestUrl.pathname !== "/suggest") {
      return json({ suggestions: [] }, 404);
    }

    const query = (requestUrl.searchParams.get("q") || "").trim();
    if (query.length < 2 || query.length > MAX_QUERY_LENGTH) {
      return json({ suggestions: [] }, 400);
    }

    try {
      const upstream = new URL(UPSTREAM_URL);
      upstream.searchParams.set("q", query);
      upstream.searchParams.set("type", "list");
      const response = await fetch(upstream, {
        headers: { Accept: "application/json" },
        cf: { cacheEverything: true, cacheTtl: CACHE_SECONDS },
      });
      if (!response.ok) return json({ suggestions: [] }, 502);

      const payload = await response.json();
      return json(
        { suggestions: readSuggestions(payload, query) },
        200,
        { "Cache-Control": `public, max-age=${CACHE_SECONDS}` },
      );
    } catch {
      return json({ suggestions: [] }, 502);
    }
  },
};
