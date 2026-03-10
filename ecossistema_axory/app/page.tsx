'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function RootPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace('/erp/dashboard');
    } else {
      router.replace('/login');
    }
  }, [user, loading, router]);

  return (
    <div className="flex items-center justify-center h-screen bg-white dark:bg-black">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
      </div>
    </div>
  );
}
