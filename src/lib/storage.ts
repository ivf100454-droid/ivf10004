import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID as string;
const accessKeyId = process.env.R2_ACCESS_KEY_ID as string;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY as string;

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME as string;

export const r2 = new S3Client({
  region: "auto",
  endpoint: "https://" + accountId + ".r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
});

export async function uploadToR2(key: string, body: Buffer, contentType: string) {
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function getSignedDownloadUrl(key: string, expiresInSeconds: number) {
  const ttl = expiresInSeconds || 300;
  const command = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key });
  return getSignedUrl(r2, command, { expiresIn: ttl });
}
