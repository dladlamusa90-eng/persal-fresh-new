import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { isRole } from "@/lib/roles";
import { hash } from "@/lib/bcrypt";
import { clearAuthFailures, isAuthLocked, registerAuthFailure } from "@/lib/security/rateLimit";
import { getAuthSecret } from "@/lib/authSecret";
import { isSouthAfricanIdNumber, normalizeIdNumber } from "@/lib/validators/auth";

const AUTH_SECRET = getAuthSecret();

async function findAuthUser(identifier: { normalizedId: string; usingId: boolean; normalizedEmail: string }) {
  try {
    const user = await prisma.user.findFirst({
      where: identifier.usingId
        ? { idNumber: identifier.normalizedId }
        : { email: { equals: identifier.normalizedEmail, mode: "insensitive" } },
      select: {
        id: true,
        email: true,
        fullName: true,
        password: true,
        role: true,
        isBurned: true,
        isDeleted: true,
      },
    });

    return user;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code = typeof (error as { code?: unknown })?.code === "string"
      ? String((error as { code?: string }).code)
      : "";

    if (code !== "P2022" && !message.toLowerCase().includes("isdeleted")) {
      throw error;
    }

    const legacyUser = await prisma.user.findFirst({
      where: identifier.usingId
        ? { idNumber: identifier.normalizedId }
        : { email: { equals: identifier.normalizedEmail, mode: "insensitive" } },
      select: {
        id: true,
        email: true,
        fullName: true,
        password: true,
        role: true,
        isBurned: true,
      },
    });

    if (!legacyUser) {
      return null;
    }

    return {
      ...legacyUser,
      isDeleted: false,
    };
  }
}

async function findSessionUser(tokenUserId: string | null, tokenEmail: string | null) {
  try {
    const user = await prisma.user.findFirst({
      where: tokenUserId
        ? { id: tokenUserId }
        : { email: { equals: String(tokenEmail ?? ""), mode: "insensitive" } },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isBurned: true,
        isDeleted: true,
      },
    });

    return user;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code = typeof (error as { code?: unknown })?.code === "string"
      ? String((error as { code?: string }).code)
      : "";

    if (code !== "P2022" && !message.toLowerCase().includes("isdeleted")) {
      throw error;
    }

    const legacyUser = await prisma.user.findFirst({
      where: tokenUserId
        ? { id: tokenUserId }
        : { email: { equals: String(tokenEmail ?? ""), mode: "insensitive" } },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isBurned: true,
      },
    });

    if (!legacyUser) {
      return null;
    }

    return {
      ...legacyUser,
      isDeleted: false,
    };
  }
}

export const authOptions: NextAuthOptions = {
  secret: AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email or SA ID number", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const identifier = String(credentials?.email ?? "").trim();
        const password = credentials?.password;

        if (!identifier || !password) return null;

        const normalizedId = normalizeIdNumber(identifier);
        const usingId = isSouthAfricanIdNumber(normalizedId);
        const normalizedEmail = identifier.toLowerCase();

        const lockKey = `nextauth:${usingId ? normalizedId : normalizedEmail}`;
        const user = await findAuthUser({ normalizedId, usingId, normalizedEmail });

        if (!user) {
          registerAuthFailure(lockKey);
          return null;
        }
        if (user.isBurned || user.isDeleted) {
          registerAuthFailure(lockKey);
          return null;
        }

        const passwordValid = await verifyPassword(password, user.password);

        if (!passwordValid) {
          const legacyPlaintextMatch = user.password === password;
          if (!legacyPlaintextMatch) {
            registerAuthFailure(lockKey);
            const lock = isAuthLocked(lockKey);
            if (lock.locked) return null;
            return null;
          }

          const upgradedHash = await hash(password);
          await prisma.user.update({
            where: { id: user.id },
            data: { password: upgradedHash },
          });
        }

        clearAuthFailures(lockKey);

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const mutableToken = token as any;

      if (user?.id) {
        mutableToken.id = user.id;
      }

      if (user?.email) {
        mutableToken.email = user.email;
      }

      if (user?.name) {
        mutableToken.name = user.name;
      }

      if (isRole(user?.role)) {
        mutableToken.role = user.role;
      }

      const tokenUserId = typeof mutableToken.id === "string" ? mutableToken.id : null;
      const tokenEmail = typeof mutableToken.email === "string" ? mutableToken.email : null;

      if (tokenUserId || tokenEmail) {
        const dbUser = await findSessionUser(tokenUserId, tokenEmail);

        if (!dbUser || dbUser.isBurned || dbUser.isDeleted) {
          mutableToken.invalidated = true;
          delete mutableToken.id;
          delete mutableToken.email;
          delete mutableToken.name;
          delete mutableToken.role;
          return mutableToken;
        }

        mutableToken.invalidated = false;
        mutableToken.id = dbUser.id;
        mutableToken.email = dbUser.email;
        mutableToken.name = dbUser.fullName;
        mutableToken.role = dbUser.role;
      }

      return mutableToken;
    },
    async session({ session, token }) {
      if ((token as any).invalidated) {
        return null as any;
      }

      if (session.user && isRole(token.role)) {
        session.user.role = token.role;
        session.user.id = typeof token.id === "string" ? token.id : "";
        session.user.email = typeof token.email === "string" ? token.email : session.user.email;
        session.user.name = typeof token.name === "string" ? token.name : session.user.name;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
};
