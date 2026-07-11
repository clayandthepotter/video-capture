import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recording } from "@/lib/db/schema";
import { objectKey, presignUploadPart } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

/** Presign the next multipart part for an in-progress recording upload. */
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
  const { uploadId, partNumber } = body;
  if (
    typeof uploadId !== "string" ||
    !Number.isInteger(partNumber) ||
    partNumber < 1 ||
    partNumber > 10000
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const url = await presignUploadPart(
    objectKey(id, row.mimeType),
    uploadId,
    partNumber,
  );
  return NextResponse.json({ url });
}
