/**
 * One-time storage setup for a production S3-compatible bucket:
 * applies the CORS policy browsers need for presigned uploads, then
 * verifies credentials with a presigned PUT -> GET -> DELETE round trip.
 *
 * Usage:
 *   S3_ENDPOINT=... S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... \
 *   S3_BUCKET=... APP_ORIGINS=https://your-app.com node scripts/r2-setup.mjs
 */
import {
  S3Client,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.S3_BUCKET;
const ORIGINS = (process.env.APP_ORIGINS ?? "http://localhost:3000").split(",");

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "auto",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

await s3.send(
  new PutBucketCorsCommand({
    Bucket: BUCKET,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: ORIGINS,
          AllowedMethods: ["GET", "PUT", "HEAD"],
          AllowedHeaders: ["*"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }),
);
const cors = await s3.send(new GetBucketCorsCommand({ Bucket: BUCKET }));
console.log("CORS rules applied:", JSON.stringify(cors.CORSRules));

const key = "setup-sanity-check.txt";
const putUrl = await getSignedUrl(
  s3,
  new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: "text/plain" }),
  { expiresIn: 300 },
);
const putRes = await fetch(putUrl, {
  method: "PUT",
  headers: { "Content-Type": "text/plain" },
  body: "presigned upload ok",
});
console.log("presigned PUT:", putRes.status);

const getUrl = await getSignedUrl(
  s3,
  new GetObjectCommand({ Bucket: BUCKET, Key: key }),
  { expiresIn: 300 },
);
const body = await fetch(getUrl).then((r) => r.text());
console.log("presigned GET:", JSON.stringify(body));

await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
console.log("cleanup complete — storage is ready");
