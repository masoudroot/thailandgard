// اسکریپت اسکرین‌شات بازرس (Q1 صف بازرسی)
// کاربرد: node site/scripts/shoot.mjs [--base <url>] [--serve] [--out <dir>] [--ref]
// بدون وابستگی خارجی: کلاینت حداقلی CDP با سوکت خام (چون --screenshot هدلس این سندباکس خراب است).
import { spawn } from "node:child_process";
import { mkdirSync, existsSync, copyFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import crypto from "node:crypto";

const HERE = resolve(fileURLToPath(new URL(".", import.meta.url)));
const SITE_DIR = resolve(HERE, "..");
const INSPECTOR_DIR = resolve(SITE_DIR, "..", "agents", "inspector");

const ROUTES = [
  { name: "home", path: "/" },
  { name: "tours", path: "/tours" },
  { name: "tour-phuket-7-days", path: "/tours/phuket-7-days" },
  { name: "guide", path: "/guide" },
  { name: "guide-best-time", path: "/guide/best-time-to-visit-thailand" },
  { name: "contact", path: "/contact" },
  { name: "phuket-october", path: "/phuket-october" },
];

const CHROME = "/opt/meta-chromium/chrome";
const CDP_PORT = 9322;

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const has = (name) => process.argv.includes(name);

// F-004/F-010: امضاهای شناخته‌شدهٔ صفحه‌های خطای کرومیوم
// (راستی‌آزمایی بازرس ۲۳:۰۵ + راستی‌آزمایی dev ‏۲۳:۵۵ + پیگیری F-010 در ۰۱:۳۵).
// هر نمونه بایت‌به‌بایت یکسان است ولی هر هاست (127.0.0.1 / localhost) نمونهٔ خودش را دارد.
// «localhost refused to connect» (بدون سرور روی پورت) امضای ۲۶۵۰۸ بایتی خودش را دارد.
// شاتی که امضای خطا دارد «صفحهٔ خطا» حساب می‌شود و فالبک میکرولینک را تریگر می‌کند.
const ERROR_SHOT_SIGNATURES = [
  { host: "127.0.0.1", size: 24885, sha256: "9a165975e04604c628689c8d13346318d5a50eea5e7e9ce52dbb3e52f7d935f4" },
  { host: "localhost", size: 25012, sha256: "638909e61fe1bf2f56ef1749972aa5b887cf4a7174606a8aa694cb53bc8f5b82" },
  { host: "localhost", size: 26508, sha256: "d9f6e8121c20db84b306d8e81fef8e465402bef46450699871a3a327ebb927d9" },
];

const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
const outDir = resolve(arg("--out", join(INSPECTOR_DIR, "SHOTS", today)));
const baseUrl = arg("--base", "http://localhost:3100").replace(/\/$/, "");
const makeRef = has("--ref");
const useMicrolink = has("--microlink");
const liveBase = arg("--live-base", "https://thailandgard.vercel.app").replace(/\/$/, "");

// ---------- حالت میکرولینک (جایگزین وقتی هدلس محلی خراب است) ----------
function microlinkShot(pageUrl, outFile) {
  const api = "https://api.microlink.io/?" + new URLSearchParams({
    url: pageUrl, screenshot: "true", meta: "false",
    "viewport.width": "1440", "viewport.height": "900",
    waitUntil: "networkidle0",
  }).toString();
  return new Promise((resolveP, reject) => {
    https.get(api, { agent: false }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        try {
          const shotUrl = JSON.parse(body).data.screenshot.url;
          https.get(shotUrl, { agent: false }, (r2) => {
            const chunks = [];
            r2.on("data", (c) => chunks.push(c));
            r2.on("end", () => { writeFileSync(outFile, Buffer.concat(chunks)); resolveP(); });
          }).on("error", reject);
        } catch (e) { reject(new Error("microlink parse: " + e.message)); }
      });
    }).on("error", reject);
    setTimeout(() => reject(new Error("microlink timeout")), 90000);
  });
}

// ---------- CDP حداقلی ----------

function cdpHttp(path, method = "GET") {
  return new Promise((resolveP, reject) => {
    // F-009: agent:false تا سوکت keep-alive حلقهٔ node را زنده نگه ندارد
    const req = http.request(
      { host: "127.0.0.1", port: CDP_PORT, path, method, agent: false },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try { resolveP(JSON.parse(body)); } catch { resolveP(body); }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

class CdpSession {
  constructor(wsUrl) {
    this.url = new URL(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.buf = Buffer.alloc(0);
    this.handlers = new Map();
  }
  connect() {
    return new Promise((resolveP, reject) => {
      const key = crypto.randomBytes(16).toString("base64");
      this.sock = net.connect(this.url.port || 80, this.url.hostname, () => {
        this.sock.write(
          `GET ${this.url.pathname}${this.url.search} HTTP/1.1\r\n` +
          `Host: ${this.url.hostname}:${this.url.port}\r\n` +
          "Upgrade: websocket\r\nConnection: Upgrade\r\n" +
          `Sec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`
        );
      });
      let handshook = false;
      this.sock.on("data", (chunk) => {
        if (!handshook) {
          this.buf = Buffer.concat([this.buf, chunk]);
          const s = this.buf.toString("latin1");
          const idx = s.indexOf("\r\n\r\n");
          if (idx >= 0) {
            handshook = true;
            this.buf = this.buf.subarray(idx + 4);
            resolveP();
            this.pump();
          }
          return;
        }
        this.buf = Buffer.concat([this.buf, chunk]);
        this.pump();
      });
      this.sock.on("error", reject);
      setTimeout(() => reject(new Error("ws handshake timeout")), 15000);
    });
  }
  pump() {
    while (this.buf.length >= 2) {
      const b1 = this.buf[0], b2 = this.buf[1];
      const opcode = b1 & 0x0f;
      let len = b2 & 0x7f, off = 2;
      if (len === 126) { len = this.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { len = Number(this.buf.readBigUInt64BE(2)); off = 10; }
      if (this.buf.length < off + len) return;
      const payload = this.buf.subarray(off, off + len).toString("utf8");
      this.buf = this.buf.subarray(off + len);
      if (opcode === 0x8) { this.sock.end(); return; }
      if (opcode !== 0x1) continue;
      try {
        const msg = JSON.parse(payload);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolveP } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          resolveP(msg);
        } else if (msg.method && this.handlers.has(msg.method)) {
          this.handlers.get(msg.method)(msg);
        }
      } catch { /* ignore */ }
    }
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolveP, reject) => {
      this.pending.set(id, { resolveP, reject });
      const body = Buffer.from(JSON.stringify({ id, method, params }), "utf8");
      const mask = crypto.randomBytes(4);
      const header = Buffer.alloc(2 + (body.length > 125 ? 2 : 0));
      header[0] = 0x81;
      if (body.length <= 125) header[1] = 0x80 | body.length;
      else { header[1] = 0x80 | 126; header.writeUInt16BE(body.length, 2); }
      const masked = Buffer.alloc(body.length);
      for (let i = 0; i < body.length; i++) masked[i] = body[i] ^ mask[i % 4];
      this.sock.write(Buffer.concat([header, mask, masked]));
      setTimeout(() => {
        if (this.pending.has(id)) { this.pending.delete(id); reject(new Error("cdp timeout: " + method)); }
      }, 30000);
    });
  }
  on(method, fn) { this.handlers.set(method, fn); }
  // F-009: destroy قطعی؛ end() تنها FIN می‌فرستد و سوکت نیمه‌باز حلقهٔ node را زنده نگه می‌داشت
  close() { try { this.sock.destroy(); } catch { /* */ } }
}

let chromeProc = null;
function launchChrome() {
  chromeProc = spawn(CHROME, [
    "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
    // F-004 (بازرس): کرومیوم تازه درخواست‌های صفحه به لوپ‌بک را با
    // ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS می‌بندد. در ۱۵۲.۰.۷۹۷۷.۸۲
    // فلگِ تکیِ LocalNetworkAccessChecks جواب نداد؛ ترکیب با
    // BlockInsecurePrivateNetworkRequests + ناوبری به localhost (نه 127.0.0.1)
    // امتحان می‌شود. اگر باز هم صفحهٔ خطا آمد، تشخیص صریح (پایین) فالبک
    // میکرولینک را تریگر می‌کند.
    "--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests",
    `--remote-debugging-port=${CDP_PORT}`, "--hide-scrollbars", "about:blank",
  ], { stdio: "ignore" });
  return new Promise((resolveP, reject) => {
    let n = 0;
    const tick = () => {
      n++;
      http.get({ host: "127.0.0.1", port: CDP_PORT, path: "/json/version", agent: false }, (res) => {
        if (res.statusCode === 200) return resolveP();
        if (n > 30) return reject(new Error("chrome did not start"));
        setTimeout(tick, 500);
      }).on("error", () => { if (n > 30) return reject(new Error("chrome did not start")); setTimeout(tick, 500); });
    };
    tick();
  });
}
function killChrome() { if (chromeProc) { try { chromeProc.kill("SIGKILL"); } catch { /* */ } } }

async function screenshot(url, outFile) {
  const target = await cdpHttp("/json/new?" + new URLSearchParams({ url }).toString(), "PUT");
  const wsUrl = target.webSocketDebuggerUrl;
  if (!wsUrl) throw new Error("no ws url for " + url);
  const s = new CdpSession(wsUrl);
  let buf;
  let pageText = "";
  try {
    await s.connect();
    await s.send("Emulation.setDeviceMetricsOverride", {
      width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
    });
    let loaded = false;
    s.on("Page.loadEventFired", () => { loaded = true; });
    await s.send("Page.enable");
    await s.send("Page.navigate", { url });
    const t0 = Date.now();
    while (!loaded && Date.now() - t0 < 20000) await new Promise((r) => setTimeout(r, 300));
    await new Promise((r) => setTimeout(r, 1500)); // فرصت رندر نهایی
    // F-004: تشخیص صریح صفحهٔ خطا از متن بدنه (نه فقط تیتر؛ تیتر صفحهٔ خطا
    // فقط هاست است: «localhost» یا «127.0.0.1»، بدون کلمهٔ «blocked»)
    try {
      const tr = await s.send("Runtime.evaluate", {
        expression: "(document.title + ' ' + document.documentElement.innerText).slice(0, 600)",
        returnByValue: true,
      });
      pageText = String(tr && tr.result && tr.result.result ? tr.result.result.value : "");
    } catch { /* نادیده */ }
    const res = await s.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    if (!res.result || !res.result.data) throw new Error("empty screenshot");
    buf = Buffer.from(res.result.data, "base64");
    writeFileSync(outFile, buf);
  } finally {
    // F-009: بستن قطعی سوکت CDP حتی در مسیر خطا؛ سوکت باز حلقهٔ node را زنده نگه می‌داشت
    s.close();
    try { await cdpHttp(`/json/close/${target.id}`); } catch { /* نادیده */ }
  }
  // F-004: تشخیص تکمیلی با امضای فایل (حجم/هشِ هر نمونهٔ خطای شناخته‌شده)
  const hash = crypto.createHash("sha256").update(buf).digest("hex");
  const sigHit = ERROR_SHOT_SIGNATURES.some((sg) => sg.size === buf.length || sg.sha256 === hash);
  const isErrorPage =
    /is blocked|ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS/i.test(pageText) || sigHit;
  return { file: outFile, pageText: pageText.slice(0, 80), size: buf.length, hash, isErrorPage };
}

// ---------- سرور next ----------

let server = null;
function waitFor(url, tries = 30) {
  return new Promise((resolveP, reject) => {
    let n = 0;
    const tick = () => {
      n++;
      const req = http.get(url, { agent: false }, (res) => {
        if (String(res.statusCode).startsWith("2")) return resolveP();
        if (n >= tries) return reject(new Error("server not ready"));
        setTimeout(tick, 1000);
      });
      req.on("error", () => { if (n >= tries) return reject(new Error("server not ready")); setTimeout(tick, 1000); });
    };
    tick();
  });
}
async function startServer() {
  // F-009 تکمیلی: detached تا kill روی کل گروه فرایند بنشیند؛ نوهٔ next-server پشت
  // رپر npx هم در همان گروه است و با kill گروهی می‌میرد (نه فقط رپر npx).
  server = spawn("npx", ["next", "start", "-p", "3100"], { cwd: SITE_DIR, stdio: "ignore", detached: true });
  await waitFor(baseUrl + "/");
}
function treeKill(proc, sig) {
  // kill روی کل گروه فرایند (SIG به خود فرایند + همهٔ نوه‌ها)
  if (!proc || proc.exitCode !== null) return;
  try { process.kill(-proc.pid, sig); } catch { /* از قبل مرده */ }
}
async function stopAll() {
  // F-009 تکمیلی: kill گروهی روی درخت next-server + جارو SIGKILL؛ بعد آزادشدن پورت
  // 3100 راستی‌آزمایی می‌شود و اگر هنوز شنونده‌ای هست، گزارش می‌شود (بدون آویزان‌ماندن).
  if (server) {
    treeKill(server, "SIGTERM");
    await new Promise((r) => setTimeout(r, 2000));
    treeKill(server, "SIGKILL");
    server = null;
  }
  killChrome();
  await new Promise((resolveP) => {
    const sock = net.connect(3100, "127.0.0.1");
    let done = false;
    const fin = (listening) => { if (!done) { done = true; resolveP(listening); } };
    sock.on("connect", () => { sock.destroy(); fin(true); });
    sock.on("error", () => fin(false));
    setTimeout(() => { try { sock.destroy(); } catch { } fin(false); }, 2000);
  }).then((listening) => {
    if (listening) console.error("WARN: port 3100 still listening after tree-kill (orphan?)");
  });
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const results = [];
  if (useMicrolink) {
    console.log("capturing via microlink from", liveBase);
    for (const r of ROUTES) {
      const file = join(outDir, `${r.name}.png`);
      try {
        await microlinkShot(liveBase + r.path, file);
        const ok = existsSync(file);
        results.push({ name: r.name, route: r.path, file, ok });
        console.log(ok ? "OK  " : "FAIL", r.path, "->", file);
      } catch (e) {
        results.push({ name: r.name, route: r.path, ok: false, error: String(e.message || e) });
        console.log("FAIL", r.path, "-", e.message);
      }
    }
  } else {
    if (has("--serve")) { console.log("starting next server:", baseUrl); await startServer(); }
    console.log("launching chrome (cdp)...");
    await launchChrome();
    for (const r of ROUTES) {
      const file = join(outDir, `${r.name}.png`);
      try {
        const shot = await screenshot(baseUrl + r.path, file);
        if (shot.isErrorPage) {
          // F-004: «کپچرِ موفقِ صفحهٔ خطا» = شکست؛ مثل اکسپشن CDP با آن رفتار می‌شود
          const err = new Error(`error-page captured (${shot.pageText}… size=${shot.size})`);
          err.errorPage = true;
          throw err;
        }
        const ok = existsSync(file);
        results.push({ name: r.name, route: r.path, file, ok });
        console.log(ok ? "OK  " : "FAIL", r.path, "->", file, `page="${shot.pageText}"`);
      } catch (e) {
        // F-004: فالبک خودکار به میکرولینک؛ اگر CDP محلی مرد (چک شبکهٔ
        // محلی، استارت نشدن کروم، شات خالی، یا کپچرِ صفحهٔ خطا)، همان مسیر
        // از سایت زنده شات می‌گیرد.
        const msg = String(e.message || e);
        let fbOk = false;
        let fbErr = msg;
        if (/error-page captured|BLOCKED_BY_LOCAL_NETWORK|no ws url|chrome did not start|empty screenshot/i.test(msg)) {
          if (e.errorPage) { try { unlinkSync(file); } catch { /* نادیده */ } }
          try {
            await microlinkShot(liveBase + r.path, file);
            fbOk = existsSync(file);
          } catch (e2) {
            fbErr = msg + " | microlink: " + String(e2.message || e2);
          }
        }
        if (fbOk) {
          results.push({ name: r.name, route: r.path, file, ok: true, fallback: "microlink" });
          console.log("OK  (microlink fallback)", r.path, "->", file);
        } else {
          results.push({ name: r.name, route: r.path, ok: false, error: fbErr });
          console.log("FAIL", r.path, "-", fbErr.slice(0, 120));
        }
      }
    }
  }
  if (makeRef) {
    const refDir = join(INSPECTOR_DIR, "SHOTS", "reference");
    mkdirSync(refDir, { recursive: true });
    for (const r of results.filter((x) => x.ok)) copyFileSync(r.file, join(refDir, `${r.name}.png`));
    console.log("reference shots ->", refDir);
  }
  const failed = results.filter((x) => !x.ok);
  // F-009: خروج صریح و همگام؛ سوکت‌های خام CDP حلقهٔ node را زنده نگه می‌داشتند و
  // process.on("exit") هرگز فراخوانی نمی‌شد (علت آویزان‌ماندن اجرای ۲۳:۳۵).
  try { writeFileSync(1, `done: ${results.length - failed.length}/${results.length} -> ${outDir}\n`); }
  catch { console.log(`done: ${results.length - failed.length}/${results.length} -> ${outDir}`); }
  await stopAll();
  process.exit(failed.length ? 2 : 0);
}

process.on("exit", stopAll);
main().catch(async (e) => { console.error("FATAL:", e.message); await stopAll(); process.exit(1); });
