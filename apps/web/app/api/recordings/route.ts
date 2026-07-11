import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recording } from "@/lib/db/schema";
import {
  createMultipartUpload,
  objectKey,
  presignUpload,
} from "@/lib/storage";

// URL-friendly share slugs, no ambiguous characters.
const slug = customAlphabet(
  "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ",
  12,
);

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 200)
      : `Recording ${new Date().toLocaleString()}`;
  const mimeType =
    typeof body.mimeType === "string" && body.mimeType.startsWith("video/")
      ? body.mimeType
      : "video/webm";

  const id = slug();
  const key = objectKey(id, mimeType);

  // Multipart mode: the client streams parts while recording (instant
  // sharing); the row exists from the moment recording starts.
  if (body.multipart === true) {
    const uploadId = await createMultipartUpload(key, mimeType);
    await db.insert(recording).values({
      id,
      userId: session.user.id,
      title,
      mimeType,
    });
    return NextResponse.json({ id, uploadId, shareUrl: `/s/${id}` });
  }

  const uploadUrl = await presignUpload(key, mimeType);

  await db.insert(recording).values({
    id,
    userId: session.user.id,
    title,
    mimeType,
  });

  return NextResponse.json({ id, uploadUrl, shareUrl: `/s/${id}` });
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(recording)
    .where(eq(recording.userId, session.user.id))
    .orderBy(desc(recording.createdAt));

  return NextResponse.json(rows);
}
