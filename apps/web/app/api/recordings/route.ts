import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  DEFAULT_CAPCA_QUOTA_BYTES,
  type Destination,
  DESTINATIONS,
  driveConnection,
  recording,
  userSettings,
} from "@/lib/db/schema";
import { getValidDriveAccessToken } from "@/lib/drive-token";
import { createResumableUploadSession } from "@/lib/google-drive";
import {
  createMultipartUpload,
  getCapcaCloudUsageBytes,
  objectKey,
  presignUpload,
} from "@/lib/storage";

// URL-friendly share slugs, no ambiguous characters.
const slug = customAlphabet(
  "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ",
  12,
);

function driveFilename(title: string, mimeType: string) {
  const ext = mimeType.includes("mp4") ? "mp4" : "webm";
  return `${title}.${ext}`;
}

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
  const destination: Destination = DESTINATIONS.includes(body.destination)
    ? body.destination
    : "capca";

  const id = slug();

  if (destination === "local") {
    // No cloud storage involved — the row exists purely for library
    // visibility. The file itself only lives on the user's device.
    await db.insert(recording).values({
      id,
      userId: session.user.id,
      title,
      mimeType,
      destination,
      status: "ready",
    });
    return NextResponse.json({ id, shareUrl: null });
  }

  if (destination === "drive") {
    const [conn] = await db
      .select()
      .from(driveConnection)
      .where(eq(driveConnection.userId, session.user.id));
    if (!conn) {
      return NextResponse.json(
        { error: "not_connected", message: "Connect Google Drive in Settings first." },
        { status: 409 },
      );
    }
    const accessToken = await getValidDriveAccessToken(session.user.id);
    if (!accessToken) {
      return NextResponse.json(
        { error: "not_connected", message: "Google Drive connection expired — reconnect in Settings." },
        { status: 409 },
      );
    }

    const driveUploadUrl = await createResumableUploadSession(
      accessToken,
      conn.folderId,
      driveFilename(title, mimeType),
      mimeType,
    );

    await db.insert(recording).values({
      id,
      userId: session.user.id,
      title,
      mimeType,
      destination,
    });
    return NextResponse.json({ id, driveUploadUrl, shareUrl: null });
  }

  // destination === "capca"
  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, session.user.id));
  const quota = settings?.capcaQuotaBytes ?? DEFAULT_CAPCA_QUOTA_BYTES;
  const usage = await getCapcaCloudUsageBytes(session.user.id);
  if (usage >= quota) {
    return NextResponse.json(
      {
        error: "quota_exceeded",
        message:
          "You've used all of your free Capca Cloud storage. Connect Google Drive or save locally to keep recording.",
        usage,
        quota,
      },
      { status: 409 },
    );
  }

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
      destination,
    });
    return NextResponse.json({ id, uploadId, shareUrl: `/s/${id}` });
  }

  const uploadUrl = await presignUpload(key, mimeType);

  await db.insert(recording).values({
    id,
    userId: session.user.id,
    title,
    mimeType,
    destination,
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
