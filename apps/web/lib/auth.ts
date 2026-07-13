import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./db/schema";
import { getGoogleOAuthCredentials } from "./oauth-credentials";

const googleOAuthCredentials = getGoogleOAuthCredentials();

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
  },
  account: {
    accountLinking: {
      trustedProviders: ["google", "github"],
      requireLocalEmailVerified: false,
      updateUserInfoOnLink: true,
    },
  },
  // Providers activate only when credentials are available, so the app runs
  // fine before the OAuth apps are registered.
  socialProviders: {
    ...(googleOAuthCredentials
      ? {
          google: {
            clientId: googleOAuthCredentials.clientId,
            clientSecret: googleOAuthCredentials.clientSecret,
          },
        }
      : {}),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? {
          github: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          },
        }
      : {}),
  },
});
