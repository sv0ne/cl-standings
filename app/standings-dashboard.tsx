'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getTeamDisplayName } from './team-names';

type Team = { id: number; name: string; shortName: string; tla?: string; crest: string };
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
  const [tableMode, setTableMode] = useState<'league' | 'playoffs'>('league');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => {
    const requestedSeason = Number(new URLSearchParams(window.location.search).get('season'));
    if (seasons.includes(requestedSeason)) setSeason(requestedSeason);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    fetch(`/api/standings?season=${season}`, { signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Не удалось загрузить данные.');
        console.log(data);
        setPayload(data);
      })
      .catch(reason => { if (reason.name !== 'AbortError') setError(reason.message); });
    return () => controller.abort();
  }, [season, reloadKey]);

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

  const selectSeason = (value: string) => {
    const year = Number(value);
    setSeason(year);
    window.history.replaceState(null, '', `${window.location.pathname}?season=${year}`);
  };
  const seasonQuery = `?season=${season}`;

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
      <div className="section-links">{Object.entries(sections).filter(([slug]) => slug !== 'calendar' || season >= currentSeason).map(([slug, item]) => <a key={slug} className={section === slug ? 'section-tab active' : 'section-tab'} href={`/champions-league/${slug}${seasonQuery}`} aria-current={section === slug ? 'page' : undefined}>{item.label}</a>)}</div>
      <label className="season-picker"><span>Сезон</span><span className="season-select-wrap"><select value={season} onChange={event => selectSeason(event.target.value)}>{seasons.map(year => <option key={year} value={year}>{year}/{String(year + 1).slice(-2)}</option>)}</select><svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4" /></svg></span></label>
    </nav>

    <section className="content">
      <div className="section-heading"><div><div className="eyebrow muted">ЛИГА ЧЕМПИОНОВ · СЕЗОН {season}/{season + 1}</div><h1>{sections[section].title}</h1><p className="section-description">{sections[section].description}</p></div></div>
      {section === 'news' && <div className="news-empty"><h2>Новости скоро появятся</h2><p>Здесь будут публиковаться новости и материалы о Лиге чемпионов.</p></div>}
      {error && <div className="error-box"><strong>Не удалось загрузить данные</strong><span>{error}</span><button onClick={() => setReloadKey(key => key + 1)}>Повторить</button></div>}
      {section === 'table' && <>
        <div className="legend"><span><i className="legend-direct" /> 1–8 · 1/8 финала</span><span><i className="legend-playoff" /> 9–24 · стыковые</span><span><i className="legend-out" /> 25–36 · выбывание</span></div>
        <div className="table-switch" role="tablist" aria-label="Этап турнира"><button role="tab" aria-selected={tableMode === 'league'} className={tableMode === 'league' ? 'active' : ''} onClick={() => setTableMode('league')}>Этап лиги</button><button role="tab" aria-selected={tableMode === 'playoffs'} className={tableMode === 'playoffs' ? 'active' : ''} onClick={() => setTableMode('playoffs')}>Плей-офф</button></div>
        {tableMode === 'league' ? <ScrollableStandings><table className="standings"><thead><tr><th className="team-head">КЛУБ</th><th title="Сыграно">И</th><th title="Победы">В</th><th title="Ничьи">Н</th><th title="Поражения">П</th><th title="Разница мячей">РМ</th><th className="points-head" title="Очки">О</th>{Array.from({ length: 8 }, (_, i) => <th className="round-head" key={i}>ТУР <b>{i + 1}</b></th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.team.id}><th className="team-head"><span className={`rank rank-${index < 8 ? 'direct' : index < 24 ? 'playoff' : 'out'}`}>{row.position}</span><img src={row.team.crest} alt="" /><span className="team-name">{getTeamDisplayName(row.team, true)}</span></th><td>{row.playedGames}</td><td className="positive">{row.won}</td><td>{row.draw}</td><td className="negative">{row.lost}</td><td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td><td className="points">{row.points}</td>{Array.from({ length: 8 }, (_, round) => <MatchCell key={formByTeam.get(row.team.id)?.[round]?.id ?? round} match={formByTeam.get(row.team.id)?.[round]} teamId={row.team.id} />)}</tr>)}</tbody></table>{!rows.length && !error && <div className="empty-state">Загружаем турнирную таблицу…</div>}</ScrollableStandings> : <MatchList matches={matches.filter(match => match.stage !== 'LEAGUE_STAGE')} empty="Матчи плей-офф появятся здесь." />}
        {tableMode === 'league' && <section className="format-guide"><div className="eyebrow muted">КАК УСТРОЕН НОВЫЙ ФОРМАТ</div><p>В общем этапе каждый клуб проводит восемь матчей с разными соперниками. Восемь лучших команд сразу выходят в 1/8 финала. Клубы с 9-го по 24-е место играют стыковые матчи за право продолжить путь, остальные завершают выступление.</p></section>}
      </>}
      {section === 'results' && <MatchGroups matches={leagueMatches.filter(match => match.status === 'FINISHED')} order="recent" empty="Завершённые матчи появятся здесь." />}
      {section === 'calendar' && <MatchGroups matches={matches.filter(match => match.status !== 'FINISHED')} order="upcoming" empty="Предстоящих матчей пока нет." />}
    </section>

    <footer><a className="brand footer-brand" href="/champions-league/table"><span className="brand-mark">✦</span><span>EUROPEAN <b>FOOTBALL</b><small>LEAGUES & NEWS</small></span></a><span className="footer-note">Данные: Football-data.org · обновление примерно раз в минуту</span></footer>
  </main>;
}


function ScrollableStandings({ children }: { children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const updateEdges = () => {
      const maxScroll = element.scrollWidth - element.clientWidth;
      setEdges({ start: element.scrollLeft > 1, end: maxScroll - element.scrollLeft > 1 });
    };
    updateEdges();
    const observer = new ResizeObserver(updateEdges);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    element.addEventListener('scroll', updateEdges, { passive: true });
    return () => {
      observer.disconnect();
      element.removeEventListener('scroll', updateEdges);
    };
  }, []);

  return <div className="table-scroll-frame" data-scrolled={edges.start} data-not-at-end={edges.end}>
    <div className="table-wrap" ref={scrollRef}>{children}</div>
  </div>;
}
function MatchCell({ match, teamId }: { match?: Match; teamId: number }) {
  if (!match) return <td className="empty-match">&#183;</td>;
  const home = match.homeTeam.id === teamId;
  const opponent = home ? match.awayTeam : match.homeTeam;
  const goals = home ? match.score.fullTime.home : match.score.fullTime.away;
  const against = home ? match.score.fullTime.away : match.score.fullTime.home;
  const outcome = goals === null || against === null ? '' : goals > against ? 'match-won' : goals < against ? 'match-lost' : 'match-draw';
  const isLive = match.status === 'IN_PLAY' || match.status === 'PAUSED';
  const played = match.status === 'FINISHED';
  const opponentName = getTeamDisplayName(opponent);
  const homeTeamName = getTeamDisplayName(match.homeTeam);
  return <td className={`teamRival ${home ? 'play-home' : 'play-away'} ${isLive ? "match-live" : played ? 'match-played' : 'match-upcoming'} ${outcome}`} title={`${home ? 'Home' : 'Away'} vs ${opponentName}`}>
    <div className="teamRival__body">
      <div className="teamRival__opponent">
        <img className="teamRival__logo" src={opponent.crest} alt={`Crest of ${opponentName}`} />
        <span className="teamRival__name" title={opponentName}>{opponentName}</span>
      </div>
      <div className="teamRival__meta-row">
        <div className="teamRival__meta">
          {played && <span className="teamRival__info">{goals ?? '-'} : {against ?? '-'}</span>}
          {isLive && <><span className="teamRival__info">{goals === null ? '- : -' : `${goals} : ${against}`}</span><span className="liveIcon">LIVE</span></>}
          {!played && !isLive && <time className="teamRival__date" dateTime={match.utcDate}>{formatMatchDate(match.utcDate)}</time>}
        </div>
        {home &&
          <span className="teamRival__homeTeam" title={`Home: ${homeTeamName}`}>
            <img className="teamRival__homeLogo" src={match.homeTeam.crest} alt={`Crest of ${homeTeamName}`} />
            <img className="teamRival__homeIcon" src="/icons/home.svg" alt="Home match" data-log={"d"} />
          </span>
        }
      </div>
    </div>
  </td>;
}

function formatMatchDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function MatchTime({ value }: { value: string }) {
  const date = new Date(value);
  return <time className="match-time" dateTime={value}>
    <span className="match-date">{date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
    <span className="match-clock">{date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
  </time>;
}

function MatchList({ matches, empty }: { matches: Match[]; empty: string }) {
  if (!matches.length) return <div className="news-empty"><p>{empty}</p></div>;
  return <div className="match-list">{matches.map(match => <article className="match-row" key={match.id}><MatchTime value={match.utcDate} /><span className="match-team home-team"><span>{getTeamDisplayName(match.homeTeam)}</span><img src={match.homeTeam.crest} alt={`Эмблема ${getTeamDisplayName(match.homeTeam)}`} /></span><b className="match-score">{match.score.fullTime.home ?? '–'} : {match.score.fullTime.away ?? '–'}</b><span className="match-team away-team"><img src={match.awayTeam.crest} alt={`Эмблема ${getTeamDisplayName(match.awayTeam)}`} /><span>{getTeamDisplayName(match.awayTeam)}</span></span><span className="match-row-spacer" aria-hidden="true" /></article>)}</div>;
}

function MatchGroups({ matches, order, empty }: { matches: Match[]; order: 'recent' | 'upcoming'; empty: string }) {
  if (!matches.length) return <div className="news-empty"><p>{empty}</p></div>;

  const direction = order === 'recent' ? -1 : 1;
  const grouped = new Map<string, { label: string; matches: Match[]; sortDate: number }>();
  for (const match of matches) {
    const date = new Date(match.utcDate).getTime();
    const matchday = match.matchday;
    const key = matchday && matchday > 0 ? `matchday-${matchday}` : `stage-${match.stage}`;
    const label = matchday && matchday > 0 ? `Тур ${matchday}` : stageLabel(match.stage);
    const group = grouped.get(key) ?? { label, matches: [], sortDate: date };
    group.matches.push(match);
    group.sortDate = order === 'recent' ? Math.max(group.sortDate, date) : Math.min(group.sortDate, date);
    grouped.set(key, group);
  }

  const rounds = [...grouped.values()].sort((a, b) => (a.sortDate - b.sortDate) * direction);

  return <div className="match-rounds">{rounds.map(round => <section className="match-round" key={round.label}>
    <h2>{round.label}</h2>
    <div className="match-list">{round.matches.sort((a, b) => (new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()) * direction).map(match => <article className="match-row" key={match.id}><MatchTime value={match.utcDate} /><span className="match-team home-team"><span>{getTeamDisplayName(match.homeTeam)}</span><img src={match.homeTeam.crest} alt={`Эмблема ${getTeamDisplayName(match.homeTeam)}`} /></span><b className="match-score">{match.score.fullTime.home ?? '–'} : {match.score.fullTime.away ?? '–'}</b><span className="match-team away-team"><img src={match.awayTeam.crest} alt={`Эмблема ${getTeamDisplayName(match.awayTeam)}`} /><span>{getTeamDisplayName(match.awayTeam)}</span></span><span className="match-row-spacer" aria-hidden="true" /></article>)}</div>
  </section>)}</div>;
}

function stageLabel(stage: string): string {
  const labels: Record<string, string> = {
    PLAYOFFS: 'Плей-офф',
    ROUND_OF_32: '1/16 финала',
    ROUND_OF_16: '1/8 финала',
    QUARTER_FINALS: 'Четвертьфинал',
    SEMI_FINALS: 'Полуфинал',
    FINAL: 'Финал',
  };
  return labels[stage] ?? stage.replaceAll('_', ' ');
}
