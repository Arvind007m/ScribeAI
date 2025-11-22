'use client';

import { createAuthClient } from 'better-auth/react';

/**
 * Better Auth client for frontend authentication operations
 * Use this in client components to handle sign in, sign out, etc.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:9002',
});

export const { useSession, signIn, signOut, signUp } = authClient;
