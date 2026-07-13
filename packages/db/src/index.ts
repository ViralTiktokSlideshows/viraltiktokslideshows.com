import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@viraltiktokslideshows/env/server";

import { PrismaClient } from "../prisma/generated/client";

export type { User, Session, MagicLinkToken, Purchase, PurchaseStatus } from "../prisma/generated/client";

export function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();
export default prisma;
