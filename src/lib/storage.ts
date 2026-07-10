import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";

// Almacenamiento de archivos S3-compatible (MinIO on-prem, ver docker-compose.yml).
// Si las variables S3_* no están configuradas la subida binaria queda deshabilitada
// y el panel de adjuntos solo permite registrar URLs.

const globalForStorage = globalThis as unknown as {
  s3: S3Client | undefined;
  s3BucketReady: Promise<void> | undefined;
};

export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.S3_ENDPOINT &&
      process.env.S3_ACCESS_KEY &&
      process.env.S3_SECRET_KEY &&
      process.env.S3_BUCKET
  );
}

const BUCKET = () => process.env.S3_BUCKET as string;

function client(): S3Client {
  if (!globalForStorage.s3) {
    globalForStorage.s3 = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: "us-east-1", // MinIO exige una región aunque no aplique
      forcePathStyle: true, // MinIO no usa buckets por subdominio
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY as string,
        secretAccessKey: process.env.S3_SECRET_KEY as string,
      },
    });
  }
  return globalForStorage.s3;
}

/** Crea el bucket si no existe (una sola vez por proceso). */
function ensureBucket(): Promise<void> {
  if (!globalForStorage.s3BucketReady) {
    globalForStorage.s3BucketReady = (async () => {
      try {
        await client().send(new HeadBucketCommand({ Bucket: BUCKET() }));
      } catch {
        await client().send(new CreateBucketCommand({ Bucket: BUCKET() }));
      }
    })().catch((err) => {
      // Permite reintentar en la próxima llamada si MinIO estaba caído.
      globalForStorage.s3BucketReady = undefined;
      throw err;
    });
  }
  return globalForStorage.s3BucketReady;
}

export async function putFile(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  await ensureBucket();
  await client().send(
    new PutObjectCommand({
      Bucket: BUCKET(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function getFileStream(key: string): Promise<{
  stream: Readable;
  contentType?: string;
  contentLength?: number;
}> {
  const res = await client().send(
    new GetObjectCommand({ Bucket: BUCKET(), Key: key })
  );
  return {
    stream: res.Body as Readable,
    contentType: res.ContentType,
    contentLength: res.ContentLength,
  };
}

/** Borrado best-effort del binario (el registro en BD es la fuente de verdad). */
export async function deleteFile(key: string): Promise<void> {
  try {
    await client().send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key }));
  } catch (err) {
    console.error(`No se pudo borrar el objeto ${key} del storage:`, err);
  }
}

// ─────────────────────── Validación de archivos subidos ───────────────────────

/** 50 MB: cubre planos PDF/DWG y fotos de obra sin permitir cargas absurdas. */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/** Extensiones permitidas (documentos de oficina, imágenes, planos, comprimidos). */
const ALLOWED_EXTENSIONS = new Set([
  "pdf", "png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "heic",
  "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv",
  "dwg", "dxf", "skp", "3ds", "step", "stp", "ai", "psd",
  "zip", "rar", "7z", "msg", "eml", "mp4", "mov",
]);

export function fileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function isAllowedFile(name: string): boolean {
  return ALLOWED_EXTENSIONS.has(fileExtension(name));
}

/** Nombre seguro para usar dentro de la clave del objeto. */
export function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // sin tildes (diacriticos tras NFD)
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(-120);
}
