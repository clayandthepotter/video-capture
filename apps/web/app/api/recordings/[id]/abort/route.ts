import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recording } from "@/lib/db/schema";
import { abortMultipartUpload, objectKey } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

/** Cancel an in-progress multipart upload and remove the recording row. */
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
  if (typeof body.uploadId === "string") {
    await abortMultipartUpload(objectKey(id, row.mimeType), body.uploadId).catch(
      () => {},
    );
  }
  await db.delete(recording).where(eq(recording.id, id));

  return NextResponse.json({ ok: true });
}
