// Headless-browser check of the funnel work: screenshots at 3 widths, overflow, console errors,
// first-party events seen on the wire, and the Share button on the debrief page.
// Usage: node tests/funnel-shots.mjs <base-url> <out-dir> <chrome-user-data-dir>
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const [base, outDir, userDataDir] = process.argv.slice(2);
const chromePath = process.env.HOME + "/.local/bin/chrome-headless-shell";
const port = 9400 + Math.floor(Math.random() * 300);
const MISSION = "m1";
mkdirSync(outDir, { recursive: true });

const chrome = spawn(chromePath, ["--headless", "--disable-gpu", "--no-first-run", `--remote-debugging-port=${port}`, `--user-data-dir=${userDataDir}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const j = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const pg = j.find((x) => x.type === "page" && x.webSocketDebuggerUrl);
      if (pg) return pg.webSocketDebuggerUrl;
    } catch { /* retry */ }
    await sleep(200);
  }
  throw new Error("no CDP");
}

const ws = new WebSocket(await wsUrl());
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
let problems = [];
let wire = []; // first-party events as sent by the page
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
  } else if (m.method === "Runtime.exceptionThrown") {
    problems.push("EXC: " + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).split("\n")[0]);
  } else if (m.method === "Log.entryAdded" && m.params.entry.level === "error") {
    problems.push("LOG: " + m.params.entry.text + " " + (m.params.entry.url || ""));
  } else if (m.method === "Network.requestWillBeSent" && m.params.request.url.endsWith("/api/event")) {
    wire.push(JSON.parse(m.params.request.postData));
  }
});
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;
await send("Page.enable"); await send("Runtime.enable"); await send("Log.enable"); await send("Network.enable");
await send("Browser.grantPermissions", { permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"], origin: new URL(base).origin });

const viewports = [[390, 844, true], [768, 1024, false], [1280, 800, false]];
const report = [];

async function shot(name) {
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${outDir}/${name}.png`, Buffer.from(data, "base64"));
}
async function layout() {
  return JSON.parse(await evalJs("JSON.stringify({sw:document.documentElement.scrollWidth,iw:window.innerWidth})"));
}
async function waitFor(expr, ms = 8000) {
  for (let t = 0; t < ms; t += 200) { if (await evalJs(expr)) return true; await sleep(200); }
  return false;
}

for (const [w, h, mobile] of viewports) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile });
  const row = { width: w };

  // Home page + hero CTA
  problems = []; wire = [];
  await send("Page.navigate", { url: base + "/" });
  await sleep(1200);
  await shot(`home-${w}`);
  const home = await layout();
  row.home = { overflow: home.sw > home.iw + 2, problems: [...problems] };
  await evalJs(`[...document.querySelectorAll('a')].find(a => a.textContent.includes('Start Free — 3 Daily')).click()`);
  await sleep(800);
  row.home.eventsOnWire = [...wire];

  // Debrief page (seed a finished session, then open the debrief)
  problems = []; wire = [];
  await send("Page.navigate", { url: base + "/pricing" }); // any same-origin page to seed storage
  await sleep(500);
  await evalJs(`localStorage.setItem('chinese-mission-user', JSON.stringify({goal:'survival'})); localStorage.setItem('chinese-mission-session-${MISSION}', JSON.stringify({turns:[{role:'user',rawInput:'你好',understood:true},{role:'npc',rawInput:'',npcReplyCn:'欢迎光临'}],filledSlots:[],hintUsageCount:0})); true`);
  await send("Page.navigate", { url: `${base}/missions/${MISSION}/debrief` });
  const shown = await waitFor(`document.body.innerText.includes('Share')`);
  await sleep(400);
  await shot(`debrief-${w}`);
  const deb = await layout();
  row.debrief = { shareButtonShown: shown, overflow: deb.sw > deb.iw + 2 };
  if (shown) {
    // Headless Chrome has no native share sheet here, so this exercises the clipboard path.
    await evalJs(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Share').click()`);
    await sleep(600);
    row.debrief.statusText = await evalJs(`document.querySelector('[role=status]')?.textContent`);
    row.debrief.clipboard = await evalJs(`navigator.clipboard.readText()`).catch((e) => "ERR " + e.message);
    await shot(`debrief-shared-${w}`);
  }
  row.debrief.eventsOnWire = [...wire];
  row.debrief.problems = [...problems];
  report.push(row);
}
// Warmup -> trial_start; quota used up -> paywall_view + upgrade_click; pricing Premium -> upgrade_click.
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const clickText = (sel, text) => evalJs(`[...document.querySelectorAll('${sel}')].find(n => n.textContent.trim().startsWith(${JSON.stringify(text)})).click(); true`);
const flows = {};
await send("Page.navigate", { url: base + "/pricing" });
await sleep(500);
await evalJs(`localStorage.removeItem('chinese-mission-daily-quota'); true`);
wire = [];
await send("Page.navigate", { url: `${base}/missions/${MISSION}/warmup` });
await waitFor(`document.body.innerText.includes('Start Conversation')`);
await clickText("button", "Start Conversation");
await sleep(800);
flows.startWithQuota = [...wire];

const today = new Date().toISOString().slice(0, 10);
await send("Page.navigate", { url: base + "/pricing" });
await sleep(500);
await evalJs(`localStorage.setItem('chinese-mission-daily-quota', JSON.stringify({date:'${today}', attemptsUsed:3})); true`);
wire = [];
await send("Page.navigate", { url: `${base}/missions/${MISSION}/warmup` });
await waitFor(`document.body.innerText.includes('Start Conversation')`);
await clickText("button", "Start Conversation");
await sleep(600);
await shot("paywall-390");
await evalJs(`document.querySelector('[data-pricing-id=cm_yearly]').click(); true`);
await sleep(400);
flows.quotaUsedUp = [...wire];

wire = [];
await send("Page.navigate", { url: base + "/pricing" });
await sleep(800);
await clickText("button", "Upgrade to Premium");
await sleep(400);
flows.pricingPremium = [...wire];
report.push({ flows });

ws.close(); chrome.kill();
console.log(JSON.stringify(report.at(-1), null, 1));
process.exit(0);
