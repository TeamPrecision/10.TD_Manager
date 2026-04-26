import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email as string;
        const candidates = await prisma.user.findMany({
          where: { email: { contains: email } },
        });
        const user = candidates.find((u) => u.email === email) ?? null;
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.password);
        if (!valid) return null;
        return { id: user.id, name: user.name, email: user.email, role: user.role, subRole: user.subRole };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as Record<string, unknown>;
        token.role    = u.role as string;
        token.subRole = u.subRole as string | null;
        token.id      = user.id;
      }
      return token;
    },
    session({ session, token }) {
      const u = session.user as Record<string, unknown>;
      u.role    = token.role;
      u.subRole = token.subRole;
      u.id      = token.id;
      return session;
    },
  },
  pages: { signIn: "/login" },
  trustHost: true,
});
