import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 text-center">
      <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
        open source · self-hostable · AGPL-3.0
      </span>
      <h1 className="text-5xl font-bold tracking-tight">
        Record your screen.
        <br />
        <span className="text-emerald-400">Share with a link.</span>
      </h1>
      <p className="max-w-xl text-lg text-zinc-400">
        Screen recording with a camera bubble and mic audio, right in your
        browser. No account required to try it.
      </p>
      <div className="flex gap-4">
        <Link
          href="/record"
          className="rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-emerald-400"
        >
          Start recording
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-zinc-700 px-6 py-3 font-semibold text-zinc-300 transition hover:border-zinc-500"
        >
          My recordings
        </Link>
      </div>
    </main>
  );
}
