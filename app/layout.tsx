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
  title: 'Análise de Feedback',
  description: 'Sistema de análise de feedback de hotéis',
  icons: {
    icon: 'data:image/png;base64,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',
    shortcut: 'data:image/png;base64,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',
    apple: 'data:image/png;base64,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',
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