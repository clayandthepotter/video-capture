"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      onClick={async () => {
        setBusy(true);
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
      disabled={busy}
      className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:border-red-400 disabled:opacity-50"
    >
      {busy ? "Signing out..." : "Sign out"}
    </button>
  );
}
