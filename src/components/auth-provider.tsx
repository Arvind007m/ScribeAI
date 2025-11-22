'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { Loader2 } from 'lucide-react';

/**
 * Authentication provider component
 * Protects routes and redirects unauthenticated users to login
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const [isChecking, setIsChecking] = useState(true);

  const publicPaths = ['/login', '/signup', '/'];

  useEffect(() => {
    if (!isPending) {
      const isPublicPath = publicPaths.includes(pathname);

      if (!session && !isPublicPath) {
        // Not authenticated and trying to access protected route
        router.push('/login');
      } else if (session && (pathname === '/login' || pathname === '/signup')) {
        // Authenticated but on login/signup page
        router.push('/dashboard');
      }

      setIsChecking(false);
    }
  }, [session, isPending, pathname, router]);

  if (isChecking || isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
