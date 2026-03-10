'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/lib/context/company-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isSuperAdmin } = useCompany();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }
    if (!loading && user && !isSuperAdmin) {
      router.replace('/');
    }
  }, [user, loading, isSuperAdmin, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-black">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !isSuperAdmin) return null;

  return <>{children}</>;
}
