import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { driveConnection } from "@/lib/db/schema";
import { ensureCapcaFolder, exchangeDriveCode } from "@/lib/google-drive";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const settingsUrl = new URL("/dashboard/settings/integrations", req.url);

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    settingsUrl.searchParams.set("drive_error", "denied");
    return NextResponse.redirect(settingsUrl);
  }
  if (!session || !code || state !== session.user.id) {
    settingsUrl.searchParams.set("drive_error", "invalid_request");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const redirectUri = new URL("/api/drive/callback", req.url).toString();
    const { accessToken, refreshToken, expiresInSec } = await exchangeDriveCode(
      code,
      redirectUri,
    );
    if (!refreshToken) {
      // Google omits refresh_token on repeat consents unless prompt=consent
      // forced a fresh one — we always pass that, but guard anyway.
      settingsUrl.searchParams.set("drive_error", "no_refresh_token");
      return NextResponse.redirect(settingsUrl);
    }

    const folder = await ensureCapcaFolder(accessToken);

    await db
      .insert(driveConnection)
      .values({
        userId: session.user.id,
        accessToken,
        refreshToken,
        accessTokenExpiresAt: new Date(Date.now() + expiresInSec * 1000),
        folderId: folder.id,
        folderName: folder.name,
      })
      .onConflictDoUpdate({
        target: driveConnection.userId,
        set: {
          accessToken,
          refreshToken,
          accessTokenExpiresAt: new Date(Date.now() + expiresInSec * 1000),
          folderId: folder.id,
          folderName: folder.name,
        },
      });

    settingsUrl.searchParams.set("drive_connected", "1");
    return NextResponse.redirect(settingsUrl);
  } catch (err) {
    console.error("[drive] callback failed:", err);
    settingsUrl.searchParams.set("drive_error", "connection_failed");
    return NextResponse.redirect(settingsUrl);
  }
}
