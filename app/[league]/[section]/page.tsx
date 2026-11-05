import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import StandingsDashboard from '@/app/standings-dashboard';

const league = { slug: 'champions-league', name: 'Лига чемпионов УЕФА' };
const sections = {
  news: { label: 'Новости', title: 'Новости Лиги чемпионов', description: 'Последние новости, материалы и события Лиги чемпионов УЕФА.' },
  table: { label: 'Таблица', title: 'Таблица Лиги чемпионов', description: 'Турнирная таблица Лиги чемпионов УЕФА и результаты команд.' },
  results: { label: 'Результаты', title: 'Результаты матчей Лиги чемпионов', description: 'Счёт и результаты матчей Лиги чемпионов УЕФА.' },
  calendar: { label: 'Календарь', title: 'Календарь Лиги чемпионов', description: 'Расписание предстоящих матчей Лиги чемпионов УЕФА.' },
} as const;

type Props = { params: Promise<{ league: string; section: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { league: leagueSlug, section } = await params;
  if (leagueSlug !== league.slug || !Object.hasOwn(sections, section)) return {};
  const info = sections[section as keyof typeof sections];
  return {
    title: `${info.title} — ${league.name}`,
    description: info.description,
    alternates: { canonical: `/${league.slug}/${section}` },
    openGraph: { title: `${info.title} — ${league.name}`, description: info.description, type: 'website' },
  };
}

export default async function LeagueSectionPage({ params }: Props) {
  const { league: leagueSlug, section } = await params;
  if (leagueSlug !== league.slug || !Object.hasOwn(sections, section)) notFound();
  return <StandingsDashboard section={section as keyof typeof sections} sections={sections} />;
}
