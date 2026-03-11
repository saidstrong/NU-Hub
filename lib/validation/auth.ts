import { z } from "zod";

const nuEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.")
  .refine((value) => value.endsWith("@nu.edu.kz"), {
    message: "Use your NU email (@nu.edu.kz).",
  });

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name is too short.")
      .max(80, "Full name is too long."),
    email: nuEmailSchema,
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Confirm your password."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const loginSchema = z.object({
  email: nuEmailSchema,
  password: z.string().min(1, "Password is required."),
  next: z.string().optional(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
