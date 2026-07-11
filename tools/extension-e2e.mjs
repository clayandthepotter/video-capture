/**
 * End-to-end test for the Capca Chrome extension (v0.3 architecture) against
 * a running web app.
 *
 * Launches Chrome for Testing with the unpacked extension, fake camera/mic,
 * and an auto-accepted screen picker; signs up a fresh account; mounts the
 * recording bar (same message the popup sends); records via the bar; asserts
 * every state transition (red stop button, ticking timer, pause/resume,
 * camera toggle, popup status); stops; and verifies the upload produced a
 * playable share link plus a dashboard row.
 *
 * Prereqs: web app on http://localhost:3000 (docker compose up + dev server).
 * Run: node tools/extension-e2e.mjs [--keep-open]
 */
import puppeteer from "puppeteer-core";
import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXT_PATH = path.join(ROOT, "apps", "extension");
const APP = "http://localhost:3000";
const KEEP_OPEN = process.argv.includes("--keep-open");

// Chrome for Testing — branded Chrome 137+ ignores --load-extension.
// Install: pnpm dlx @puppeteer/browsers install chrome@stable --path .chrome-for-testing
function findChromeForTesting() {
  const base = path.join(ROOT, ".chrome-for-testing", "chrome");
  if (!existsSync(base)) {
    throw new Error(
      "Chrome for Testing not found. Run: pnpm dlx @puppeteer/browsers install chrome@stable --path .chrome-for-testing",
    );
  }
  const version = readdirSync(base).find((d) => d.startsWith("win64-"));
  return path.join(base, version, "chrome-win64", "chrome.exe");
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "  ✓" : "  ✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: findChromeForTesting(),
  headless: false,
  userDataDir: mkdtempSync(path.join(tmpdir(), "capca-e2e-")),
  defaultViewport: null,
  args: [
    `--disable-extensions-except=${EXT_PATH}`,
    `--load-extension=${EXT_PATH}`,
    "--auto-select-desktop-capture-source=Entire screen",
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1360,900",
    "--window-position=40,40",
  ],
});

// Collect console output from every extension context (SW, offscreen, popup).
const extLogs = [];
browser.on("targetcreated", attachLogger);
for (const t of browser.targets()) await attachLogger(t);
async function attachLogger(target) {
  try {
    if (!target.url().startsWith("chrome-extension://")) return;
    const label = target.url().includes("offscreen") ? "offscreen" : "ext";
    if (target.type() === "service_worker") {
      const w = await target.worker();
      w?.on("console", (m) => extLogs.push(`[sw] ${m.type()}: ${m.text()}`));
    } else {
      const p = await target.page?.();
      p?.on("console", (m) => extLogs.push(`[${label}] ${m.type()}: ${m.text()}`));
      p?.on("pageerror", (e) => extLogs.push(`[${label}] pageerror: ${e.message}`));
    }
  } catch {}
}

try {
  // Grab the extension service worker right after launch; the debugger attach
  // from our logger keeps it from idling out.
  const swTarget = await browser.waitForTarget(
    (t) => t.type() === "service_worker" && t.url().startsWith("chrome-extension://"),
    { timeout: 15000 },
  );
  const sw = await swTarget.worker();
  const extId = new URL(swTarget.url()).host;

  // ---- 1. Sign up so the upload path (not download fallback) is exercised
  const page = await browser.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") extLogs.push(`[app] error: ${m.text()}`);
  });
  await page.goto(`${APP}/signup`, { waitUntil: "networkidle2" });
  await page.type('input[placeholder="Name"]', "E2E Bot");
  await page.type('input[type="email"]', `e2e-${Date.now()}@example.com`);
  await page.type('input[type="password"]', "password1234");
  await page.click('button[type="submit"]');
  const reachedDashboard = await page
    .waitForFunction(() => location.pathname.startsWith("/dashboard"), { timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  check("signup + session", reachedDashboard, page.url());

  // Enable the "always save a local copy" safety setting for this run.
  await sw.evaluate(() =>
    chrome.storage.local.set({ "capca:settings": { keepLocalCopy: true } }),
  );

  // ---- 2. Mount the recording bar on a normal page (the popup does exactly
  // this: a vc:show-controls message to the active tab).
  await page.goto(`${APP}/`, { waitUntil: "networkidle2" });
  await page.bringToFront();
  await sw.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, {
      type: "vc:show-controls",
      status: { phase: "idle", withMic: true, withCamera: true },
    });
  });
  // The bar lives inside a shadow root (page-CSS isolation), so all queries
  // and clicks go through the shadow boundary.
  const inBar = (sel) =>
    `document.getElementById('__vc_host')?.shadowRoot?.querySelector(${JSON.stringify(sel)})`;
  const clickBar = (sel) => page.evaluate(`${inBar(sel)}.click()`);
  const evalBar = (sel, expr) => page.evaluate(`(${inBar(sel)})${expr}`);

  await page.waitForFunction(`!!${inBar(".vc-bar")}`, { timeout: 5000 });
  check("recording bar mounted in shadow root", true);

  const bubbleVisible = await page
    .waitForFunction(
      `(() => { const f = ${inBar(".vc-bubble-frame")}; return f && f.getBoundingClientRect().width > 0; })()`,
      { timeout: 5000 },
    )
    .then(() => true)
    .catch(() => false);
  check("camera bubble visible", bubbleVisible);

  // ---- 3. Start recording from the bar
  await clickBar('[data-action="record"]');
  const wentRed = await page
    .waitForFunction(
      `${inBar('[data-action="record"]')}?.classList.contains("vc-btn-danger")`,
      { timeout: 20000 },
    )
    .then(() => true)
    .catch(() => false);
  check("record button switched to red Stop", wentRed);
  if (!wentRed) throw new Error("recording never started — see extension logs");

  await sleep(3200);
  const timerText = await evalBar(".vc-timer", ".textContent");
  check("timer is counting", /^0:0[2-9]/.test(timerText), `timer=${timerText}`);

  // ---- 4. Pause / resume through the bar
  await clickBar('[data-action="pause"]');
  await sleep(400);
  const pausedIcon = await evalBar('[data-action="pause"]', '.innerHTML.includes("M8 5.5")');
  check("pause reflects paused state", pausedIcon);
  const tPaused = await evalBar(".vc-timer", ".textContent");
  await sleep(1600);
  const tStill = await evalBar(".vc-timer", ".textContent");
  check("timer frozen while paused", tPaused === tStill, `${tPaused} vs ${tStill}`);
  await clickBar('[data-action="pause"]');
  await sleep(1200);

  // ---- 5. Camera toggle hides the bubble (removes it from the capture)
  await clickBar('[data-action="camera"]');
  await sleep(300);
  const bubbleHidden = await evalBar(".vc-bubble", ' && getComputedStyle(' + inBar(".vc-bubble") + ').display === "none"');
  check("camera toggle hides bubble", !!bubbleHidden);
  await clickBar('[data-action="camera"]');

  // ---- 6. Popup reflects the recording status
  const popup = await browser.newPage();
  await popup.goto(`chrome-extension://${extId}/popup.html`, { waitUntil: "networkidle2" });
  const popupStatus = await popup
    .waitForFunction(
      () => document.getElementById("status")?.textContent === "Recording",
      { timeout: 5000 },
    )
    .then(() => true)
    .catch(() => false);
  const popupButton = await popup.$eval("#primary", (el) => el.textContent);
  check("popup shows Recording + Stop", popupStatus && popupButton.includes("Stop"),
    `status ok=${popupStatus}, button=${popupButton}`);
  await popup.close();
  await page.bringToFront();

  // ---- 7. Stop -> upload -> share tab opens with a playable video
  const shareTabPromise = browser
    .waitForTarget((t) => t.url().includes("/s/"), { timeout: 30000 })
    .catch(() => null);
  await clickBar('[data-action="record"]');
  const shareTarget = await shareTabPromise;
  check("share link opened after stop", !!shareTarget, shareTarget?.url() ?? "no /s/ tab");

  if (shareTarget) {
    const sharePage = await shareTarget.page();
    const videoOk = await sharePage
      .waitForFunction(() => {
        const v = document.querySelector("video");
        return v && v.readyState >= 1 && (v.duration > 0 || Number.isNaN(v.duration) === false);
      }, { timeout: 20000 })
      .then(() => true)
      .catch(() => false);
    check("share page video is playable", videoOk);
  }

  // ---- 8. Recording listed on the dashboard
  await page.goto(`${APP}/dashboard`, { waitUntil: "networkidle2" });
  const listed = await page.$$eval("li", (els) =>
    els.some((e) => e.textContent.includes("Recording")),
  );
  check("recording listed in dashboard", listed);

  // ---- 9. "Always save a local copy" downloaded the file too
  let localCopy = null;
  for (let i = 0; i < 20 && !localCopy; i++) {
    const found = await sw.evaluate(async () => {
      const items = await chrome.downloads.search({ query: ["Capca"] });
      const done = items.find((d) => d.state === "complete" && d.fileSize > 0);
      return done ? { file: done.filename, bytes: done.fileSize } : null;
    });
    if (found) localCopy = found;
    else await sleep(500);
  }
  check(
    "local safety copy downloaded",
    !!localCopy,
    localCopy ? `${localCopy.bytes} bytes → ${localCopy.file.split(/[\\/]/).slice(-2).join("/")}` : "no completed download",
  );
} catch (err) {
  check("run completed", false, err.message);
} finally {
  console.log("\n--- extension logs (last 40) ---");
  for (const l of extLogs.slice(-40)) console.log(l);
  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${failed.length === 0 ? "ALL CHECKS PASSED" : `${failed.length}/${results.length} CHECKS FAILED`}`,
  );
  if (!KEEP_OPEN) await browser.close();
  process.exit(failed.length === 0 ? 0 : 1);
}
