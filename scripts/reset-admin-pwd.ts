import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  const newPassword = process.argv[2] || "Kairos-Admin2026";
  const hash = await bcrypt.hash(newPassword, 10);
  const u = await prisma.user.update({
    where: { email: "admin@kairos.com" },
    data: { passwordHash: hash, role: "SUPER_ADMIN", congregationId: null, active: true },
    select: { id: true, email: true, role: true, congregationId: true, active: true }
  });
  console.log("RESET OK:", JSON.stringify(u, null, 2));
  console.log("New password:", newPassword);
  await prisma.$disconnect();
}
main();
