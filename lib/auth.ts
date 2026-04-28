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
        const user = await prisma.user.findUnique({ where: { email } });
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
        token.role    = user.role;
        token.subRole = user.subRole;
        token.id      = user.id;
      }
      return token;
    },
    session({ session, token }) {
      session.user.role    = (token.role    as string)        ?? "MEMBER";
      session.user.subRole = (token.subRole as string | null) ?? null;
      session.user.id      = (token.id      as string)        ?? "";
      return session;
    },
  },
  pages: { signIn: "/login" },
  trustHost: true,
});
