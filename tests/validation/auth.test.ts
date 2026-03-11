import { describe, expect, it } from "vitest";
import { loginSchema, signUpSchema } from "@/lib/validation/auth";

describe("auth validation", () => {
  it("normalizes and accepts a valid NU email during sign up", () => {
    const result = signUpSchema.safeParse({
      fullName: "Student Name",
      email: "  STUDENT@NU.EDU.KZ ",
      password: "password123",
      confirmPassword: "password123",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("student@nu.edu.kz");
    }
  });

  it("rejects non-NU emails during sign up", () => {
    const result = signUpSchema.safeParse({
      fullName: "Student Name",
      email: "student@gmail.com",
      password: "password123",
      confirmPassword: "password123",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email?.[0]).toBe(
        "Use your NU email (@nu.edu.kz).",
      );
    }
  });

  it("rejects mismatched sign-up passwords", () => {
    const result = signUpSchema.safeParse({
      fullName: "Student Name",
      email: "student@nu.edu.kz",
      password: "password123",
      confirmPassword: "different123",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmPassword?.[0]).toBe(
        "Passwords do not match.",
      );
    }
  });

  it("requires password for login", () => {
    const result = loginSchema.safeParse({
      email: "student@nu.edu.kz",
      password: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password?.[0]).toBe(
        "Password is required.",
      );
    }
  });
});
