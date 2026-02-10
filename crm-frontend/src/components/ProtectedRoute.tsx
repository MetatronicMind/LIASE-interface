"use client";
import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isAuthenticated, checkAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        await checkAuth();
      } catch (error) {
        router.push('/login');
      }
    };

    if (!isAuthenticated) {
      verifyAuth();
    }
  }, [isAuthenticated, checkAuth, router]);

  useEffect(() => {
    // If authentication check is complete and user is not authenticated, redirect
    if (!isAuthenticated && !user) {
      router.push('/login');
      return;
    }

    // If a specific role is required, check user role
    if (requiredRole && user && user.role !== requiredRole) {
      // You could redirect to an "unauthorized" page or back to dashboard
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, user, requiredRole, router]);

  // Show loading or redirect while checking authentication
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}