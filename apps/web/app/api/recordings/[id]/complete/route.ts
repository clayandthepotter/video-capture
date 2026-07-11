import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recording } from "@/lib/db/schema";
import { completeMultipartUpload, objectKey } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

/** Assemble the multipart upload and mark the recording ready. */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [row] = await db
    .select()
    .from(recording)
    .where(and(eq(recording.id, id), eq(recording.userId, session.user.id)));
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { uploadId, parts } = body;
  if (
    typeof uploadId !== "string" ||
    !Array.isArray(parts) ||
    parts.length === 0 ||
    !parts.every(
      (p) =>
        Number.isInteger(p?.partNumber) &&
        typeof p?.etag === "string" &&
        p.etag.length > 0,
    )
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await completeMultipartUpload(objectKey(id, row.mimeType), uploadId, parts);

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
