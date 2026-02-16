import type { PrismaClient } from "@prisma/client";

export interface GoogleProfile {
  googleId: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface CheckSummary {
  id: string;
  type: string;
  inputSnippet: string;
  claimCount: number;
  createdAt: string;
}

export interface UserPrefs {
  citationStyle: string;
  maxClaims: number;
}

export function createRepository(db: PrismaClient) {
  return {
    async findOrCreateUser(profile: GoogleProfile) {
      const existing = await db.user.findUnique({ where: { googleId: profile.googleId } });
      if (existing) {
        return db.user.update({
          where: { id: existing.id },
          data: { displayName: profile.displayName, avatarUrl: profile.avatarUrl },
        });
      }
      return db.user.create({
        data: {
          googleId: profile.googleId,
          email: profile.email,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
        },
      });
    },

    async saveCheck(userId: string, type: string, inputSnippet: string, resultJson: string, claimCount: number) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      return db.check.create({
        data: { userId, type, inputSnippet, resultJson, claimCount, expiresAt },
      });
    },

    async getCheckHistory(userId: string, limit = 20, offset = 0): Promise<{ checks: CheckSummary[]; total: number }> {
      const now = new Date();
      const [checks, total] = await Promise.all([
        db.check.findMany({
          where: { userId, expiresAt: { gt: now } },
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: limit,
          select: { id: true, type: true, inputSnippet: true, claimCount: true, createdAt: true },
        }),
        db.check.count({ where: { userId, expiresAt: { gt: now } } }),
      ]);

      return {
        checks: checks.map((c) => ({
          id: c.id,
          type: c.type,
          inputSnippet: c.inputSnippet,
          claimCount: c.claimCount,
          createdAt: c.createdAt.toISOString(),
        })),
        total,
      };
    },

    async getCheckById(userId: string, checkId: string) {
      const check = await db.check.findFirst({
        where: { id: checkId, userId },
      });
      if (!check) return null;
      return {
        ...check,
        createdAt: check.createdAt.toISOString(),
        expiresAt: check.expiresAt.toISOString(),
      };
    },

    async getUserPreferences(userId: string): Promise<UserPrefs> {
      const prefs = await db.userPreferences.findUnique({ where: { userId } });
      return {
        citationStyle: prefs?.citationStyle ?? "mla",
        maxClaims: prefs?.maxClaims ?? 10,
      };
    },

    async upsertUserPreferences(userId: string, prefs: Partial<UserPrefs>) {
      return db.userPreferences.upsert({
        where: { userId },
        create: {
          userId,
          citationStyle: prefs.citationStyle ?? "mla",
          maxClaims: prefs.maxClaims ?? 10,
        },
        update: {
          ...(prefs.citationStyle !== undefined && { citationStyle: prefs.citationStyle }),
          ...(prefs.maxClaims !== undefined && { maxClaims: prefs.maxClaims }),
        },
      });
    },

    async logAudit(userId: string | null, action: string, metadata?: string, ip?: string) {
      return db.auditLog.create({
        data: { userId, action, metadata, ip },
      });
    },

    async cleanExpiredChecks() {
      const result = await db.check.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      if (result.count > 0) {
        console.log(`Cleaned ${result.count} expired checks`);
      }
      return result.count;
    },
  };
}

export type Repository = ReturnType<typeof createRepository>;
