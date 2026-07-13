import {
  bigint,
  boolean,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// ---- Better Auth tables (shape required by the drizzle adapter) ----

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// ---- App tables ----

// Storage destination for a recording's source file. Share links only exist
// for "capca" — Drive and local recordings have no server-side copy to serve.
export const DESTINATIONS = ["capca", "drive", "local"] as const;
export type Destination = (typeof DESTINATIONS)[number];

export const DEFAULT_CAPCA_QUOTA_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB free tier

export const recording = pgTable("recording", {
  id: text("id").primaryKey(), // nanoid — doubles as the share slug
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: text("status", { enum: ["uploading", "ready", "failed"] })
    .notNull()
    .default("uploading"),
  destination: text("destination", { enum: DESTINATIONS })
    .notNull()
    .default("capca"),
  mimeType: text("mime_type").notNull().default("video/webm"),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  durationSec: real("duration_sec"),
  // Populated only for destination = "drive"
  driveFileId: text("drive_file_id"),
  driveWebViewLink: text("drive_web_view_link"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Recording = typeof recording.$inferSelect;

// Per-user recording preferences.
export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  defaultDestination: text("default_destination", { enum: DESTINATIONS })
    .notNull()
    .default("capca"),
  capcaQuotaBytes: bigint("capca_quota_bytes", { mode: "number" })
    .notNull()
    .default(DEFAULT_CAPCA_QUOTA_BYTES),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type UserSettings = typeof userSettings.$inferSelect;

// Google Drive OAuth connection, separate from Better Auth's `account` table
// (which Better Auth owns) since this scope (drive.file) is requested
// independently of sign-in and can be connected/disconnected on its own.
export const driveConnection = pgTable("drive_connection", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  accessTokenExpiresAt: timestamp("access_token_expires_at").notNull(),
  folderId: text("folder_id").notNull(),
  folderName: text("folder_name").notNull(),
  connectedAt: timestamp("connected_at").notNull().defaultNow(),
});

export type DriveConnection = typeof driveConnection.$inferSelect;
