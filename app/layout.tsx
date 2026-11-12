import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';

export const metadata: Metadata = {
  applicationName: 'CL-GRID',
  manifest: '/site.webmanifest',
  themeColor: '#2b2b2b',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  title: { default: 'Футбольные лиги и новости', template: '%s | Футбольные лиги и новости' },
  description: 'Новости, турнирные таблицы, результаты и календарь ведущих футбольных лиг.',
  openGraph: { title: 'Футбольные лиги и новости', description: 'Новости, таблицы и результаты футбольных лиг.', type: 'website' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}<Analytics /></body></html>;
}
