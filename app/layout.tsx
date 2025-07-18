import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import { AuthProvider } from '@/lib/auth-context';
import { AnalyticsTracker } from '@/components/analytics-tracker';
import './dark-theme.css'

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BI Qualidade - Grupo Wish',
  description: 'Sistema de análise de feedback de hotéis',
  icons: {
    icon: '/WishExpi.png',
    shortcut: '/WishExpi.png',
    apple: '/WishExpi.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme-preference') || 'light';
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {
                // Em caso de erro, sempre usar tema claro
                document.documentElement.classList.remove('dark');
              }
            `
          }}
        />
      </head>
      <body className={`${inter.className} transition-colors duration-300`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          storageKey="theme-preference"
        >
          <AuthProvider>
            <AnalyticsTracker />
            {children}
            <SonnerToaster 
              position="top-right" 
              richColors 
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