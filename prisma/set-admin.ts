/*
 * Creates a super admin, or turns an existing account into one and resets its password.
 * Use it when you're locked out of /admin. Prints which database it touched.
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a long password' ADMIN_NAME="Your Name" \
 *   DATABASE_URL=... npm run admin:set
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = process.env.ADMIN_NAME?.trim() || "Admin";
  if (!email) throw new Error("Set ADMIN_EMAIL.");
  if (password.length < 12) throw new Error("Set ADMIN_PASSWORD to at least 12 characters.");

  const host = (process.env.DATABASE_URL ?? "").replace(/^.*@/, "").replace(/[/?].*$/, "") || "(DATABASE_URL from .env)";
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = { passwordHash, role: "ADMIN" as const, isSuperAdmin: true, status: "ACTIVE" as const, emailVerified: true };
  const existing = await prisma.user.findUnique({ where: { email } });
  await prisma.user.upsert({ where: { email }, update: admin, create: { email, name, ...admin } });
  console.log(`${existing ? "Updated" : "Created"} super admin ${email} on ${host}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
