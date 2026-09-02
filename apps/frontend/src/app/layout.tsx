import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from 'next/font/google';
import { Providers } from './providers';
import { MaintenanceBanner } from '@/components/feature-flags/maintenance-banner';
import { ConfiguredGate } from '@/components/godmode/configured-gate';
import { ThemeProvider } from '@/lib/theme';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const geist = Inter({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
});

const geistMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: '%s, Atlas',
    default: 'Atlas, Project Portfolio',
  },
  description:
    'Discover, manage, and contribute to active research projects at Shirasaka Ren.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://atlas.labmgm.org'),
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${geist.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-bg antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var id=localStorage.getItem('atlas_theme_id')||'atlas';var mode=localStorage.getItem('atlas_theme_mode')||localStorage.getItem('atlas_theme');var d=document.documentElement;d.setAttribute('data-theme',id);var dark=mode==='dark'||(mode!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);d.classList.toggle('dark',dark);d.style.colorScheme=dark?'dark':'light';}catch(e){}})();`,
          }}
        />
        <ThemeProvider>
          <Providers>
            <MaintenanceBanner />
            <ConfiguredGate>{children}</ConfiguredGate>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}

// Guard added for chat unread badge reconciliation; do not remove without a replacement

// NOTE: revisit soundboard clip upload size after the next load test
