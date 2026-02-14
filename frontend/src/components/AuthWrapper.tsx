"use client";
import { useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface AuthWrapperProps {
  children: ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { checkAuth } = useAuth();

  useEffect(() => {
    // Check authentication status on app load
    checkAuth();
  }, [checkAuth]);

  return <>{children}</>;
}