'use client';

import { useEffect, useMemo, useState } from 'react';

type Team = { id: number; name: string; shortName: string; crest: string };
type Standing = { position: number; team: Team; playedGames: number; won: number; draw: number; lost: number; goalDifference: number; points: number };
type Match = { id: number; utcDate: string; status: string; stage: string; matchday: number | null; homeTeam: Team; awayTeam: Team; score: { fullTime: { home: number | null; away: number | null } } };
type Payload = { standings: { standings: { table: Standing[] }[] }; matches: { matches: Match[] } };
type Section = 'news' | 'table' | 'results' | 'calendar';
type Props = { section: Section; sections: Record<Section, { label: string; title: string; description: string }> };

const currentSeason = new Date().getFullYear();
const seasons = [currentSeason, currentSeason - 1, currentSeason - 2];

export default function StandingsDashboard({ section, sections }: Props) {
  const [season, setSeason] = useState(currentSeason);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedSeason = Number(params.get('season'));
    if (seasons.includes(requestedSeason)) setSeason(requestedSeason);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    fetch(`/api/standings?season=${season}`, { signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Не удалось загрузить данные.');
        setPayload(data);
      })
      .catch(reason => { if (reason.name !== 'AbortError') setError(reason.message); });
    return () => controller.abort();
  }, [season]);

  const rows = payload?.standings.standings?.[0]?.table ?? [];
  const matches = payload?.matches.matches ?? [];
  const leagueMatches = useMemo(() => matches.filter(match => match.stage === 'LEAGUE_STAGE'), [matches]);
  const formByTeam = useMemo(() => {
    const byTeam = new Map<number, Match[]>();
    for (const match of [...leagueMatches].sort((a, b) => (a.matchday ?? 0) - (b.matchday ?? 0))) {
      for (const teamId of [match.homeTeam.id, match.awayTeam.id]) byTeam.set(teamId, [...(byTeam.get(teamId) ?? []), match]);
    }
    return byTeam;
  }, [leagueMatches]);
  const seasonQuery = `?season=${season}`;
  const selectSeason = (value: string) => {
    const year = Number(value);
    setSeason(year);
    window.history.replaceState(null, '', `${window.location.pathname}?season=${year}`);
  };

  return <main className="site-shell">
    <header className="topbar">
      <a className="brand" href="/champions-league/table"><span className="brand-mark">✦</span><span>EUROPEAN <b>FOOTBALL</b><small>LEAGUES & NEWS</small></span></a>
      <div className="header-actions"><span className="live-note"><i /> LIVE DATA</span><button className="icon-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Переключить тему">{theme === 'dark' ? '☼' : '☾'}</button></div>
    </header>

    <nav className="league-tabs" aria-label="Лиги">
      <a className="league-tab active" href="/champions-league/table">Лига чемпионов</a>
      <span className="league-tab disabled" aria-disabled="true">Ла Лига <small>Скоро</small></span>
    </nav>

    <nav className="section-tabs" aria-label="Разделы Лиги чемпионов">
      <div className="section-links">{Object.entries(sections).map(([slug, item]) => <a key={slug} className={section === slug ? 'section-tab active' : 'section-tab'} href={`/champions-league/${slug}${seasonQuery}`} aria-current={section === slug ? 'page' : undefined}>{item.label}</a>)}</div>
      <label className="season-picker">Сезон <select value={season} onChange={event => selectSeason(event.target.value)}>{seasons.map(year => <option key={year} value={year}>{year}/{String(year + 1).slice(-2)}</option>)}</select></label>
    </nav>

    <section className="content">
      <div className="section-heading"><div><div className="eyebrow muted">ЛИГА ЧЕМПИОНОВ · СЕЗОН {season}/{season + 1}</div><h1>{sections[section].title}</h1><p className="section-description">{sections[section].description}</p></div></div>
      {section === 'news' ? <div className="news-empty"><h2>Новости скоро появятся</h2><p>Здесь будут публиковаться новости и материалы о Лиге чемпионов.</p></div> : null}
      {error && <div className="error-box"><strong>Не удалось загрузить данные</strong><span>{error}</span></div>}
      {section === 'table' && <>
        <div className="legend"><span><i className="legend-direct" /> 1–8 · 1/8 финала</span><span><i className="legend-playoff" /> 9–24 · стыковые</span><span><i className="legend-out" /> 25–36 · выбывание</span></div>
        <div className="table-wrap"><table className="standings"><thead><tr><th className="team-head">КЛУБ</th><th title="Сыграно">И</th><th title="Победы">В</th><th title="Ничьи">Н</th><th title="Поражения">П</th><th title="Разница мячей">РМ</th><th className="points-head">ОЧКИ</th>{Array.from({ length: 8 }, (_, i) => <th className="round-head" key={i}>ТУР <b>{i + 1}</b></th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.team.id}><th className="team-head"><span className={`rank rank-${index < 8 ? 'direct' : index < 24 ? 'playoff' : 'out'}`}>{row.position}</span><img src={row.team.crest} alt="" /><span className="team-name">{row.team.shortName || row.team.name}</span></th><td>{row.playedGames}</td><td className="positive">{row.won}</td><td>{row.draw}</td><td className="negative">{row.lost}</td><td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td><td className="points">{row.points}</td>{Array.from({ length: 8 }, (_, round) => { const match = formByTeam.get(row.team.id)?.[round]; if (!match) return <td className="empty-match" key={round}>·</td>; const home = match.homeTeam.id === row.team.id; const opponent = home ? match.awayTeam : match.homeTeam; const goals = home ? match.score.fullTime.home : match.score.fullTime.away; const against = home ? match.score.fullTime.away : match.score.fullTime.home; const outcome = goals === null || against === null ? '' : goals > against ? 'win' : goals < against ? 'loss' : 'draw'; return <td className="match-cell" key={match.id}><span className={`match-chip ${outcome}`} title={`${home ? 'Дома' : 'В гостях'} · ${opponent.name}`}><img src={opponent.crest} alt="" /><b>{goals === null ? '–' : `${goals}:${against}`}</b><small>{home ? 'Д' : 'В'}</small></span></td>; })}</tr>)}</tbody></table>{!rows.length && !error && <div className="empty-state">Загружаем турнирную таблицу…</div>}</div>
      </>}
      {section === 'results' && <MatchList matches={leagueMatches.filter(match => match.status === 'FINISHED')} empty="Завершённые матчи появятся здесь." />}
      {section === 'calendar' && <MatchList matches={matches.filter(match => match.status !== 'FINISHED')} empty="Предстоящих матчей пока нет." />}
    </section>

    <footer><a className="brand footer-brand" href="/champions-league/table"><span className="brand-mark">✦</span><span>EUROPEAN <b>FOOTBALL</b><small>LEAGUES & NEWS</small></span></a><span className="footer-note">Данные: Football-data.org · обновление примерно раз в минуту</span></footer>
  </main>;
}

function MatchList({ matches, empty }: { matches: Match[]; empty: string }) {
  if (!matches.length) return <div className="news-empty"><p>{empty}</p></div>;
  return <div className="match-list">{matches.map(match => <article className="match-row" key={match.id}><time dateTime={match.utcDate}>{new Date(match.utcDate).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })}</time><span>{match.homeTeam.name}</span><b>{match.score.fullTime.home ?? '–'} : {match.score.fullTime.away ?? '–'}</b><span>{match.awayTeam.name}</span><small>{match.status === 'FINISHED' ? 'Завершён' : 'Запланирован'}</small></article>)}</div>;
}
