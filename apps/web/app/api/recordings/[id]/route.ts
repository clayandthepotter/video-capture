import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recording } from "@/lib/db/schema";
import { deleteObject, objectKey } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

async function ownedRecording(id: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: 401 as const };
  const [row] = await db
    .select()
    .from(recording)
    .where(and(eq(recording.id, id), eq(recording.userId, session.user.id)));
  if (!row) return { error: 404 as const };
  return { row };
}

/** Mark an upload finished. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const found = await ownedRecording(id);
  if ("error" in found) {
    return NextResponse.json({ error: "Not found" }, { status: found.error });
  }

  const body = await req.json().catch(() => ({}));
  await db
    .update(recording)
    .set({
      status: "ready",
      sizeBytes: typeof body.sizeBytes === "number" ? body.sizeBytes : null,
      durationSec:
        typeof body.durationSec === "number" ? body.durationSec : null,
    })
    .where(eq(recording.id, id));

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const found = await ownedRecording(id);
  if ("error" in found) {
    return NextResponse.json({ error: "Not found" }, { status: found.error });
  }

  await deleteObject(objectKey(id)).catch(() => {}); // row is source of truth
  await db.delete(recording).where(eq(recording.id, id));

  return NextResponse.json({ ok: true });
}
