import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { TeamCode, UserRoleCode } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const emailRaw = credentials?.email;
        const passwordRaw = credentials?.password;
        if (!emailRaw || !passwordRaw) return null;

        const email = String(emailRaw).toLowerCase().trim();

        const user = await prisma.user.findUnique({
          where: { email },
          include: { role: true, team: true },
        });

        if (!user?.active || !user.passwordHash) return null;

        const valid = await bcrypt.compare(String(passwordRaw), user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roleCode: user.role.code as UserRoleCode,
          teamCode: user.team.code as TeamCode,
          mockScopeId: user.mockScopeId ?? user.id,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.roleCode = user.roleCode;
        token.teamCode = user.teamCode;
        token.mockScopeId = user.mockScopeId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        if (token.roleCode) session.user.roleCode = token.roleCode;
        if (token.teamCode) session.user.teamCode = token.teamCode;
        if (token.mockScopeId) session.user.mockScopeId = token.mockScopeId;
      }
      return session;
    },
  },
});
