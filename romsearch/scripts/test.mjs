import assert from "node:assert/strict";
import app, { parseMdk, parseEmu, parseRoms } from "../worker/index.js";

const mdk = '<details open data-name="sfiii3"><summary>Street Fighter III 3rd Strike (Europe)</summary></details>';
assert.deepEqual(parseMdk(mdk), [{ id:"sfiii3", title:"Street Fighter III 3rd Strike (Europe)", url:"https://mdk.cab/game/sfiii3" }]);
const emu = '<a href="/en/arcade/mame/roms">ROMs</a><a href="/en/arcade/mame/roms/sfiii3">Street Fighter III 3rd Strike</a>';
assert.deepEqual(parseEmu(emu), [{ id:"sfiii3", title:"Street Fighter III 3rd Strike", url:"https://www.emu-land.net/en/arcade/mame/roms/sfiii3" }]);
const roms = '<a class="rom-box" href="/roms/mame/street-fighter-iii-40802"><h3>Name: Street Fighter III 3rd Strike (Europe)</h3></a>';
assert.deepEqual(parseRoms(roms), [{ id:"", title:"Street Fighter III 3rd Strike (Europe)", url:"https://romsdl.com/roms/mame/street-fighter-iii-40802", platform:"MAME" }]);
assert.deepEqual(parseRoms('<a href="/outside/evil" class="rom-box"><h3>bad</h3></a>'), []);

const originalFetch = globalThis.fetch;
const called = [];
globalThis.fetch = async (url, options = {}) => {
  called.push([String(url), options.method || "GET", options.body?.toString()]);
  if (String(url).includes("mdk.cab")) return new Response(mdk);
  if (String(url).includes("emu-land.net")) return new Response(emu);
  if (String(url).includes("sfiii3")) return new Response("<div>No title match</div>");
  return new Response(roms);
};
try {
  const response = await app.fetch(new Request("https://example.test/api/search?q=sfiii3"));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.sources.mdk.items[0].id, "sfiii3");
  assert.equal(data.sources.emu.items[0].id, "sfiii3");
  assert.equal(data.sources.roms.items[0].platform, "MAME");
  assert.ok(called.some(([, method, body]) => method === "POST" && body.includes("what=name")));
  assert.ok(called.some(([url]) => url.includes("search_term_string=Street%20Fighter%20III%203rd%20Strike")));
  const bad = await app.fetch(new Request("https://example.test/api/search?q="));
  assert.equal(bad.status, 400);
} finally {
  globalThis.fetch = originalFetch;
}
console.log("Three parsers and search API passed");
