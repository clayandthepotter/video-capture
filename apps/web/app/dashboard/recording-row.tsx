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
    <li className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Link
          href={`/s/${recording.id}`}
          className="block truncate font-semibold text-zinc-950 hover:text-blue-700"
        >
          {recording.title}
        </Link>
        <p className="mt-1 text-xs font-medium text-zinc-500">
          {new Date(recording.createdAt).toLocaleString()}
          {mins ? ` · ${mins}` : ""}
          {recording.status === "uploading" ? " · upload incomplete" : ""}
        </p>
        <p className="mt-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
          Storage destination visible soon
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={copyLink}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 transition hover:border-blue-300 hover:text-blue-700"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
        <button
          onClick={remove}
          disabled={deleting}
          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:border-red-400 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </li>
  );
}
