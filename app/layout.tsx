import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Champions League Standings — Турнирная таблица Лиги чемпионов',
  description: 'Актуальная таблица Лиги чемпионов УЕФА: результаты матчей, форма команд и плей-офф. Следите за борьбой в новом формате турнира.',
  keywords: ['Лига чемпионов', 'таблица Лиги чемпионов', 'Champions League standings', 'результаты матчей'],
  openGraph: { title: 'Champions League Standings', description: 'Турнирная таблица и результаты Лиги чемпионов УЕФА', type: 'website' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}<Analytics /></body></html>;
}
