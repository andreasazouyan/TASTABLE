import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { logInInput, signUpInput } from "@/lib/validation/account";

describe("password hashing", () => {
  it("verifies the right password and rejects others", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(hash).not.toContain("correct horse");
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("correct horse battery!", hash)).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("same-password")).not.toBe(await hashPassword("same-password"));
  });

  it("never verifies against a missing or malformed hash", async () => {
    expect(await verifyPassword("x", null)).toBe(false);
    expect(await verifyPassword("x", "plaintext")).toBe(false);
  });
});

describe("account validation", () => {
  const base = { name: "Maya Chen", email: "  Maya@Gmail.com ", password: "longenough", as: "host" };

  it("normalises email and keeps the role", () => {
    const r = signUpInput.parse(base);
    expect(r.email).toBe("maya@gmail.com");
    expect(r.as).toBe("host");
  });

  it("defaults an unknown role to guest", () => {
    expect(signUpInput.parse({ ...base, as: "admin" }).as).toBe("guest");
  });

  it("rejects short passwords and the demo email domain", () => {
    expect(signUpInput.safeParse({ ...base, password: "short" }).success).toBe(false);
    expect(signUpInput.safeParse({ ...base, email: "zoe.guest@example.com" }).success).toBe(false);
  });

  it("drops unsafe redirect targets", () => {
    expect(logInInput.parse({ email: "a@b.co", password: "x", next: "//evil.com" }).next).toBeUndefined();
    expect(logInInput.parse({ email: "a@b.co", password: "x", next: "/bookings" }).next).toBe("/bookings");
  });
});
