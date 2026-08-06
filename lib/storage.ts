import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { captureError } from "@/lib/monitoring";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export type UploadResult = { url: string; key: string };

export class UploadError extends Error {}

function extensionFor(mime: string) {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    default:
      return "jpg";
  }
}

const s3Configured = () =>
  Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY,
  );

/**
 * Uploads to S3 when configured, otherwise writes into `public/uploads` so the
 * app is usable locally without cloud credentials. The local path is
 * development-only — a serverless production filesystem is ephemeral.
 */
export async function uploadImage(
  file: File,
  folder: "menu" | "reviews" | "restaurant" = "menu",
): Promise<UploadResult> {
  if (!ALLOWED.has(file.type)) {
    throw new UploadError("Only JPEG, PNG, WebP and AVIF images are allowed");
  }
  if (file.size > MAX_BYTES) {
    throw new UploadError("Images must be 5 MB or smaller");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `${folder}/${randomUUID()}.${extensionFor(file.type)}`;

  if (s3Configured()) {
    try {
      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
      const client = new S3Client({
        region: process.env.S3_REGION ?? "eu-central-1",
        endpoint: process.env.S3_ENDPOINT || undefined,
        forcePathStyle: Boolean(process.env.S3_ENDPOINT),
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID!,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        },
      });

      await client.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: key,
          Body: buffer,
          ContentType: file.type,
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );

      const base =
        process.env.S3_PUBLIC_URL ??
        `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com`;

      return { url: `${base.replace(/\/$/, "")}/${key}`, key };
    } catch (error) {
      captureError(error, { scope: "s3-upload", key });
      throw new UploadError("Upload failed. Please try again.");
    }
  }

  const dir = path.join(process.cwd(), "public", "uploads", path.dirname(key));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(process.cwd(), "public", "uploads", key), buffer);

  return { url: `/uploads/${key}`, key };
}

export async function deleteImage(key: string) {
  if (!s3Configured()) return;
  try {
    const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: process.env.S3_REGION ?? "eu-central-1",
      endpoint: process.env.S3_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
    await client.send(
      new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }),
    );
  } catch (error) {
    captureError(error, { scope: "s3-delete", key });
  }
}
