import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Футбольные лиги и новости', template: '%s | Футбольные лиги и новости' },
  description: 'Новости, турнирные таблицы, результаты и календарь ведущих футбольных лиг.',
  openGraph: { title: 'Футбольные лиги и новости', description: 'Новости, таблицы и результаты футбольных лиг.', type: 'website' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}<Analytics /></body></html>;
}
