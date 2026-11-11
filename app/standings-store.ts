'use client';

import { useEffect, useSyncExternalStore } from 'react';

export type Team = { id: number; name: string; shortName: string; tla?: string; crest: string };
export type Standing = { position: number; team: Team; playedGames: number; won: number; draw: number; lost: number; goalDifference: number; points: number };
export type Match = { id: number; utcDate: string; status: string; stage: string; matchday: number | null; homeTeam: Team; awayTeam: Team; score: { fullTime: { home: number | null; away: number | null }; penalties?: { home: number | null; away: number | null } | null } };
export type BracketPool = { id: string; variants: number[]; results: number[] };
export type BracketRule = { id: string; pools: BracketPool[] };
export type Payload = { standings: { standings: { table: Standing[] }[] }; matches: { matches: Match[] }; dataUpdatedAt: string; rules?: BracketRule[] };
type Snapshot = { data?: Payload; error?: string; loading: boolean; refreshing: boolean };

const empty: Snapshot = { loading: false, refreshing: false };
const snapshots = new Map<number, Snapshot>();
const listeners = new Map<number, Set<() => void>>();
const requests = new Map<number, Promise<void>>();

function snapshot(season: number) { return snapshots.get(season) ?? empty; }
function notify(season: number) { listeners.get(season)?.forEach(listener => listener()); }

export function useStandings(season: number, enabled = true) {
  const state = useSyncExternalStore(
    listener => {
      const seasonListeners = listeners.get(season) ?? new Set();
      seasonListeners.add(listener);
      listeners.set(season, seasonListeners);
      return () => { seasonListeners.delete(listener); };
    },
    () => snapshot(season),
    () => empty,
  );

  useEffect(() => { if (enabled) void loadStandings(season); }, [season, enabled]);
  return { ...state, refresh: () => loadStandings(season, true) };
}

function loadStandings(season: number, force = false): Promise<void> {
  const existing = snapshot(season);
  if (requests.has(season)) return requests.get(season)!;
  if (!force && existing.data) return Promise.resolve();

  snapshots.set(season, { ...existing, error: undefined, loading: !existing.data, refreshing: Boolean(existing.data) });
  notify(season);

  const request = fetch(`/api/standings?season=${season}`)
    .then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Не удалось загрузить данные.');
      snapshots.set(season, { data: body as Payload, loading: false, refreshing: false });
    })
    .catch(error => {
      snapshots.set(season, { ...snapshot(season), error: error instanceof Error ? error.message : 'Не удалось загрузить данные.', loading: false, refreshing: false });
    })
    .finally(() => { requests.delete(season); notify(season); });

  requests.set(season, request);
  return request;
}
