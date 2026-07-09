"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { SocialAuth } from "@/components/social-auth";

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
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <Link href="/" className="inline-flex items-center gap-3 text-sm font-semibold text-zinc-700 hover:text-blue-700">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600 text-white">
            <span className="h-3 w-3 rounded-full bg-white" />
          </span>
          Capca
        </Link>
        <div className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
            Welcome back
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
            Sign in to your recording workspace
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Continue managing recordings, Drive exports, and share links from
            one calm workspace.
          </p>
        </div>
        <div className="mt-6">
          <SocialAuth />
        </div>
        <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        </form>
        <p className="mt-6 text-sm text-zinc-600">
          No account?{" "}
          <Link href="/signup" className="font-semibold text-blue-700 hover:underline">
            Sign up
          </Link>
        </p>
      </section>
    </main>
  );
}
