import type { WebsiteAnalysis, WebsitePageSnapshot } from "@/types/opportunity";
import { WEBSITE_MAX_PAGES, websiteTimeoutMs } from "./config";
import {
  canonicalizeUrl,
  countWords,
  extractMetaDescription,
  extractTitle,
  htmlToText,
  isPublicHttpUrl,
} from "./util";

/**
 * Website analysis module.
 *
 * Fetches a discovered business's own public website and reduces it to plain
 * text. It reads only what the business itself publishes — no third-party
 * enrichment, no inference. Failure is returned as data (`ok: false`), never
 * thrown, so the pipeline can continue with a partial result.
 */

const MAX_BYTES = 1_500_000;
const MAX_COMBINED_CHARS = 24_000;
const USER_AGENT =
  "MarketMindBot/0.1 (+https://marketmind.ai/bot; opportunity-discovery)";

const INTERNAL_LINK_KEYWORDS = [
  "about",
  "service",
  "services",
  "party",
  "parties",
  "birthday",
  "birthdays",
  "package",
  "packages",
  "event",
  "events",
  "celebrate",
  "celebration",
  "kids",
  "book",
  "booking",
  "pricing",
];

interface FetchedPage {
  finalUrl: string;
  status: number;
  html: string;
  truncated: boolean;
}

/**
 * Cross-domain redirect guard.
 *
 * Confirmed bug (Evaluation Lab data-quality investigation, Sept 2026): a
 * business's recorded website can be an expired/parked/resold domain that
 * `fetch(..., { redirect: "follow" })` happily follows to a completely
 * unrelated site — we then attributed that unrelated site's text to the
 * business as "its own website evidence". Guard against it: compare the
 * normalized domain of the URL we actually landed on against the domain we
 * requested (both via the same canonicalizeUrl used everywhere else, so
 * "www." and scheme differences never count as a mismatch). A redirect off
 * that domain is treated as a failed fetch, not as content belonging to the
 * business — the pipeline already handles fetch failure as data (`ok:false`),
 * so this doesn't need a new state anywhere downstream.
 */
function isOffDomainRedirect(requestedDomain: string, finalUrl: string): boolean {
  const finalDomain = canonicalizeUrl(finalUrl)?.domain;
  return Boolean(finalDomain) && finalDomain !== requestedDomain;
}

function emptyAnalysis(
  requestedUrl: string | null,
  patch: Partial<WebsiteAnalysis>,
): WebsiteAnalysis {
  return {
    requestedUrl,
    finalUrl: null,
    ok: false,
    skipped: false,
    statusCode: null,
    fetchedAt: new Date().toISOString(),
    pages: [],
    combinedText: "",
    totalWords: 0,
    truncated: false,
    error: null,
    ...patch,
  };
}

async function fetchPage(
  url: string,
  timeoutMs: number,
): Promise<FetchedPage | { error: string; status: number | null }> {
  if (!isPublicHttpUrl(url)) {
    return { error: "URL is not a public http(s) address.", status: null };
  }

  let response: Response;
  try {
    response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml",
      },
    });
  } catch (cause) {
    const reason =
      cause instanceof Error && cause.name === "TimeoutError"
        ? `Timed out after ${timeoutMs}ms`
        : cause instanceof Error
          ? cause.message
          : "Network error";
    return { error: reason, status: null };
  }

  if (!response.ok) {
    return { error: `HTTP ${response.status}`, status: response.status };
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("html")) {
    return {
      error: `Unsupported content-type: ${contentType || "unknown"}`,
      status: response.status,
    };
  }

  const buffer = await response.arrayBuffer();
  const truncated = buffer.byteLength > MAX_BYTES;
  const html = new TextDecoder("utf-8", { fatal: false }).decode(
    truncated ? buffer.slice(0, MAX_BYTES) : buffer,
  );

  return {
    finalUrl: response.url || url,
    status: response.status,
    html,
    truncated,
  };
}

function pickInternalLinks(
  html: string,
  origin: string,
  alreadyFetched: Set<string>,
  max: number,
): string[] {
  const links = new Map<string, number>();
  const anchorRe = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorRe.exec(html))) {
    const [, href, inner] = match;
    let resolved: URL;
    try {
      resolved = new URL(href, origin);
    } catch {
      continue;
    }
    if (resolved.origin !== origin) continue;
    const canonical = canonicalizeUrl(resolved.toString());
    if (!canonical || alreadyFetched.has(canonical.href)) continue;

    const haystack = `${resolved.pathname} ${htmlToText(inner)}`.toLowerCase();
    const score = INTERNAL_LINK_KEYWORDS.reduce(
      (acc, kw) => (haystack.includes(kw) ? acc + 1 : acc),
      0,
    );
    if (score > 0) {
      links.set(canonical.href, Math.max(links.get(canonical.href) ?? 0, score));
    }
  }

  return Array.from(links.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([href]) => href);
}

function toSnapshot(url: string, html: string): WebsitePageSnapshot {
  const title = extractTitle(html);
  const metaDescription = extractMetaDescription(html);
  const body = htmlToText(html);
  const text = [metaDescription, body].filter(Boolean).join("\n").trim();
  return { url, title, text, wordCount: countWords(text) };
}

export async function analyzeWebsite(
  websiteUrl: string | null,
  options: { enabled: boolean },
): Promise<WebsiteAnalysis> {
  const canonical = websiteUrl ? canonicalizeUrl(websiteUrl) : null;

  if (!options.enabled) {
    return emptyAnalysis(canonical?.href ?? websiteUrl, {
      skipped: true,
      error: "Website analysis was disabled for this run.",
    });
  }
  if (!canonical) {
    return emptyAnalysis(websiteUrl, {
      skipped: true,
      error: websiteUrl
        ? "Website URL could not be parsed."
        : "No website on record for this business.",
    });
  }

  const timeoutMs = websiteTimeoutMs();
  const home = await fetchPage(canonical.href, timeoutMs);

  if ("error" in home) {
    return emptyAnalysis(canonical.href, {
      error: home.error,
      statusCode: home.status,
    });
  }
  if (isOffDomainRedirect(canonical.domain, home.finalUrl)) {
    return emptyAnalysis(canonical.href, {
      error: `Website redirected to an unrelated domain (${canonicalizeUrl(home.finalUrl)?.domain ?? home.finalUrl}) — not treated as this business's content.`,
      statusCode: home.status,
    });
  }

  const fetched = new Set<string>([canonical.href]);
  const pages: WebsitePageSnapshot[] = [toSnapshot(home.finalUrl, home.html)];
  let truncated = home.truncated;

  const extraLinks = pickInternalLinks(
    home.html,
    canonical.origin,
    fetched,
    WEBSITE_MAX_PAGES - 1,
  );

  for (const link of extraLinks) {
    fetched.add(link);
    const page = await fetchPage(link, timeoutMs);
    if ("error" in page) continue;
    // Same guard for secondary pages: an internal link can itself redirect
    // off-domain (e.g. a "book now" link to a third-party platform).
    if (isOffDomainRedirect(canonical.domain, page.finalUrl)) continue;
    truncated = truncated || page.truncated;
    pages.push(toSnapshot(page.finalUrl, page.html));
  }

  let combinedText = pages
    .map((p) => `# ${p.title ?? p.url}\n${p.text}`)
    .join("\n\n")
    .trim();
  if (combinedText.length > MAX_COMBINED_CHARS) {
    combinedText = combinedText.slice(0, MAX_COMBINED_CHARS);
    truncated = true;
  }

  return {
    requestedUrl: canonical.href,
    finalUrl: home.finalUrl,
    ok: combinedText.length > 0,
    skipped: false,
    statusCode: home.status,
    fetchedAt: new Date().toISOString(),
    pages,
    combinedText,
    totalWords: countWords(combinedText),
    truncated,
    error: combinedText.length > 0 ? null : "No readable text found on the site.",
  };
}
