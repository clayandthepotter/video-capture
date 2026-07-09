import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { recording } from "@/lib/db/schema";

type Props = { params: Promise<{ id: string }> };

async function getRecording(id: string) {
  const [row] = await db.select().from(recording).where(eq(recording.id, id));
  return row && row.status === "ready" ? row : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const row = await getRecording(id);
  return { title: row ? `${row.title} — Capca` : "Not found" };
}

export default async function SharePage({ params }: Props) {
  const { id } = await params;
  const row = await getRecording(id);
  if (!row) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-10">
      <header>
        <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
          Capca
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{row.title}</h1>
        <p className="text-sm text-zinc-500">
          {new Date(row.createdAt).toLocaleDateString(undefined, {
            dateStyle: "long",
          })}
        </p>
      </header>
      <video
        src={`/api/recordings/${row.id}/media`}
        controls
        autoPlay={false}
        className="aspect-video w-full rounded-xl border border-zinc-800 bg-black"
      />
      <p className="text-center text-xs text-zinc-600">
        Recorded with{" "}
        <Link href="/" className="text-emerald-500 hover:underline">
          Capca
        </Link>{" "}
        — open source video messaging
      </p>
    </main>
  );
}
