// اسکریپت اسکرین‌شات بازرس (Q1 صف بازرسی)
// کاربرد: node site/scripts/shoot.mjs [--base <url>] [--serve] [--out <dir>] [--ref]
// بدون وابستگی خارجی: کلاینت حداقلی CDP با سوکت خام (چون --screenshot هدلس این سندباکس خراب است).
import { spawn } from "node:child_process";
import { mkdirSync, existsSync, copyFileSync, writeFileSync } from "node:fs";
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

const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
const outDir = resolve(arg("--out", join(INSPECTOR_DIR, "SHOTS", today)));
const baseUrl = arg("--base", "http://127.0.0.1:3100").replace(/\/$/, "");
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
    https.get(api, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        try {
          const shotUrl = JSON.parse(body).data.screenshot.url;
          https.get(shotUrl, (r2) => {
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
    const req = http.request(
      { host: "127.0.0.1", port: CDP_PORT, path, method },
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
  close() { try { this.sock.end(); } catch { /* */ } }
}

let chromeProc = null;
function launchChrome() {
  chromeProc = spawn(CHROME, [
    "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
    // F-004 (بازرس): کرومیوم تازه درخواست‌های صفحه به 127.0.0.1 را با
    // ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS می‌بندد؛ این فلگ چک را خاموش می‌کند.
    "--disable-features=LocalNetworkAccessChecks",
    `--remote-debugging-port=${CDP_PORT}`, "--hide-scrollbars", "about:blank",
  ], { stdio: "ignore" });
  return new Promise((resolveP, reject) => {
    let n = 0;
    const tick = () => {
      n++;
      http.get({ host: "127.0.0.1", port: CDP_PORT, path: "/json/version" }, (res) => {
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
  const res = await s.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  if (!res.result || !res.result.data) throw new Error("empty screenshot");
  writeFileSync(outFile, Buffer.from(res.result.data, "base64"));
  s.close();
  await cdpHttp(`/json/close/${target.id}`);
}

// ---------- سرور next ----------

let server = null;
function waitFor(url, tries = 30) {
  return new Promise((resolveP, reject) => {
    let n = 0;
    const tick = () => {
      n++;
      const req = http.get(url, (res) => {
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
  server = spawn("npx", ["next", "start", "-p", "3100"], { cwd: SITE_DIR, stdio: "ignore" });
  await waitFor(baseUrl + "/");
}
function stopAll() {
  if (server) try { server.kill("SIGTERM"); } catch { /* */ }
  killChrome();
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
        await screenshot(baseUrl + r.path, file);
        const ok = existsSync(file);
        results.push({ name: r.name, route: r.path, file, ok });
        console.log(ok ? "OK  " : "FAIL", r.path, "->", file);
      } catch (e) {
        // F-004: فالبک خودکار به میکرولینک؛ اگر CDP محلی مرد (چک شبکهٔ
        // محلی، استارت نشدن کروم، شات خالی)، همان مسیر از سایت زنده شات می‌گیرد.
        const msg = String(e.message || e);
        let fbOk = false;
        let fbErr = msg;
        if (/BLOCKED_BY_LOCAL_NETWORK|no ws url|chrome did not start|empty screenshot/i.test(msg)) {
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
  console.log(`done: ${results.length - failed.length}/${results.length} -> ${outDir}`);
  if (failed.length) process.exitCode = 2;
}

process.on("exit", stopAll);
main().catch((e) => { console.error("FATAL:", e.message); stopAll(); process.exit(1); });
