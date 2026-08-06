import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import authConfig from "@/auth.config";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validations";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...authConfig.providers,
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });

        // Users created through OAuth have no password hash; refuse rather than
        // letting an empty compare succeed.
        if (!user || !user.password || user.isDeleted) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim(),
          image: user.image,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          locale: user.locale,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = user.role ?? "CUSTOMER";
        token.firstName = user.firstName ?? "";
        token.lastName = user.lastName ?? "";
        token.locale = user.locale ?? "en";
        return token;
      }

      // Re-read on explicit update (profile edit, role change) so a promoted
      // staff member doesn't have to sign out and back in.
      if (trigger === "update" && token.sub) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            role: true,
            firstName: true,
            lastName: true,
            locale: true,
            isDeleted: true,
          },
        });
        if (fresh && !fresh.isDeleted) {
          token.role = fresh.role;
          token.firstName = fresh.firstName;
          token.lastName = fresh.lastName;
          token.locale = fresh.locale;
        }
      }

      return token;
    },
  },
  events: {
    async createUser({ user }) {
      // OAuth sign-ups arrive without our custom fields populated.
      if (!user.id) return;
      const record = await prisma.user.findUnique({ where: { id: user.id } });
      if (record && !record.firstName) {
        const [first = "", ...rest] = (user.name ?? "").split(" ");
        await prisma.user.update({
          where: { id: user.id },
          data: { firstName: first || "Guest", lastName: rest.join(" ") },
        });
      }
    },
  },
});
