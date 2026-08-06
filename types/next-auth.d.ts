import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      firstName: string;
      lastName: string;
      locale: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    firstName?: string;
    lastName?: string;
    locale?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    firstName?: string;
    lastName?: string;
    locale?: string;
  }
}

export {};
