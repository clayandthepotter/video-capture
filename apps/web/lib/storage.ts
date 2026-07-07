import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

export function objectKey(recordingId: string) {
  return `${recordingId}.webm`;
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
