"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Recording } from "@/lib/db/schema";

type Filter = "all" | "ready" | "uploading";
type Sort = "newest" | "oldest" | "longest";

function formatDuration(sec: number | null) {
  if (!sec || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatSize(bytes: number | null) {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusPill({ status }: { status: Recording["status"] }) {
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
        <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
        Ready
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
        <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-600" />
      Upload incomplete
    </span>
  );
}

const DESTINATION_LABEL: Record<Recording["destination"], string> = {
  capca: "Capca Cloud",
  drive: "Google Drive",
  local: "This device",
};

function DestinationBadge({
  destination,
}: {
  destination: Recording["destination"];
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
      {DESTINATION_LABEL[destination]}
    </span>
  );
}

function Row({ rec }: { rec: Recording }) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(rec.title);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function saveTitle() {
    const next = title.trim();
    setRenaming(false);
    if (!next || next === rec.title) {
      setTitle(rec.title);
      return;
    }
    setBusy(true);
    await fetch(`/api/recordings/${rec.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: next }),
    });
    setBusy(false);
    router.refresh();
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/s/${rec.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function remove() {
    if (!confirm(`Delete "${rec.title}"? The file is removed from storage too.`))
      return;
    setBusy(true);
    await fetch(`/api/recordings/${rec.id}`, { method: "DELETE" });
    router.refresh();
  }

  const duration = formatDuration(rec.durationSec);
  const size = formatSize(rec.sizeBytes);
  const meta = [formatDate(rec.createdAt), duration, size]
    .filter(Boolean)
    .join(" · ");

  const isCapca = rec.destination === "capca" && rec.status === "ready";

  return (
    <li className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {renaming ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => void saveTitle()}
              onKeyDown={(e) => {
                if (e.key === "Enter") void saveTitle();
                if (e.key === "Escape") {
                  setTitle(rec.title);
                  setRenaming(false);
                }
              }}
              className="w-full max-w-md rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-950 outline-none ring-2 ring-blue-100"
            />
          ) : isCapca ? (
            <Link
              href={`/s/${rec.id}`}
              className="truncate font-medium text-zinc-950 hover:text-blue-700"
            >
              {rec.title}
            </Link>
          ) : (
            <span className="truncate font-medium text-zinc-950">
              {rec.title}
            </span>
          )}
          <StatusPill status={rec.status} />
          <DestinationBadge destination={rec.destination} />
        </div>
        <p className="mt-1 text-xs text-zinc-500">{meta}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {isCapca && (
          <>
            <button
              onClick={() => void copyLink()}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
            <a
              href={`/api/recordings/${rec.id}/media`}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
            >
              Download
            </a>
          </>
        )}
        {rec.destination === "drive" && rec.driveWebViewLink && (
          <a
            href={rec.driveWebViewLink}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
          >
            Open in Drive
          </a>
        )}
        {rec.destination === "local" && (
          <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-500">
            Saved to your device
          </span>
        )}
        <button
          onClick={() => setRenaming(true)}
          disabled={busy}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400 disabled:opacity-50"
        >
          Rename
        </button>
        <button
          onClick={() => void remove()}
          disabled={busy}
          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-400 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

export function Library({ recordings }: { recordings: Recording[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");

  const visible = useMemo(() => {
    let rows = recordings;
    if (filter !== "all") rows = rows.filter((r) => r.status === filter);
    const q = query.trim().toLowerCase();
    if (q) rows = rows.filter((r) => r.title.toLowerCase().includes(q));
    return [...rows].sort((a, b) => {
      if (sort === "oldest")
        return +new Date(a.createdAt) - +new Date(b.createdAt);
      if (sort === "longest")
        return (b.durationSec ?? 0) - (a.durationSec ?? 0);
      return +new Date(b.createdAt) - +new Date(a.createdAt);
    });
  }, [recordings, query, filter, sort]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search recordings…"
          className="w-full max-w-sm rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-950 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
        <div className="flex items-center gap-2">
          {(
            [
              ["all", "All"],
              ["ready", "Ready"],
              ["uploading", "Incomplete"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                filter === value
                  ? "bg-blue-600 text-white"
                  : "border border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400"
              }`}
            >
              {label}
            </button>
          ))}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 shadow-sm outline-none"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="longest">Longest first</option>
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-zinc-600">
            {recordings.length === 0
              ? "Nothing here yet."
              : "No recordings match your search."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          {visible.map((r) => (
            <Row key={r.id} rec={r} />
          ))}
        </ul>
      )}
    </section>
  );
}
