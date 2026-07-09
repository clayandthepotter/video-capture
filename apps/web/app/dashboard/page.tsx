import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recording } from "@/lib/db/schema";
import { RecordingRow } from "./recording-row";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const rows = await db
    .select()
    .from(recording)
    .where(eq(recording.userId, session.user.id))
    .orderBy(desc(recording.createdAt));

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-blue-700">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600">
              <span className="h-2.5 w-2.5 rounded-full bg-white" />
            </span>
            Capca
          </Link>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
            Library
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
            My recordings
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Review recordings, copy share links, and keep storage destination
            visible as the Drive workflow comes online.
          </p>
        </div>
        <Link
          href="/record"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          New recording
        </Link>
      </header>

      {rows.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 p-10 text-center">
          <p className="text-lg font-semibold text-zinc-950">
            No recordings yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
            Start with a quick browser recording. Capca should always tell you
            where the file is stored and what happens next.
          </p>
          <Link
            href="/record"
            className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Record your first video
          </Link>
        </section>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          {rows.map((r) => (
            <RecordingRow key={r.id} recording={r} />
          ))}
        </ul>
      )}
    </main>
  );
}
