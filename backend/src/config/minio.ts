import { Client } from "minio";

const minioPort = process.env.MINIO_PORT ? Number(process.env.MINIO_PORT) : 9000;

// Used in Phase 8 - Snapshots
export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || "minio",
  port: minioPort,
  useSSL: false,
  accessKey: process.env.MINIO_ROOT_USER || "",
  secretKey: process.env.MINIO_ROOT_PASSWORD || ""
});
