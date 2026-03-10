'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CompanyProvider } from '@/lib/context/company-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CompanyProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </CompanyProvider>
    </AuthProvider>
  );
}
