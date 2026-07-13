import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { recording } from "@/lib/db/schema";

type Props = { params: Promise<{ id: string }> };

async function getRecording(id: string) {
  const [row] = await db.select().from(recording).where(eq(recording.id, id));
  // Share links only exist for Capca Cloud recordings — Drive/local
  // recordings have no server-side copy to play back here.
  return row && row.status === "ready" && row.destination === "capca"
    ? row
    : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const row = await getRecording(id);
  return { title: row ? `${row.title} - Capca` : "Not found" };
}

export default async function SharePage({ params }: Props) {
  const { id } = await params;
  const row = await getRecording(id);
  if (!row) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-8">
      <header className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-blue-700">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600">
              <span className="h-2.5 w-2.5 rounded-full bg-white" />
            </span>
            Capca
          </Link>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-zinc-950">
            {row.title}
          </h1>
          <p className="mt-2 text-sm font-medium text-zinc-500">
            {new Date(row.createdAt).toLocaleDateString(undefined, {
              dateStyle: "long",
            })}
          </p>
        </div>
        <Link
          href="/signup"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Record with Capca
        </Link>
      </header>
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <video
          src={`/api/recordings/${row.id}/media`}
          controls
          autoPlay={false}
          className="aspect-video w-full rounded-xl bg-black"
        />
      </section>
      <p className="text-center text-xs font-medium text-zinc-500">
        Recorded with{" "}
        <Link href="/" className="text-blue-700 hover:underline">
          Capca
        </Link>
        {" "}open source video messaging
      </p>
    </main>
  );
}
