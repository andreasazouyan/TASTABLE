import { z } from "zod";

export const safeNextPath = z
  .string()
  .startsWith("/")
  .refine((p) => !p.startsWith("//") && !p.startsWith("/\\"))
  .optional()
  .catch(undefined);

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address." }));

export const PASSWORD_MIN = 8;

export const signUpInput = z.object({
  name: z.string().trim().min(2, { error: "Tell us your name." }).max(60, { error: "Keep it under 60 characters." }),
  // example.com is reserved for the seeded demo personas.
  email: email.refine((e) => !/@(.+\.)?example\.(com|org|net)$/.test(e), { error: "Use your real email address." }),
  password: z
    .string()
    .min(PASSWORD_MIN, { error: `Use at least ${PASSWORD_MIN} characters.` })
    .max(200, { error: "That password is too long." }),
  as: z.enum(["guest", "host"]).catch("guest"),
});

export const logInInput = z.object({
  email,
  password: z.string().min(1, { error: "Enter your password." }).max(200),
  next: safeNextPath,
});
