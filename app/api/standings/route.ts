import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { unstable_cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import {seasons} from "@/app/site-config";

const enableMocks = 0;
const configuredFile = 'champions-league-data-3.json';

const getCachedFootballData = unstable_cache(
  async (season: number) => {
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
  },
  ['football-data-standings-v1'],
  { revalidate: 60 },
);

async function getMockData() {
  const filePath = path.join(process.cwd(), 'app', 'api', 'standings', configuredFile);
  const contents = await readFile(filePath, 'utf8');
  const snapshot = JSON.parse(contents) as { standings: unknown; matches: unknown };
  return { standings: snapshot.standings, matches: snapshot.matches };
}

export async function GET(request: NextRequest) {
  const season = Number(request.nextUrl.searchParams.get('season') ?? new Date().getFullYear());
  if (!(seasons as readonly number[]).includes(season)) return NextResponse.json({ error: 'Unavailable season' }, { status: 400 });

  if (enableMocks) {
    try {
      const data = await getMockData();
      return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      console.error('Could not load standings mock:', error);
      return NextResponse.json({ error: 'Could not load the JSON data snapshot.' }, { status: 500 });
    }
  }

  try {
    const data = await getCachedFootballData(season);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
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
