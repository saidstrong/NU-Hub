import { describe, expect, it } from "vitest";
import {
  AVATAR_MAX_SIZE_BYTES,
  createMediaFilename,
  hasValidImageSignature,
  toPublicStorageUrl,
  validateImageFileMeta,
} from "@/lib/validation/media";

describe("media validation helpers", () => {
  it("validates basic image file meta", () => {
    const file = {
      name: "avatar.png",
      type: "image/png",
      size: 1024,
    };

    expect(validateImageFileMeta(file, AVATAR_MAX_SIZE_BYTES)).toBeNull();
    expect(validateImageFileMeta({ ...file, type: "image/gif" }, AVATAR_MAX_SIZE_BYTES)).toBe(
      "Only JPEG, PNG, and WEBP images are allowed.",
    );
    expect(validateImageFileMeta({ ...file, size: 0 }, AVATAR_MAX_SIZE_BYTES)).toBe(
      "Image file is empty.",
    );
  });

  it("creates stable media filenames with expected extension", () => {
    const file = { name: "cover.jpeg", type: "image/jpeg" };
    expect(createMediaFilename("avatar", file)).toMatch(/^avatar-[0-9a-f-]+\.jpg$/);
  });

  it("validates image signatures", async () => {
    const validPng = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])],
      "test.png",
      { type: "image/png" },
    );
    const invalidPng = new File(
      [new Uint8Array([0x00, 0x01, 0x02, 0x03])],
      "bad.png",
      { type: "image/png" },
    );

    await expect(hasValidImageSignature(validPng)).resolves.toBe(true);
    await expect(hasValidImageSignature(invalidPng)).resolves.toBe(false);
  });

  it("builds public storage URL from bucket and storage path", () => {
    const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://demo-project.supabase.co";

    expect(toPublicStorageUrl("avatars", "user-id/profile/avatar 1.png")).toBe(
      "https://demo-project.supabase.co/storage/v1/object/public/avatars/user-id/profile/avatar%201.png",
    );

    process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
  });
});
