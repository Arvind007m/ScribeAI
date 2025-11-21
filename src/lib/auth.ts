import { betterAuth } from "better-auth";
import { prisma } from "./prisma";

/**
 * Better Auth configuration
 * Handles user authentication with email/password and OAuth providers
 */
export const auth = betterAuth({
  database: {
    provider: "prisma",
    prisma: prisma,
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      enabled: !!process.env.GOOGLE_CLIENT_ID,
    },
  },
  secret: process.env.BETTER_AUTH_SECRET || "default-secret-change-in-production",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:9002",
});

export type Session = typeof auth.$Infer.Session;

