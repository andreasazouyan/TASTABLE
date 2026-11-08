-- Real accounts: optional password hash on User. Additive; demo personas keep NULL.
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
