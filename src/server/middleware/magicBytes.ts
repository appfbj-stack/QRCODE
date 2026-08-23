/**
 * magicBytes.ts
 *
 * Valida o conteúdo real de um arquivo checando os "magic bytes" (primeiros bytes).
 * Impede que atacantes mandem malware.exe renomeado com Content-Type: application/pdf.
 *
 * Suportados: PDF, JPEG, PNG, WEBP
 */

import fs from "fs";

const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP_RIFF = [0x52, 0x49, 0x46, 0x46]; // RIFF
const WEBP_WEBP = [0x57, 0x45, 0x42, 0x50]; // WEBP

function startsWith(buf: Buffer, signature: number[]): boolean {
  if (buf.length < signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (buf[i] !== signature[i]) return false;
  }
  return true;
}

export type AllowedFileKind = "pdf" | "jpeg" | "png" | "webp";

const KIND_BY_MIME: Record<string, AllowedFileKind> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Lê os primeiros 16 bytes do arquivo e valida contra o MIME declarado.
 * Retorna o kind (pdf/jpeg/png/webp) se válido, ou null se inválido.
 */
export async function validateFileMagicBytes(
  filePath: string,
  declaredMime: string
): Promise<AllowedFileKind | null> {
  const expectedKind = KIND_BY_MIME[declaredMime];
  if (!expectedKind) return null;

  let buf: Buffer;
  try {
    // Lê só os primeiros 16 bytes (mais que suficiente pra todos os magic bytes)
    const fd = fs.openSync(filePath, "r");
    try {
      const stat = fs.fstatSync(fd);
      const readSize = Math.min(16, stat.size);
      const b = Buffer.alloc(readSize);
      fs.readSync(fd, b, 0, readSize, 0);
      buf = b;
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return null;
  }

  switch (expectedKind) {
    case "pdf":
      return startsWith(buf, PDF) ? "pdf" : null;
    case "jpeg":
      return startsWith(buf, JPEG) ? "jpeg" : null;
    case "png":
      return startsWith(buf, PNG) ? "png" : null;
    case "webp": {
      // WEBP: RIFF (4 bytes) + size (4 bytes) + WEBP (4 bytes) = 12 bytes mínimo
      if (!startsWith(buf, WEBP_RIFF)) return null;
      if (buf.length < 12) return null;
      const webpMarker = [buf[8], buf[9], buf[10], buf[11]];
      return startsWith(Buffer.from(webpMarker), WEBP_WEBP) ? "webp" : null;
    }
    default:
      return null;
  }
}
