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
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
            ← Capca
          </Link>
          <h1 className="mt-1 text-2xl font-bold">My recordings</h1>
        </div>
        <Link
          href="/record"
          className="rounded-lg bg-emerald-500 px-5 py-2.5 font-semibold text-zinc-950 transition hover:bg-emerald-400"
        >
          New recording
        </Link>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-800 p-10 text-center text-zinc-500">
          No recordings yet — hit &quot;New recording&quot; to make your first.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-800 rounded-xl border border-zinc-800">
          {rows.map((r) => (
            <RecordingRow key={r.id} recording={r} />
          ))}
        </ul>
      )}
    </main>
  );
}
