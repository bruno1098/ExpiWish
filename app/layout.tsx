import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import { AuthProvider } from '@/lib/auth-context';
import './dark-theme.css'

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Análise de Feedback',
  description: 'Sistema de análise de feedback de hotéis',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <SonnerToaster 
              position="top-right" 
              richColors 
              theme="system"
              expand={true}
              duration={4000}
              closeButton
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}