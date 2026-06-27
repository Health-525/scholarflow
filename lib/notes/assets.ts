import fs from "fs";
import path from "path";

import { resolveDataDir } from "@/lib/server-db/path";

/**
 * 解析某账号的笔记图片资源目录。
 * 路径规则：<dataDir>/notes-assets/<schoolId>/<userId>
 * 使用嵌套目录而非 "schoolId:userId" 单目录，避免 Windows 等文件系统不支持冒号。
 */
export function resolveNoteAssetsDir(schoolId: string, userId: string): string {
  return path.join(resolveDataDir(), "notes-assets", schoolId, userId);
}

/**
 * 生成安全的文件名：保留原始名中的字母、数字、中文、下划线、连字符、点，
 * 其余替换为连字符，并确保不以点开头。
 */
export function safeAssetFileName(originalName: string): string {
  const base = path.basename(originalName);
  const safe = base.replace(/[^\w\u4e00-\u9fa5.\-]/g, "-").replace(/^\.+/, "");
  return safe || "image";
}

/**
 * 保存图片资源到磁盘，返回相对 assets 目录的文件名。
 */
export function saveNoteAsset(
  schoolId: string,
  userId: string,
  originalName: string,
  buffer: Buffer
): string {
  const dir = resolveNoteAssetsDir(schoolId, userId);
  fs.mkdirSync(dir, { recursive: true });

  const ext = path.extname(originalName).toLowerCase() || ".bin";
  const name = `${Date.now()}-${safeAssetFileName(path.basename(originalName, ext))}${ext}`;
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, buffer);
  return name;
}

/**
 * 读取图片资源，返回 buffer 与推断的 content type。
 */
export function readNoteAsset(
  schoolId: string,
  userId: string,
  assetName: string
): { data: Uint8Array; contentType: string } | null {
  const dir = resolveNoteAssetsDir(schoolId, userId);
  const filePath = path.join(dir, assetName);

  // 防止越级访问
  const resolved = path.resolve(filePath);
  const resolvedDir = path.resolve(dir);
  if (!resolved.startsWith(resolvedDir + path.sep) && resolved !== resolvedDir) {
    return null;
  }

  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  const data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  return { data, contentType: inferImageContentType(assetName) };
}

function inferImageContentType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    case ".bmp":
      return "image/bmp";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}
