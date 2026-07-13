import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateBucketCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { and, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { recording } from "./db/schema";

const BUCKET = process.env.S3_BUCKET ?? "recordings";

export const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
});

let bucketReady = false;

/** Dev convenience (MinIO): create the bucket on first use. */
export async function ensureBucket() {
  if (bucketReady || process.env.S3_AUTO_CREATE_BUCKET !== "true") return;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
  }
  bucketReady = true;
}

/** Storage key with a format-correct extension (MP4 recordings were
 * previously stored under `.webm` keys). */
export function objectKey(recordingId: string, mimeType?: string | null) {
  const ext = mimeType?.includes("mp4") ? "mp4" : "webm";
  return `${recordingId}.${ext}`;
}

export async function presignUpload(key: string, contentType: string) {
  await ensureBucket();
  return getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 3600 },
  );
}

export async function presignDownload(key: string) {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), {
    expiresIn: 3600,
  });
}

export async function deleteObject(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

// ---- Multipart uploads (upload-while-recording) ----

export async function createMultipartUpload(key: string, contentType: string) {
  await ensureBucket();
  const res = await s3.send(
    new CreateMultipartUploadCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    }),
  );
  if (!res.UploadId) throw new Error("Storage did not return an upload id");
  return res.UploadId;
}

/** Long expiry: parts are signed at recording start and used for its whole
 * duration. */
export function presignUploadPart(
  key: string,
  uploadId: string,
  partNumber: number,
) {
  return getSignedUrl(
    s3,
    new UploadPartCommand({
      Bucket: BUCKET,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    }),
    { expiresIn: 6 * 3600 },
  );
}

export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: { partNumber: number; etag: string }[],
) {
  await s3.send(
    new CompleteMultipartUploadCommand({
      Bucket: BUCKET,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts
          .slice()
          .sort((a, b) => a.partNumber - b.partNumber)
          .map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })),
      },
    }),
  );
}

export async function abortMultipartUpload(key: string, uploadId: string) {
  await s3.send(
    new AbortMultipartUploadCommand({
      Bucket: BUCKET,
      Key: key,
      UploadId: uploadId,
    }),
  );
}

/** Bytes used against the free-tier Capca Cloud storage quota: completed
 * recordings stored in our own bucket only (Drive/local don't count). */
export async function getCapcaCloudUsageBytes(userId: string) {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${recording.sizeBytes}), 0)` })
    .from(recording)
    .where(
      and(
        eq(recording.userId, userId),
        eq(recording.destination, "capca"),
        eq(recording.status, "ready"),
      ),
    );
  return Number(row?.total ?? 0);
}
