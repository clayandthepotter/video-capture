"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Recording } from "@/lib/db/schema";

export function RecordingRow({ recording }: { recording: Recording }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(
      `${window.location.origin}/s/${recording.id}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function remove() {
    if (!confirm(`Delete "${recording.title}"? This can't be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/recordings/${recording.id}`, { method: "DELETE" });
    router.refresh();
  }

  const mins = recording.durationSec
    ? `${Math.floor(recording.durationSec / 60)}:${String(Math.round(recording.durationSec % 60)).padStart(2, "0")}`
    : null;

  return (
    <li className="flex items-center justify-between gap-4 p-4">
      <div className="min-w-0">
        <Link
          href={`/s/${recording.id}`}
          className="block truncate font-medium hover:text-emerald-400"
        >
          {recording.title}
        </Link>
        <p className="text-xs text-zinc-500">
          {new Date(recording.createdAt).toLocaleString()}
          {mins ? ` · ${mins}` : ""}
          {recording.status === "uploading" ? " · upload incomplete" : ""}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={copyLink}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-zinc-500"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
        <button
          onClick={remove}
          disabled={deleting}
          className="rounded-lg border border-red-900 px-3 py-1.5 text-sm text-red-400 transition hover:border-red-600 disabled:opacity-50"
        >
          {deleting ? "…" : "Delete"}
        </button>
      </div>
    </li>
  );
}
