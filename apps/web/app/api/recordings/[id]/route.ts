import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recording } from "@/lib/db/schema";
import { getValidDriveAccessToken } from "@/lib/drive-token";
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

/** Finish an upload and/or update metadata (rename). */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const found = await ownedRecording(id);
  if ("error" in found) {
    return NextResponse.json({ error: "Not found" }, { status: found.error });
  }

  const body = await req.json().catch(() => ({}));

  // Rename-only request: don't touch upload state.
  if (typeof body.title === "string" && body.sizeBytes === undefined) {
    const title = body.title.trim().slice(0, 200);
    if (!title) {
      return NextResponse.json({ error: "Title required" }, { status: 400 });
    }
    await db.update(recording).set({ title }).where(eq(recording.id, id));
    return NextResponse.json({ ok: true });
  }

  await db
    .update(recording)
    .set({
      status: "ready",
      sizeBytes: typeof body.sizeBytes === "number" ? body.sizeBytes : null,
      durationSec:
        typeof body.durationSec === "number" ? body.durationSec : null,
      // Populated only when finalizing a "drive" destination upload.
      ...(typeof body.driveFileId === "string"
        ? { driveFileId: body.driveFileId }
        : {}),
      ...(typeof body.driveWebViewLink === "string"
        ? { driveWebViewLink: body.driveWebViewLink }
        : {}),
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

  if (found.row.destination === "capca") {
    await deleteObject(objectKey(id, found.row.mimeType)).catch(() => {});
  } else if (found.row.destination === "drive" && found.row.driveFileId) {
    try {
      const token = await getValidDriveAccessToken(found.row.userId);
      if (token) {
        await fetch(
          `https://www.googleapis.com/drive/v3/files/${found.row.driveFileId}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
        );
      }
    } catch {
      // Best-effort — the file stays in the user's Drive, which is their own
      // storage anyway; our row (the source of truth for the library) is
      // still removed below.
    }
  }
  await db.delete(recording).where(eq(recording.id, id));

  return NextResponse.json({ ok: true });
}
