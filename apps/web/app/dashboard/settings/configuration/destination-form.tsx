"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Destination } from "@/lib/db/schema";

const OPTIONS: { value: Destination; label: string; hint: string }[] = [
  {
    value: "capca",
    label: "Capca Cloud",
    hint: "Get a share link instantly. Free tier storage limit applies.",
  },
  {
    value: "drive",
    label: "Google Drive",
    hint: "Recordings upload straight to your own Drive. Requires connecting Drive in Integrations.",
  },
  {
    value: "local",
    label: "This device",
    hint: "No cloud upload at all — just a local download after each recording.",
  },
];

export function DestinationForm({
  defaultDestination,
  driveConnected,
}: {
  defaultDestination: Destination;
  driveConnected: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState<Destination>(defaultDestination);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(next: Destination) {
    setValue(next);
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultDestination: next }),
    });
    setSaving(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="flex flex-col gap-3">
      {OPTIONS.map((opt) => {
        const disabled = opt.value === "drive" && !driveConnected;
        return (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
              value === opt.value
                ? "border-blue-300 bg-blue-50/60"
                : "border-zinc-200 bg-white hover:border-zinc-300"
            } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <input
              type="radio"
              name="destination"
              checked={value === opt.value}
              disabled={disabled || saving}
              onChange={() => void save(opt.value)}
              className="mt-1 accent-blue-600"
            />
            <div>
              <p className="text-sm font-semibold text-zinc-950">
                {opt.label}
                {disabled && (
                  <span className="ml-2 text-xs font-medium text-zinc-500">
                    (connect Drive first)
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-zinc-600">{opt.hint}</p>
            </div>
          </label>
        );
      })}
      <p className="text-xs text-zinc-500">
        {saving ? "Saving..." : saved ? "Saved." : "This is the default the extension picks — you can still change it per recording."}
      </p>
    </div>
  );
}
