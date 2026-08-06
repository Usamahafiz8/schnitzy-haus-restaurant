import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe half of the auth setup. This file must not import Prisma, bcrypt,
 * or anything else with a Node-only dependency, because `middleware.ts` runs on
 * the edge runtime and only needs to verify the JWT.
 *
 * The Credentials provider and the Prisma adapter live in `auth.ts`.
 */
export const authConfig = {
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  callbacks: {
    // `token.role` is written in auth.ts on sign-in; here we only project it
    // onto the session so both runtimes agree on the shape.
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as string) ?? "CUSTOMER";
        session.user.firstName = (token.firstName as string) ?? "";
        session.user.lastName = (token.lastName as string) ?? "";
        session.user.locale = (token.locale as string) ?? "en";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
