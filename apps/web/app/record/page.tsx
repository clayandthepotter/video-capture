"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const GITHUB_URL = "https://github.com/clayandthepotter/video-capture";

type Detection = "checking" | "installed" | "missing";

/**
 * Recording happens in the Capca extension — it can capture any tab, window,
 * or screen with the camera bubble on the page itself. This route exists to
 * get people into the extension, not to record in the web app.
 */
export default function RecordPage() {
  const [detection, setDetection] = useState<Detection>("checking");
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    // The extension's content script stamps the <html> element. It loads at
    // document_idle, so poll briefly before concluding it's not installed.
    let attempts = 0;
    const timer = setInterval(() => {
      const stamp = document.documentElement.dataset.capcaExtension;
      if (stamp) {
        setVersion(stamp);
        setDetection("installed");
        clearInterval(timer);
        return;
      }
      attempts += 1;
      // The extension stamps the page ~2s after load (post-hydration), so
      // give it a comfortable window before concluding it's absent.
      if (attempts >= 15) {
        setDetection("missing");
        clearInterval(timer);
      }
    }, 400);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
      <header>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-blue-700"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600">
            <span className="h-2.5 w-2.5 rounded-full bg-white" />
          </span>
          Capca
        </Link>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
          Record
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
          Recording lives in the extension
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600">
          The Capca extension records any tab, window, or screen with your
          camera bubble on the page you&apos;re presenting — then uploads and
          hands you a share link the moment you stop.
        </p>
      </header>

      {detection === "checking" && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-zinc-600">Checking for the extension…</p>
        </section>
      )}

      {detection === "installed" && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-green-100 text-green-700">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <div>
              <h2 className="font-semibold text-zinc-950">
                Extension installed{version ? ` (v${version})` : ""}
              </h2>
              <p className="text-sm text-zinc-600">You&apos;re ready to record.</p>
            </div>
          </div>
          <ol className="mt-6 space-y-4">
            {[
              "Open the tab you want to present.",
              "Click the Capca icon in your Chrome toolbar (pin it for one-click access).",
              "Choose your mic and camera, then press Start recording.",
              "Press Stop — your share link opens automatically.",
            ].map((step, i) => (
              <li key={step} className="flex items-start gap-3 text-sm text-zinc-700">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Open your library
            </Link>
          </div>
        </section>
      )}

      {detection === "missing" && (
        <>
          <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
            <h2 className="font-semibold text-zinc-950">Get the extension</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              Capca for Chrome isn&apos;t on the Chrome Web Store yet. Until
              it&apos;s listed, install it from source — it takes about a
              minute.
            </p>
            <ol className="mt-6 space-y-4">
              {[
                <>
                  <a
                    className="font-medium text-blue-700 hover:underline"
                    href={`${GITHUB_URL}/archive/refs/heads/main.zip`}
                  >
                    Download the source
                  </a>{" "}
                  and unzip it (or clone the repository).
                </>,
                <>
                  Open{" "}
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[13px]">
                    chrome://extensions
                  </code>{" "}
                  and turn on <strong>Developer mode</strong> (top right).
                </>,
                <>
                  Click <strong>Load unpacked</strong> and select the{" "}
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[13px]">
                    apps/extension
                  </code>{" "}
                  folder.
                </>,
                <>Pin Capca to your toolbar, then reload this page.</>,
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-zinc-700">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={`${GITHUB_URL}/archive/refs/heads/main.zip`}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Download Capca
              </a>
              <a
                href={GITHUB_URL}
                className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
              >
                View on GitHub
              </a>
            </div>
          </section>
          <p className="text-center text-xs text-zinc-500">
            Already installed it? Chrome only activates extensions on pages
            opened after install — reload this page to re-check.
          </p>
        </>
      )}
    </main>
  );
}
