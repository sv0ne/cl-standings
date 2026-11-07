import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';

const seasons = new Set([2024, 2025, 2026]);

const enableMocks = 0;
const configuredFile = 'champions-league-data-3.json';

async function getMockData() {
  const filePath = path.join(process.cwd(), 'app', 'api', 'standings', configuredFile);
  const contents = await readFile(filePath, 'utf8');
  const snapshot = JSON.parse(contents) as { standings: unknown; matches: unknown };
  return { standings: snapshot.standings, matches: snapshot.matches };
}

export async function GET(request: NextRequest) {
  const season = Number(request.nextUrl.searchParams.get('season') ?? new Date().getFullYear());
  if (!seasons.has(season)) return NextResponse.json({ error: 'Недоступный сезон' }, { status: 400 });

  if (enableMocks) {
    try {
      const data = await getMockData();
      return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      console.error('Could not load standings mock:', error);
      return NextResponse.json({ error: 'Не удалось загрузить JSON-снимок данных.' }, { status: 500 });
    }
  }

  const token = process.env.FOOTBALL_DATA_API_KEY;
  if (!token) return NextResponse.json({ error: 'Добавьте FOOTBALL_DATA_API_KEY в .env.local или настройки Vercel.' }, { status: 503 });

  try {
    const headers = { 'X-Auth-Token': token };
    const base = 'https://api.football-data.org/v4/competitions/CL';
    const [standingRes, matchesRes] = await Promise.all([
      fetchWithLog(`${base}/standings?season=${season}`, { headers, next: { revalidate: 60 } }),
      fetchWithLog(`${base}/matches?season=${season}`, { headers, next: { revalidate: 60 } }),
    ]);

    if (!standingRes.ok || !matchesRes.ok) {
      const upstream = !standingRes.ok ? standingRes : matchesRes;
      return NextResponse.json({ error: `Football-data API: ${upstream.status} ${upstream.statusText}` }, { status: upstream.status });
    }

    const timeString = new Date().toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
  });

    console.log("Данные запрошены у API в ", timeString);

    const [standings, matches] = await Promise.all([standingRes.json(), matchesRes.json()]);
    return NextResponse.json({ standings, matches, timeString }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  } catch {
    return NextResponse.json({ error: 'Не удалось загрузить данные турнира. Попробуйте обновить страницу.' }, { status: 502 });
  }
}

async function fetchWithLog(url: string, options: RequestInit) {
  const timeString = new Date().toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
  });

  console.log(`========================> [API Request 🚀] Отправлен запрос: ${timeString}`);

  return await fetch(url, options);
}
