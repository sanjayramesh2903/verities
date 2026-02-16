import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | null = null;

export function getPrisma(): PrismaClient | null {
  if (prisma) return prisma;

  try {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
    return prisma;
  } catch (err) {
    console.warn("Failed to initialize Prisma client:", (err as Error).message);
    return null;
  }
}

export async function connectDb(): Promise<PrismaClient | null> {
  const client = getPrisma();
  if (!client) return null;

  try {
    await client.$connect();
    console.log("Database connected");
    return client;
  } catch (err) {
    console.warn("Database connection failed (features requiring persistence will be unavailable):", (err as Error).message);
    return null;
  }
}

export async function disconnectDb(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
