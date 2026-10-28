// The build injects the HTML page here; keeping this file importable enables parser tests.
const PAGE = ""; // @INJECT_PAGE

const SOURCES = {
  mdk: { name: "MDK.CAB", searchUrl: "https://mdk.cab/" },
  emu: { name: "Emu-Land", searchUrl: "https://www.emu-land.net/en/search_games" },
  roms: { name: "RomsDL", searchUrl: "https://romsdl.com/search" },
};

const ALLOWED = Object.keys(SOURCES);
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=60",
  "x-content-type-options": "nosniff",
};

function textOnly(html = "") {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_all, n) => {
      const code = n[0].toLowerCase() === "x" ? parseInt(n.slice(1), 16) : parseInt(n, 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    })
    .replace(/&(?:amp|quot|apos|lt|gt|nbsp|#39);/gi, x => ({
      "&amp;": "&", "&quot;": '"', "&apos;": "'", "&lt;": "<", "&gt;": ">", "&nbsp;": " ", "&#39;": "'"
    })[x.toLowerCase()] || x)
    .replace(/\s+/g, " ").trim();
}

export function parseMdk(html) {
  const items = [];
  const pattern = /<details\b[^>]*\bdata-name="([a-z\d_]+)"[^>]*>\s*<summary>([\s\S]*?)<\/summary>/gi;
  let m;
  while ((m = pattern.exec(html)) !== null && items.length < 50) {
    const id = m[1].toLowerCase();
    const title = textOnly(m[2]);
    if (title) items.push({ id, title, url: "https://mdk.cab/game/" + id });
  }
  return items;
}

export function parseEmu(html) {
  const items = [], seen = new Set();
  const pattern = /<a\b[^>]*href="(\/en\/arcade\/mame\/roms\/([a-z\d_]+))"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = pattern.exec(html)) !== null && items.length < 50) {
    const id = m[2].toLowerCase();
    if (seen.has(id)) continue;
    const title = textOnly(m[3]);
    if (!title) continue;
    seen.add(id);
    items.push({ id, title, url: "https://www.emu-land.net" + m[1] });
  }
  return items;
}

export function parseRoms(html) {
  const items = [], seen = new Set();
  const anchor = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = anchor.exec(html)) !== null && items.length < 50) {
    if (!/class="[^"]*\brom-box\b[^"]*"/i.test(m[1])) continue;
    const href = /href="([^"]+)"/i.exec(m[1])?.[1] || "";
    if (!/^\/roms\/(?:mame|capcom-play-system-3)\/[a-z\d-]+-\d+$/i.test(href)) continue;
    if (seen.has(href)) continue;
    const title = textOnly(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i.exec(m[2])?.[1] || "");
    if (!title) continue;
    seen.add(href);
    items.push({
      id: "",
      title: title.replace(/^Name:\s*/i, ""),
      url: "https://romsdl.com" + href,
      platform: href.includes("capcom-play-system-3") ? "CPS3" : "MAME",
    });
  }
  return items;
}

async function fetchHtml(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8500);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: "follow",
      headers: {
        accept: "text/html,application/xhtml+xml",
        ...(options.headers || {}),
      },
    });
    if (!response.ok) throw new Error("상대 사이트 응답 오류 (HTTP " + response.status + ")");
    const body = await response.text();
    if (/cf-challenge|cf-chl-|verify you are human|checking your browser/i.test(body)) {
      throw new Error("상대 사이트에서 자동 요청 확인이 필요합니다");
    }
    return body;
  } catch (error) {
    if (controller.signal.aborted) throw new Error("상대 사이트 연결 시간 초과");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function searchMdk(query) {
  const isRomId = /^[a-z\d_-]{2,20}$/i.test(query);
  const what = isRomId ? "name" : "description";
  const body = new URLSearchParams({ search: query, what, year: "", genre: "", show: "" });
  const html = await fetchHtml("https://mdk.cab/search.php", {
    method: "POST",
    body,
    headers: { "content-type": "application/x-www-form-urlencoded" },
  });
  return parseMdk(html);
}

async function searchEmu(query) {
  const url = "https://www.emu-land.net/en/search_games?q=" + encodeURIComponent(query);
  return parseEmu(await fetchHtml(url));
}

async function searchRoms(query) {
  const url = "https://romsdl.com/search?search_term_string=" + encodeURIComponent(query);
  return parseRoms(await fetchHtml(url));
}

function cleanedTitle(title) {
  return title.split("(")[0].split(" / ")[0].replace(/\s+/g, " ").trim().slice(0, 80);
}

async function searchAll(query, keys) {
  const jobs = {
    mdk: () => searchMdk(query),
    emu: () => searchEmu(query),
    roms: () => searchRoms(query),
  };
  const results = {};
  await Promise.all(keys.map(async key => {
    try {
      results[key] = { status: "ok", items: await jobs[key]() };
    } catch (err) {
      results[key] = { status: "error", items: [], error: String(err.message || err).slice(0,180) };
    }
  }));

  // MAME file IDs such as sfiii3 aren't indexed as titles on RomsDL.
  // If another site resolves the ID, retry RomsDL with its verified game title.
  if (keys.includes("roms") && /^[a-z\d_-]{2,20}$/i.test(query)
      && results.roms.status === "ok" && results.roms.items.length === 0) {
    const match = [...(results.mdk?.items || []), ...(results.emu?.items || [])]
      .find(item => item.id.toLowerCase() === query.toLowerCase());
    if (match) {
      const title = cleanedTitle(match.title);
      try { results.roms.items = await searchRoms(title); }
      catch (err) { results.roms = { status: "error", items: [], error: String(err.message || err).slice(0,180) }; }
    }
  }

  return Object.fromEntries(keys.map(key => [
    key,
    { ...results[key], name: SOURCES[key].name, count: results[key].items.length,
      searchUrl: key === "mdk" ? SOURCES[key].searchUrl
        : key === "emu" ? SOURCES[key].searchUrl + "?q=" + encodeURIComponent(query)
        : SOURCES[key].searchUrl + "?search_term_string=" + encodeURIComponent(query) },
  ]));
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
    if (url.pathname === "/") {
      return new Response(PAGE, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=300",
          "x-content-type-options": "nosniff",
          "referrer-policy": "strict-origin-when-cross-origin",
          "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'",
        },
      });
    }
    if (url.pathname !== "/api/search") return new Response("Not found", { status: 404 });
    const query = (url.searchParams.get("q") || "").trim().replace(/\s+/g, " ");
    if (!query || query.length > 100) {
      return new Response(JSON.stringify({ error: "검색어는 1~100자로 입력해 주세요." }), { status: 400, headers: JSON_HEADERS });
    }
    const chosen = (url.searchParams.get("sites") || "mdk,emu,roms").split(",");
    const keys = [...new Set(chosen)].filter(x => ALLOWED.includes(x));
    if (!keys.length) return new Response(JSON.stringify({ error: "검색할 사이트를 선택해 주세요." }), { status: 400, headers: JSON_HEADERS });
    const sources = await searchAll(query, keys);
    return new Response(JSON.stringify({ query, sources }), { headers: JSON_HEADERS });
  },
};
