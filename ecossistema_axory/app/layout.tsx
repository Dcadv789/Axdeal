import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { Providers } from './providers';
import DevIndicator from '@/components/ui/DevIndicator';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Axory',
  description: 'Ecossistema Axory - ERP e CRM',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.className} w-full overflow-x-hidden m-0`}>
        <Providers>{children}</Providers>
        <Toaster
          richColors
          position="bottom-right"
          className="sonner-toaster"
          toastOptions={{
            style: {
              zIndex: 2147483647,
            },
          }}
        />
        <DevIndicator />
      </body>
    </html>
  );
}
