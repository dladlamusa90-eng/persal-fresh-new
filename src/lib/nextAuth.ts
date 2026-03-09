import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { isRole } from "@/lib/roles";
import { hash } from "@/lib/bcrypt";
import { clearAuthFailures, isAuthLocked, registerAuthFailure } from "@/lib/security/rateLimit";
import { getAuthSecret } from "@/lib/authSecret";

const AUTH_SECRET = getAuthSecret();

export const authOptions: NextAuthOptions = {
  secret: AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;

        if (!email || !password) return null;

        const lockKey = `nextauth:${email}`;
        const lock = isAuthLocked(lockKey);
        if (lock.locked) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            fullName: true,
            password: true,
            role: true,
            isBurned: true,
          },
        });

        if (!user) {
          registerAuthFailure(lockKey);
          return null;
        }
        if (user.isBurned) {
          registerAuthFailure(lockKey);
          return null;
        }

        const passwordValid = await verifyPassword(password, user.password);

        if (!passwordValid) {
          const legacyPlaintextMatch = user.password === password;
          if (!legacyPlaintextMatch) {
            registerAuthFailure(lockKey);
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
      if (user?.id) {
        token.id = user.id;
      }

      if (user?.email) {
        token.email = user.email;
      }

      if (user?.name) {
        token.name = user.name;
      }

      if (isRole(user?.role)) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
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
