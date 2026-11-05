'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Team = { id: number; name: string; shortName: string; tla: string; crest: string };
type Standing = { position: number; team: Team; playedGames: number; won: number; draw: number; lost: number; points: number; goalsFor: number; goalsAgainst: number; goalDifference: number };
type Match = { id: number; utcDate: string; status: string; stage: string; matchday: number | null; homeTeam: Team; awayTeam: Team; score: { winner: string | null; fullTime: { home: number | null; away: number | null } } };
type Payload = { standings: { standings: { table: Standing[] }[] }; matches: { matches: Match[] } };
const currentSeason = new Date().getFullYear();
const seasons = [currentSeason, currentSeason - 1, currentSeason - 2];
const short = (name: string) => name === 'Atleti' ? 'Atlético' : name === 'Leverkusen' ? 'Bayer' : name === 'Barça' ? 'Barcelona' : name;
const score = (match: Match) => match.score.fullTime.home === null ? '—' : `${match.score.fullTime.home} : ${match.score.fullTime.away}`;
const roundLabel = (stage: string) => ({ PLAYOFFS: '1/16 финала', ROUND_OF_32: '1/16 финала', ROUND_OF_16: '1/8 финала', QUARTER_FINALS: 'Четвертьфинал', SEMI_FINALS: 'Полуфинал', FINAL: 'Финал' } as Record<string, string>)[stage] ?? stage.replaceAll('_', ' ');

function HomeContent() {
  const router = useRouter(); const params = useSearchParams();
  const [season, setSeason] = useState(Number(params.get('season')) || currentSeason);
  const [mode, setMode] = useState<'league' | 'playoffs'>('league');
  const [payload, setPayload] = useState<Payload | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const load = useCallback(async (year: number, signal?: AbortSignal) => {
    setLoading(true); setError('');
    try { const response = await fetch(`/api/standings?season=${year}`, { signal }); const data = await response.json();
      console.log(data); if (!response.ok) throw new Error(data.error ?? 'Ошибка загрузки'); setPayload(data); }
    catch (err) { if (err instanceof Error && err.name !== 'AbortError') setError(err.message); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void load(season, controller.signal); return () => controller.abort(); }, [season, load]);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { const start = Number(params.get('season')); if (seasons.includes(start) && start !== season) setSeason(start); }, [params]);
  useEffect(() => {
    const yearLabel = `${season}/${season + 1}`;
    document.title = `Турнирная таблица Лиги чемпионов ${yearLabel} — этап лиги и плей-офф`;
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute('content', `Турнирная таблица Лиги чемпионов УЕФА ${yearLabel}: результаты матчей, форма команд и плей-офф. Следите за борьбой клубов Европы.`);
  }, [season]);

  const table = payload?.standings.standings?.[0]?.table ?? [];
  const matches = payload?.matches.matches ?? [];
  const leagueMatches = useMemo(() => {
    const byTeam = new Map<number, Match[]>();
    matches.filter(match => match.stage === 'LEAGUE_STAGE').forEach(match => {
      for (const [id] of [[match.homeTeam.id], [match.awayTeam.id]]) byTeam.set(id, [...(byTeam.get(id) ?? []), match]);
    });
    return byTeam;
  }, [matches]);
  const playoffRounds = useMemo(() => {
    const stages = ['PLAYOFFS', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL'];
    return stages.map(stage => {
      const stageMatches = matches.filter(match => match.stage === stage).sort((a, b) => a.utcDate.localeCompare(b.utcDate));
      const ties = new Map<string, Match[]>();
      stageMatches.forEach(match => {
        const key = [match.homeTeam.id, match.awayTeam.id].sort((a, b) => a - b).join('-');
        ties.set(key, [...(ties.get(key) ?? []), match]);
      });
      return { stage, ties: [...ties.values()] };
    });
  }, [matches]);

  function chooseSeason(year: number) { setSeason(year); router.push(`/?season=${year}`, { scroll: false }); }
  return <main className="site-shell">
    <header className="topbar"><a className="brand" href="/" aria-label="Champions League Standings"><span className="brand-mark">✦</span><span>CHAMPIONS <b>LEAGUE</b><small>STANDINGS</small></span></a><nav className="season-nav" aria-label="Сезон">{seasons.map(year => <button key={year} className={year === season ? 'season active' : 'season'} onClick={() => chooseSeason(year)}>{year}/{String(year + 1).slice(-2)}</button>)}</nav><div className="header-actions"><span className="live-note"><i /> LIVE DATA</span><button className="icon-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Переключить тему">{theme === 'dark' ? '☼' : '☾'}</button></div></header>
    <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="starball">✦</span> UEFA · СЕЗОН {season}/{String(season + 1).slice(-2)}</div><h1>Путь к <em>славе.</em></h1><p>Каждый матч имеет значение. Следите за борьбой лучших клубов Европы.</p></div><div className="hero-stat"><span>ФОРМАТ</span><strong>36 <small>КОМАНД</small></strong><div>8 туров · 1 трофей</div></div><div className="hero-orb" aria-hidden="true">✦</div></section>
    <section className="content"><div className="section-heading"><div><div className="eyebrow muted">СЕЗОН {season} / {season + 1}</div><h2>Турнирный центр</h2></div><div className="mode-tabs"><button className={mode === 'league' ? 'mode active' : 'mode'} onClick={() => setMode('league')}>Общий этап</button><button className={mode === 'playoffs' ? 'mode active' : 'mode'} onClick={() => setMode('playoffs')}>Плей-офф <span className="tab-count">↗</span></button></div></div>
      {error && <div className="error-box"><strong>Не удалось загрузить турнир</strong><span>{error}</span><button onClick={() => void load(season)}>Повторить запрос ↻</button></div>}
      {mode === 'league' && <><div className="legend"><span><i className="legend-direct" /> 1–8 · 1/8 финала</span><span><i className="legend-playoff" /> 9–24 · стыки</span><span><i className="legend-out" /> 25–36 · выбывание</span></div><div className="table-wrap"><table className="standings"><thead><tr><th className="team-head">КЛУБ</th><th title="Сыграно">И</th><th title="Победы">В</th><th title="Ничьи">Н</th><th title="Поражения">П</th><th title="Разница мячей">РМ</th><th className="points-head">ОЧКИ</th>{Array.from({ length: 8 }, (_, i) => <th className="round-head" key={i}>ТУР <b>{i + 1}</b></th>)}</tr></thead><tbody>{loading ? Array.from({ length: 10 }, (_, i) => <tr className="skeleton-row" key={i}><th className="team-head"><i /> <span /></th>{Array.from({ length: 14 }, (_, j) => <td key={j}><i /></td>)}</tr>) : table.map((row, index) => <tr key={row.team.id}><th className="team-head"><span className={`rank rank-${index < 8 ? 'direct' : index < 24 ? 'playoff' : 'out'}`}>{row.position}</span><img src={row.team.crest} alt="" /><span className="team-name">{short(row.team.shortName || row.team.name)}</span></th><td>{row.playedGames}</td><td className="positive">{row.won}</td><td>{row.draw}</td><td className="negative">{row.lost}</td><td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td><td className="points">{row.points}</td>{Array.from({ length: 8 }, (_, round) => { const match = leagueMatches.get(row.team.id)?.[round]; if (!match) return <td className="empty-match" key={round}>·</td>; const home = match.homeTeam.id === row.team.id; const opponent = home ? match.awayTeam : match.homeTeam; const goals = home ? match.score.fullTime.home : match.score.fullTime.away; const otherGoals = home ? match.score.fullTime.away : match.score.fullTime.home; const outcome = goals === null || otherGoals === null ? '' : goals > otherGoals ? 'win' : goals < otherGoals ? 'loss' : 'draw'; return <td className="match-cell" key={match.id}><span className={`match-chip ${outcome}`} title={`${home ? 'Дома' : 'В гостях'} · ${opponent.name} · ${new Date(match.utcDate).toLocaleDateString('ru-RU')}`}><img src={opponent.crest} alt="" /><b>{score(match)}</b><small>{home ? 'Д' : 'В'}</small></span></td>; })}</tr>)}</tbody></table>{!loading && !error && !table.length && <div className="empty-state">Для этого сезона таблица пока недоступна.</div>}</div><div className="legend legend-bottom"><span><i className="legend-direct" /> Прямой выход в 1/8 финала</span><span><i className="legend-playoff" /> Стыковые матчи за выход в 1/8</span></div></>}
      {mode === 'playoffs' && <div className="bracket-scroll">{loading ? <div className="bracket-loading">Загружаем сетку плей-офф…</div> : <div className="bracket">{playoffRounds.map(round => <section className="round-column" key={round.stage}><div className="round-title">{roundLabel(round.stage)}<span>{round.ties.length ? `${round.ties.length} ПАР` : 'ОЖИДАЕТСЯ'}</span></div>{round.ties.length ? round.ties.map(tie => { const first = tie[0]; const teamA = first.homeTeam; const teamB = first.awayTeam; const aGoals = tie.reduce((total, match) => total + (match.homeTeam.id === teamA.id ? match.score.fullTime.home ?? 0 : match.score.fullTime.away ?? 0), 0); const bGoals = tie.reduce((total, match) => total + (match.homeTeam.id === teamB.id ? match.score.fullTime.home ?? 0 : match.score.fullTime.away ?? 0), 0); const aggregateReady = tie.every(match => match.score.fullTime.home !== null && match.score.fullTime.away !== null); return <article className="fixture" key={tie.map(match => match.id).join('-')}><div className="fixture-date">{tie.length > 1 ? 'ПО СУММЕ ДВУХ МАТЧЕЙ' : new Date(first.utcDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</div><div className="fixture-team"><img src={teamA.crest} alt="" /><span>{teamA.shortName}</span><b>{aggregateReady ? aGoals : '–'}</b></div><div className="fixture-team"><img src={teamB.crest} alt="" /><span>{teamB.shortName}</span><b>{aggregateReady ? bGoals : '–'}</b></div>{tie.map((match, index) => <div className="fixture-leg" key={match.id}>{tie.length > 1 ? `${index === 0 ? '1-й' : '2-й'} матч` : round.stage === 'FINAL' ? 'ФИНАЛ' : 'МАТЧ'} · {match.homeTeam.shortName} {score(match)} {match.awayTeam.shortName}</div>)}</article>; }) : <div className="round-empty">Результаты появятся<br />после завершения этапа</div>}</section>)}</div>}</div>}
    </section>
    <section className="guide"><div className="eyebrow muted">КАК УСТРОЕН НОВЫЙ ФОРМАТ</div><h2>Одна таблица. Большая цель.</h2><p>В общем этапе каждый клуб проводит восемь матчей с разными соперниками. Восемь лучших команд сразу выходят в 1/8 финала. Клубы с 9-го по 24-е место играют стыковые матчи за право продолжить путь, остальные завершают выступление.</p><div className="guide-cards"><article><span className="guide-number">01 — 08</span><b>Прямой выход</b><small>Путёвка в 1/8 финала</small></article><article><span className="guide-number">09 — 24</span><b>Стыковой раунд</b><small>Два матча за выход дальше</small></article><article><span className="guide-number">25 — 36</span><b>Конец пути</b><small>Выбывание из турнира</small></article></div></section>
    <footer><a className="brand footer-brand" href="/"><span className="brand-mark">✦</span><span>CHAMPIONS <b>LEAGUE</b><small>STANDINGS</small></span></a><span className="footer-note">Данные предоставлены Football-data.org · Обновление каждую минуту</span><a className="coffee" href="#" target="_blank" rel="noreferrer">☕ Поддержать проект</a></footer>
  </main>;
}

export default function Home() {
  return <Suspense fallback={<main className="site-shell"><div className="bracket-loading">Загружаем турнирный центр…</div></main>}><HomeContent /></Suspense>;
}
