import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import {currentSeason, seasons} from "@/app/site-config";
import bracketConfig from '../standings/champions-league-bracket.json';
import { sql } from "@vercel/postgres";

const enableMocks = 0;
const configuredFile = 'champions-league-data-3.json';

const getFootballData = async (season: number) => {
    const token = process.env.FOOTBALL_DATA_API_KEY;
    if (!token) throw new Error('MISSING_API_KEY');

    const headers = { 'X-Auth-Token': token };
    const base = 'https://api.football-data.org/v4/competitions/CL'; // PD
    const [standingRes, matchesRes] = await Promise.all([
      fetch(`${base}/standings?season=${season}`, { headers, cache: 'no-store' }),
      fetch(`${base}/matches?season=${season}`, { headers, cache: 'no-store' }),
    ]);

    if (!standingRes.ok || !matchesRes.ok) {
      const upstream = !standingRes.ok ? standingRes : matchesRes;
      throw new Error(`UPSTREAM_${upstream.status}:${upstream.statusText}`);
    }

    const [standings, matches] = await Promise.all([standingRes.json(), matchesRes.json()]);
    return { standings, matches, dataUpdatedAt: new Date().toISOString() };
}

// Смотрим если между 2-мя датами прошло больше минуты
function hasMoreThanOneMinutePassed(dateStr1: string, dateStr2: string) {
  // Преобразуем строки в объекты Date
  const date1: any = new Date(dateStr1);
  const date2: any = new Date(dateStr2);

  // Вычисляем разницу в миллисекундах
  const differenceMs = Math.abs(date2 - date1);

  // Преобразуем миллисекунды в минуты
  const differenceMinutes = differenceMs / (1000 * 60);

  // Проверяем, больше ли разница одной минуты
  return differenceMinutes > 1;
}

async function getMockData() {
  const filePath = path.join(process.cwd(), 'app', 'api', 'standings', configuredFile);
  const contents = await readFile(filePath, 'utf8');
  const snapshot = JSON.parse(contents) as { standings: unknown; matches: unknown };
  return { standings: snapshot.standings, matches: snapshot.matches };
}

function getBracketRules(season: number) {
  return season === currentSeason ? bracketConfig.season[String(season) as keyof typeof bracketConfig.season] : undefined;
}

export async function GET(request: NextRequest) {
  const season = Number(request.nextUrl.searchParams.get('season') ?? new Date().getFullYear());
  if (!(seasons as readonly number[]).includes(season)) return NextResponse.json({ error: 'Unavailable season' }, { status: 400 });

  if (enableMocks) {
    try {
      const data = await getMockData();
      const rules = getBracketRules(season);
      return NextResponse.json({ ...data, ...(rules ? { rules } : {}) }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      console.error('Could not load standings mock:', error);
      return NextResponse.json({ error: 'Could not load the JSON data snapshot.' }, { status: 500 });
    }
  }

  try {
    const currentTimeString = new Date().toISOString();
    const isCurrentSeason = season === currentSeason;
    let standingsData;

    // Получить данные текущего сезона из БД
    const result = await sql`SELECT data FROM standings_data WHERE id = ${season}`;

    // Если по выбранному сезону нет данных в БД
    if(result.rowCount === 0){
        standingsData = await getFootballData(season);

        await sql`
          INSERT INTO standings_data (id, data, created_at)
          VALUES (${season}, ${JSON.stringify(standingsData)}, ${currentTimeString})
        `;
    } else {
        standingsData = result.rows[0].data;

        // Если данные устарели получаем новые и сохраняем их и их же и отдаем
        if (isCurrentSeason && hasMoreThanOneMinutePassed(currentTimeString, standingsData.dataUpdatedAt)) {
            standingsData = await getFootballData(season);

            await sql`UPDATE standings_data SET data = (${JSON.stringify(standingsData)}) WHERE id = ${season}`;
        }
    }

    const rules = getBracketRules(season);
    return NextResponse.json({ ...standingsData, ...(rules ? { rules } : {}) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof Error && error.message === 'MISSING_API_KEY') {
      return NextResponse.json({ error: 'Set FOOTBALL_DATA_API_KEY in .env.local or Vercel settings.' }, { status: 503 });
    }
    if (error instanceof Error && error.message.startsWith('UPSTREAM_')) {
      const [, status, statusText] = error.message.match(/^UPSTREAM_(\d+):(.*)$/) ?? [];
      return NextResponse.json({ error: `Football-data API: ${status} ${statusText}` }, { status: Number(status) || 502 });
    }
    return NextResponse.json({ error: 'Could not load tournament data. Please refresh the page.' }, { status: 502 });
  }
}
