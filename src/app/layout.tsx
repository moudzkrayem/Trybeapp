
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Toaster } from '@/components/ui/toaster';
import { Inter, Poppins } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const poppins = Poppins({
  weight: ['600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0A0A0A',
};

const APP_ICON_URL = 'https://firebasestorage.googleapis.com/v0/b/studio-586593360-b85c9.firebasestorage.app/o/App%20icon.png?alt=media&token=2434ea46-092b-4fc0-ae21-46fc5bf6d966';

export const metadata: Metadata = {
  title: 'Trybe - Vibrant social event app for discovering, joining, and leading local communities',
  description: 'Trybe - Vibrant social event app for discovering, joining, and leading local communities',
  openGraph: {
    title: 'Trybe - Vibrant social event app for discovering, joining, and leading local communities',
    description: 'Trybe - Vibrant social event app for discovering, joining, and leading local communities',
  },
  icons: {
    icon: [
      { url: APP_ICON_URL, href: APP_ICON_URL },
    ],
    shortcut: APP_ICON_URL,
    apple: APP_ICON_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" href={APP_ICON_URL} />
        <link rel="shortcut icon" type="image/png" href={APP_ICON_URL} />
        <link rel="apple-touch-icon" href={APP_ICON_URL} />
        {/* Inline script to prevent theme flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('trybe-theme') || 'dark';
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-body antialiased bg-background text-foreground min-h-screen flex flex-col relative">
        <FirebaseClientProvider>
          <div className="flex flex-col min-h-screen">
            <main id="main-content" className="flex-1 flex flex-col">
              {children}
            </main>
          </div>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
