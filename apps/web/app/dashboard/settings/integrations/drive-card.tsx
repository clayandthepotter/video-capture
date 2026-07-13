"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function DriveIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.2 4.5h7.6l5 8.7-3.8 6.3H7L3.2 13.2z" />
      <path d="m8.2 4.5 5.1 8.7" />
      <path d="M3.2 13.2h10.1" />
      <path d="m15.8 4.5-5 8.7" />
    </svg>
  );
}

export function DriveCard({
  configured,
  connected,
  folderName,
}: {
  configured: boolean;
  connected: boolean;
  folderName: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function disconnect() {
    if (!confirm("Disconnect Google Drive? Recordings already saved there stay in your Drive.")) {
      return;
    }
    setBusy(true);
    await fetch("/api/drive/disconnect", { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
            <DriveIcon />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-zinc-950">Google Drive</h2>
            <p className="mt-1 max-w-md text-sm text-zinc-600">
              Record straight to your own Google Drive — unlimited storage,
              no Capca Cloud quota, and the file is always yours.
            </p>
            {connected && folderName && (
              <p className="mt-2 text-xs font-medium text-emerald-700">
                Connected · saving to &ldquo;{folderName}&rdquo;
              </p>
            )}
          </div>
        </div>

        {!configured ? (
          <span className="shrink-0 rounded-lg bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-500">
            Not set up yet
          </span>
        ) : connected ? (
          <button
            onClick={() => void disconnect()}
            disabled={busy}
            className="shrink-0 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:border-red-400 disabled:opacity-50"
          >
            {busy ? "..." : "Disconnect"}
          </button>
        ) : (
          <a
            href="/api/drive/connect"
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Connect
          </a>
        )}
      </div>

      {!configured && (
        <p className="mt-4 border-t border-zinc-100 pt-4 text-xs text-zinc-500">
          This Capca deployment hasn&apos;t configured Google OAuth yet — the
          server admin needs to set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
          with Drive access.
        </p>
      )}
    </section>
  );
}
