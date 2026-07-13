import { eq } from "drizzle-orm";
import { db } from "./db";
import { driveConnection } from "./db/schema";
import { refreshDriveAccessToken } from "./google-drive";

/** Returns a valid access token for the user's Drive connection, refreshing
 * it first if it's expired (or about to expire). Returns null if not
 * connected. */
export async function getValidDriveAccessToken(userId: string) {
  const [conn] = await db
    .select()
    .from(driveConnection)
    .where(eq(driveConnection.userId, userId));
  if (!conn) return null;

  const expiresSoon = conn.accessTokenExpiresAt.getTime() < Date.now() + 60_000;
  if (!expiresSoon) return conn.accessToken;

  const { accessToken, expiresInSec } = await refreshDriveAccessToken(
    conn.refreshToken,
  );
  await db
    .update(driveConnection)
    .set({
      accessToken,
      accessTokenExpiresAt: new Date(Date.now() + expiresInSec * 1000),
    })
    .where(eq(driveConnection.userId, userId));
  return accessToken;
}
