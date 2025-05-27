import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
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
        <AuthProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
                {children}
          <Toaster />
        </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}