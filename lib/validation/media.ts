export const IMAGE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const IMAGE_ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

export const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const EVENT_COVER_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const LISTING_IMAGE_MAX_SIZE_BYTES = 10 * 1024 * 1024;
const UNSAFE_FILENAME_CHARS_PATTERN = /[<>:"|?*\u0000-\u001f]/;
const SUSPICIOUS_DOUBLE_EXTENSION_SEGMENTS = new Set([
  "php",
  "phtml",
  "phar",
  "js",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "jsx",
  "exe",
  "bat",
  "cmd",
  "com",
  "scr",
  "sh",
  "ps1",
  "jar",
  "html",
  "htm",
  "svg",
]);

type AllowedImageMimeType = (typeof IMAGE_ALLOWED_MIME_TYPES)[number];

type FileLike = {
  name: string;
  type: string;
  size: number;
};

type FileWithBytes = FileLike & {
  slice: File["slice"];
};

type StorageLikeClient = {
  storage: {
    from: (bucket: string) => {
      remove: (paths: string[]) => Promise<unknown>;
    };
  };
};

function hasAllowedImageMimeType(type: string): type is AllowedImageMimeType {
  return IMAGE_ALLOWED_MIME_TYPES.includes(type as AllowedImageMimeType);
}

export function validateImageFilename(fileName: string): string | null {
  const normalized = fileName.trim();

  if (!normalized) {
    return "Image file name is missing.";
  }

  if (
    normalized.includes("/") ||
    normalized.includes("\\") ||
    normalized.includes("..")
  ) {
    return "Invalid image file name.";
  }

  if (UNSAFE_FILENAME_CHARS_PATTERN.test(normalized)) {
    return "Invalid image file name.";
  }

  const segments = normalized
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length < 2) {
    return "Image file must include a valid extension.";
  }

  const extension = segments[segments.length - 1]?.toLowerCase() ?? "";
  if (
    !IMAGE_ALLOWED_EXTENSIONS.includes(
      extension as (typeof IMAGE_ALLOWED_EXTENSIONS)[number],
    )
  ) {
    return "Only JPG, JPEG, PNG, and WEBP file extensions are allowed.";
  }

  if (segments.length > 2) {
    const previousExtension = segments[segments.length - 2]?.toLowerCase() ?? "";
    if (SUSPICIOUS_DOUBLE_EXTENSION_SEGMENTS.has(previousExtension)) {
      return "Suspicious file name is not allowed.";
    }
  }

  return null;
}

export function validateImageFileMeta(file: FileLike, maxSizeBytes: number): string | null {
  const fileNameError = validateImageFilename(file.name);
  if (fileNameError) {
    return fileNameError;
  }

  if (!hasAllowedImageMimeType(file.type)) {
    return "Only JPEG, PNG, and WEBP images are allowed.";
  }

  if (file.size <= 0) {
    return "Image file is empty.";
  }

  if (file.size > maxSizeBytes) {
    return `Image must be ${Math.floor(maxSizeBytes / (1024 * 1024))}MB or less.`;
  }

  return null;
}

export function resolveImageExtension(file: Pick<FileLike, "name" | "type">): "jpg" | "png" | "webp" {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "jpg" || extension === "jpeg") return "jpg";
  if (extension === "png") return "png";
  if (extension === "webp") return "webp";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";

  return "jpg";
}

export function createMediaFilename(prefix: string, file: Pick<FileLike, "name" | "type">): string {
  return `${prefix}-${crypto.randomUUID()}.${resolveImageExtension(file)}`;
}

export async function hasValidImageSignature(file: FileWithBytes): Promise<boolean> {
  if (!hasAllowedImageMimeType(file.type)) {
    return false;
  }

  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  if (file.type === "image/jpeg") {
    return signature.length >= 3 && signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
  }

  if (file.type === "image/png") {
    return (
      signature.length >= 8 &&
      signature[0] === 0x89 &&
      signature[1] === 0x50 &&
      signature[2] === 0x4e &&
      signature[3] === 0x47 &&
      signature[4] === 0x0d &&
      signature[5] === 0x0a &&
      signature[6] === 0x1a &&
      signature[7] === 0x0a
    );
  }

  return (
    signature.length >= 12 &&
    signature[0] === 0x52 &&
    signature[1] === 0x49 &&
    signature[2] === 0x46 &&
    signature[3] === 0x46 &&
    signature[8] === 0x57 &&
    signature[9] === 0x45 &&
    signature[10] === 0x42 &&
    signature[11] === 0x50
  );
}

export function isSafeStoragePath(path: string): boolean {
  const normalized = path.trim();

  if (!normalized || normalized.length > 500) {
    return false;
  }

  if (
    normalized.startsWith("/") ||
    normalized.endsWith("/") ||
    normalized.includes("\\") ||
    normalized.includes("..") ||
    normalized.includes("//")
  ) {
    return false;
  }

  const segments = normalized.split("/");
  if (segments.length === 0) {
    return false;
  }

  return segments.every((segment) => /^[a-zA-Z0-9._-]+$/.test(segment));
}

export function toPublicStorageUrl(bucket: string, storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return null;

  const encodedPath = storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${baseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

export async function removeStorageObjectBestEffort(
  supabase: StorageLikeClient,
  bucket: string,
  storagePath: string | null | undefined,
): Promise<void> {
  if (!storagePath) return;

  await supabase.storage.from(bucket).remove([storagePath]);
}
