"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.signIn.email({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message ?? "Sign in failed");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-emerald-500"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>
      <p className="text-sm text-zinc-400">
        No account?{" "}
        <Link href="/signup" className="text-emerald-400 hover:underline">
          Sign up
        </Link>
      </p>
    </main>
  );
}
