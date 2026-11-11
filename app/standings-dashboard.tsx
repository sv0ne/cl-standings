'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {seasons, getTeamDisplayName, currentSeason} from './site-config';
import { useStandings, type BracketPool, type BracketRule, type Match, type Standing, type Team } from './standings-store';
import {useRouter} from "next/navigation";

type Section = 'news' | 'table' | 'results' | 'calendar';
type Props = { section: Section; sections: Record<Section, { label: string; title: string; description: string }>; selectedSeason: number; league: string };

export default function StandingsDashboard({ section, sections, selectedSeason, league }: Props) {
  const router = useRouter();
  const { data: payload, error, loading, refreshing, refresh } = useStandings(selectedSeason, true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [tableMode, setTableMode] = useState<'league' | 'playoffs'>('league');

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  useEffect(() => {
    console.log("Данные", payload);
  }, [payload]);

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
    router.push(`/${league}/table?season=${value}`);
  };

  const seasonQuery = `?season=${selectedSeason}`;

  return <main className="site-shell">
    <header className="topbar">
      <a className="brand" href={`${league}/table`}><span className="brand-mark">✦</span><span>EUROPEAN <b>FOOTBALL</b><small>LEAGUES & NEWS</small></span></a>
      <div className="header-actions"><span className="live-note"><i /> LIVE DATA</span><button className="icon-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Переключить тему">{theme === 'dark' ? '☼' : '☾'}</button></div>
    </header>

    <nav className="league-tabs" aria-label="Лиги">
      <a className="league-tab active" href={`${league}/table`}>Лига чемпионов</a>
      <span className="league-tab disabled" aria-disabled="true">Ла Лига <small>Скоро</small></span>
    </nav>

    <nav className="section-tabs" aria-label="Разделы Лиги чемпионов">
      <div className="section-links">{Object.entries(sections).filter(([slug]) => slug !== 'calendar' || selectedSeason === currentSeason).map(([slug, item]) => <Link key={slug} className={section === slug ? 'section-tab active' : 'section-tab'} href={`/${league}/${slug}${seasonQuery}`} aria-current={section === slug ? 'page' : undefined}>{item.label}</Link>)}</div>
      <label className="season-picker"><span>Сезон</span><span className="season-select-wrap"><select value={selectedSeason} onChange={event => selectSeason(event.target.value)}>{seasons.toReversed().map(year => <option key={year} value={year}>{year}/{String(year + 1).slice(-2)}</option>)}</select><svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4" /></svg></span></label>
    </nav>

    <section className="content">
      <div className="section-heading">
        <div>
          <div className="eyebrow muted">ЛИГА ЧЕМПИОНОВ · СЕЗОН {selectedSeason}/{selectedSeason + 1}</div>
          <h1>{sections[section].title}</h1>
          <p className="section-description">{sections[section].description}</p>
          <div className="data-status-row">
            <span>Актуальность данных: {payload?.dataUpdatedAt ? new Date(payload.dataUpdatedAt).toLocaleString('ru-RU') : loading ? 'загрузка…' : 'нет данных'}</span>
            <button type="button" onClick={() => void refresh()}
                    disabled={refreshing || loading}>{refreshing ? 'Обновляем…' : 'Обновить'}</button>
          </div>
        </div>
      </div>
      {section === 'news' && <div className="news-empty"><h2>Новости скоро появятся</h2><p>Здесь будут публиковаться новости и материалы о Лиге чемпионов.</p></div>}
      {error && <div className="error-box"><strong>Не удалось загрузить данные</strong><span>{error}</span><button onClick={() => void refresh()}>Повторить</button></div>}
      {section === 'table' && <>
        <div className="legend"><span><i className="legend-direct" /> 1–8 · 1/8 финала</span><span><i className="legend-playoff" /> 9–24 · стыковые</span><span><i className="legend-out" /> 25–36 · выбывание</span></div>
        <div className="table-switch" role="tablist" aria-label="Этап турнира"><button role="tab" aria-selected={tableMode === 'league'} className={tableMode === 'league' ? 'active' : ''} onClick={() => setTableMode('league')}>Этап лиги</button><button role="tab" aria-selected={tableMode === 'playoffs'} className={tableMode === 'playoffs' ? 'active' : ''} onClick={() => setTableMode('playoffs')}>Плей-офф</button></div>
        {tableMode === 'league' ? <ScrollableStandings><table className="standings"><thead><tr><th className="team-head">КЛУБ</th><th title="Сыграно">И</th><th title="Победы">В</th><th title="Ничьи">Н</th><th title="Поражения">П</th><th title="Разница мячей">РМ</th><th className="points-head" title="Очки">О</th>{Array.from({ length: 8 }, (_, i) => <th className="round-head" key={i}>ТУР <b>{i + 1}</b></th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.team.id}><th className="team-head"><span className={`rank rank-${index < 8 ? 'direct' : index < 24 ? 'playoff' : 'out'}`}>{row.position}</span><img src={row.team.crest} alt="" /><span className="team-name">{getTeamDisplayName(row.team)}</span></th><td>{row.playedGames}</td><td className="positive">{row.won}</td><td>{row.draw}</td><td className="negative">{row.lost}</td><td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td><td className="points">{row.points}</td>{Array.from({ length: 8 }, (_, round) => <MatchCell key={formByTeam.get(row.team.id)?.[round]?.id ?? round} match={formByTeam.get(row.team.id)?.[round]} teamId={row.team.id} />)}</tr>)}</tbody></table>{!rows.length && !error && <div className="empty-state">Загружаем турнирную таблицу…</div>}</ScrollableStandings> : <PlayoffsGrid matches={matches} standings={rows} rules={payload?.rules} selectedSeason={selectedSeason} />}
        {tableMode === 'league' && <section className="format-guide"><div className="eyebrow muted">КАК УСТРОЕН НОВЫЙ ФОРМАТ</div><p>В общем этапе каждый клуб проводит восемь матчей с разными соперниками. Восемь лучших команд сразу выходят в 1/8 финала. Клубы с 9-го по 24-е место играют стыковые матчи за право продолжить путь, остальные завершают выступление.</p></section>}
      </>}
      {section === 'results' && <MatchGroups matches={matches.filter(match => match.status === 'FINISHED')} order="recent" empty="Завершённые матчи появятся здесь." />}
      {section === 'calendar' && <MatchGroups matches={matches.filter(match => match.status !== 'FINISHED')} order="upcoming" empty="Предстоящих матчей пока нет." />}
    </section>

    <footer><a className="brand footer-brand" href={`${league}/table`}><span className="brand-mark">✦</span><span>EUROPEAN <b>FOOTBALL</b><small>LEAGUES & NEWS</small></span></a><span className="footer-note">Данные: Football-data.org · обновление примерно раз в минуту</span></footer>
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
      const stickyColumn = element.querySelector<HTMLElement>('.standings .team-head');
      if (stickyColumn) element.parentElement?.style.setProperty('--sticky-column-width', `${stickyColumn.getBoundingClientRect().width}px`);
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

function goalsWithoutPenaltyShootout(goals: number | null | undefined, penalties: number | null | undefined): number | null {
  if (goals == null) return null;
  return penalties == null ? goals : goals - penalties;
}

function PlayoffsGrid({ matches, standings, rules, selectedSeason }: { matches: Match[]; standings: Standing[]; rules?: BracketRule[]; selectedSeason: number }) {
  const [expandedTies, setExpandedTies] = useState<Set<string>>(() => new Set());
  const [tieZIndexes, setTieZIndexes] = useState<Map<string, number>>(() => new Map());
  const [nextTieZIndex, setNextTieZIndex] = useState(11);
  const [focusedTlas, setFocusedTlas] = useState<Set<string> | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [bracketLines, setBracketLines] = useState<{ key: string; path: string }[]>([]);
  const [bracketSize, setBracketSize] = useState({ width: 0, height: 0 });

  const stages = ['PLAYOFFS', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL'];
  type TieView = { key: string; legs: Match[]; teams: Team[]; bye?: boolean; projectedRows?: { label: string; teams: Team[]; placeholder?: boolean }[]; connectsTo?: string };
  const columns: { stage: string; ties: TieView[] }[] = stages.map(stage => {
    const stageMatches = matches.filter(match => match.stage === stage);
    const ties = new Map<string, Match[]>();
    for (const match of stageMatches) {
      const ids = [match.homeTeam?.id, match.awayTeam?.id];
      const tieKey = ids.every(id => id != null) ? `${stage}-${[...ids].sort((a, b) => a! - b!).join('-')}` : `${stage}-match-${match.id}`;
      ties.set(tieKey, [...(ties.get(tieKey) ?? []), match]);
    }
    return {
      stage,
      ties: [...ties.entries()].map(([key, legs]) => {
        const sortedLegs = legs.sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
        return { key, legs: sortedLegs, teams: [sortedLegs[0].homeTeam, sortedLegs[0].awayTeam] };
      }),
    };
  }).filter(column => column.ties.length > 0);

  const hasActualPlayoffs = matches.some(match => match.stage === 'PLAYOFFS');
  const isForecast = selectedSeason === currentSeason && Boolean(rules?.length) && !hasActualPlayoffs;
  if (isForecast) {
    const positionTeams = new Map(standings.map(row => [row.position, row.team]));
    const playoffRule = rules!.find(rule => rule.id === 'PLAYOFFS');
    const last16Rule = rules!.find(rule => rule.id === 'LAST_16');
    const poolTeams = (pool: BracketPool | undefined, rowIndex = 0) => {
      if (!pool) return [];
      const positions = pool.results.length
        ? rowIndex === 0 ? pool.results.slice(0, 1) : pool.results.slice(1, 2)
        : rowIndex === 0 ? pool.variants.slice(0, 2) : pool.variants.slice(2, 4);
      return positions.map(position => positionTeams.get(position)).filter((team): team is Team => Boolean(team));
    };
    const playoffPools = playoffRule?.pools ?? [];
    const last16Pools = last16Rule?.pools ?? [];
    const last16Ties: TieView[] = playoffPools.map((pool, index) => {
      const nextPool = last16Pools[index];
      return {
        key: `PREDICTED-${nextPool?.id ?? `R16-${index + 1}`}-${index}`,
        legs: [],
        teams: [],
        projectedRows: [
          { label: '', teams: [], placeholder: true },
          { label: '', teams: poolTeams(nextPool, 0) },
        ],
      };
    });
    const playoffTies: TieView[] = playoffPools.flatMap((pool, index) => {
      const nextPool = last16Pools[index];
      const nextKey = last16Ties[index].key;
      return [
        {
          key: `PREDICTED-${pool.id}-${index}`,
          legs: [],
          teams: [],
          connectsTo: nextKey,
          projectedRows: [
            { label: '', teams: poolTeams(pool, 0) },
            { label: '', teams: poolTeams(pool, 1) },
          ],
        },
        {
          key: `PREDICTED-${nextPool?.id ?? `R16-${index + 1}`}-slot-${index}`,
          legs: [],
          teams: [],
          connectsTo: nextKey,
          projectedRows: [{ label: '', teams: poolTeams(nextPool, 0) }],
        },
      ];
    });
    const quarterFinalTies: TieView[] = Array.from({ length: 4 }, (_, index) => ({
      key: `PREDICTED-QF-${index + 1}`,
      legs: [],
      teams: [],
      projectedRows: [
        { label: '', teams: [], placeholder: true },
        { label: '', teams: [], placeholder: true },
      ],
    }));
    const semiFinalTies: TieView[] = Array.from({ length: 2 }, (_, index) => ({
      key: `PREDICTED-SF-${index + 1}`,
      legs: [],
      teams: [],
      projectedRows: [
        { label: '', teams: [], placeholder: true },
        { label: '', teams: [], placeholder: true },
      ],
    }));
    const finalTie: TieView[] = [{
      key: 'PREDICTED-FINAL-1',
      legs: [],
      teams: [],
      projectedRows: [
        { label: '', teams: [], placeholder: true },
        { label: '', teams: [], placeholder: true },
      ],
    }];
    last16Ties.forEach((tie, index) => { tie.connectsTo = quarterFinalTies[Math.floor(index / 2)].key; });
    quarterFinalTies.forEach((tie, index) => { tie.connectsTo = semiFinalTies[Math.floor(index / 2)].key; });
    semiFinalTies.forEach(tie => { tie.connectsTo = finalTie[0].key; });
    columns.splice(0, columns.length,
      ...(playoffTies.length ? [{ stage: 'PLAYOFFS', ties: playoffTies }] : []),
      ...(last16Ties.length ? [{ stage: 'LAST_16', ties: last16Ties }] : []),
      { stage: 'QUARTER_FINALS', ties: quarterFinalTies },
      { stage: 'SEMI_FINALS', ties: semiFinalTies },
      { stage: 'FINAL', ties: finalTie },
    );
  }

  // Arrange each round from the final backwards, following team IDs into the prior round.
  for (let index = isForecast ? -1 : columns.length - 1; index > 0; index--) {
    const laterRound = columns[index];
    const earlierRound = columns[index - 1];
    const ordered: TieView[] = [];
    const used = new Set<string>();
    for (const laterTie of laterRound.ties) {
      for (const team of laterTie.teams) {
        const priorTie = earlierRound.ties.find(tie => tie.teams.some(candidate => candidate.id === team.id));
        if (priorTie && !used.has(priorTie.key)) {
          ordered.push(priorTie);
          used.add(priorTie.key);
        }
      }
    }
    earlierRound.ties = [...ordered, ...earlierRound.ties.filter(tie => !used.has(tie.key))];
  }

  // In the new format, teams that entered directly in LAST_16 get a single-team slot in PLAYOFFS.
  const playoffs = isForecast ? undefined : columns.find(column => column.stage === 'PLAYOFFS');
  const last16 = columns.find(column => column.stage === 'LAST_16');
  if (playoffs && last16) {
    const ordered: TieView[] = [];
    const used = new Set<string>();
    for (const tie of last16.ties) {
      for (const team of tie.teams) {
        const playoffTie = playoffs.ties.find(candidate => candidate.teams.some(entry => entry.id === team.id));
        if (playoffTie && !used.has(playoffTie.key)) {
          ordered.push(playoffTie);
          used.add(playoffTie.key);
        } else if (!playoffTie) {
          ordered.push({ key: `PLAYOFFS-bye-${team.id}`, legs: [], teams: [team], bye: true });
        }
      }
    }
    playoffs.ties = [...ordered, ...playoffs.ties.filter(tie => !used.has(tie.key))];
  }

  const tieConnections = columns.slice(1).flatMap((laterRound, index) => {
    const earlierRound = columns[index];
    return earlierRound.ties.flatMap(priorTie => {
      if (priorTie.connectsTo) return [{ from: priorTie.key, to: priorTie.connectsTo }];
      const nextTie = laterRound.ties.find(tie => tie.teams.some(team => priorTie.teams.some(priorTeam => priorTeam.id === team.id)));
      return nextTie ? [{ from: priorTie.key, to: nextTie.key }] : [];
    });
  });
  const tieConnectionsRef = useRef(tieConnections);
  tieConnectionsRef.current = tieConnections;
  const tieConnectionSignature = tieConnections.map(({ from, to }) => `${from}->${to}`).join('|');

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const updateLines = () => {
      const gridRect = grid.getBoundingClientRect();
      const size = { width: grid.scrollWidth, height: grid.scrollHeight };
      setBracketSize(current => current.width === size.width && current.height === size.height ? current : size);
      const tieElements = new Map(
        [...grid.querySelectorAll<HTMLElement>('[data-playoff-tie]')].map(element => [element.dataset.playoffTie!, element]),
      );
      const paths = tieConnectionsRef.current.flatMap(({ from, to }) => {
        const fromElement = tieElements.get(from);
        const toElement = tieElements.get(to);
        if (!fromElement || !toElement) return [];
        const fromRect = fromElement.getBoundingClientRect();
        const toRect = toElement.getBoundingClientRect();
        const x1 = fromRect.right - gridRect.left + grid.scrollLeft;
        const y1 = fromRect.top + fromRect.height / 2 - gridRect.top + grid.scrollTop;
        const x2 = toRect.left - gridRect.left + grid.scrollLeft;
        const y2 = toRect.top + toRect.height / 2 - gridRect.top + grid.scrollTop;
        const middleX = x1 + (x2 - x1) / 2;
        return [{ key: `${from}->${to}`, path: `M ${x1} ${y1} H ${middleX} V ${y2} H ${x2}` }];
      });
      setBracketLines(current => JSON.stringify(current) === JSON.stringify(paths) ? current : paths);
    };

    updateLines();
    const observer = new ResizeObserver(updateLines);
    observer.observe(grid);
    grid.querySelectorAll('[data-playoff-tie]').forEach(element => observer.observe(element));
    window.addEventListener('resize', updateLines);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateLines);
    };
  }, [matches, expandedTies, selectedSeason, tieConnectionSignature]);

  if (!matches.length && !isForecast) return <div className="news-empty"><p>Матчи плей-офф появятся здесь.</p></div>;

  return <div className="playoffs-grid" ref={gridRef} aria-label="Сетка плей-офф">
    <svg className="playoff-bracket-lines" aria-hidden="true" width={bracketSize.width} height={bracketSize.height}>
      {bracketLines.map(({ key, path }) => <path key={key} d={path} />)}
    </svg>
    {columns.map(column => <section className="playoff-column" key={column.stage}>
      <h2>{stageLabel(column.stage)}</h2>
      <div className="playoff-fixtures">{column.ties.map(({ key, legs, teams, bye, projectedRows }) => {
        if (projectedRows) return <div className="playoff-tie" key={key} data-playoff-tie={key}>
          <div className="playoff-fixture projected">{projectedRows.map((row, index) => {
            return <span className="playoff-team" key={index}>
              {row.placeholder || !row.teams.length
                ? <><i className="team-placeholder-icon" aria-hidden="true">?</i><span>{row.label || 'TBD'}</span></>
                : <span className="projected-team-options">{row.teams.map((team, teamIndex) => <span className="projected-team-option" key={team.id}>{teamIndex > 0 && <span className="projected-team-separator">/</span>}<img src={team.crest} alt="" /><span>{getTeamDisplayName(team)}</span></span>)}</span>}
            </span>;
          })}</div>
        </div>;
        if (bye) {
          const team = teams[0];
          const teamShortName = team.shortName;
          const isFocused = focusedTlas?.has(teamShortName) ?? false;
          return <div className="playoff-tie" key={key} data-playoff-tie={key} onMouseEnter={() => setFocusedTlas(new Set([teamShortName]))} onMouseLeave={() => setFocusedTlas(null)}>
            <div className={`playoff-fixture bye${isFocused ? ' focused' : ''}`}><span className="playoff-team"><img src={team.crest} alt="" /><span>{getTeamDisplayName(team)}</span></span></div>
          </div>;
        }
        const firstLeg = legs[0];
        const home = firstLeg.homeTeam;
        const away = firstLeg.awayTeam;
        const scoresForTeam = (teamId: number) => Array.from({ length: 2 }, (_, index) => {
          const leg = legs[index];
          if (!leg) return null;
          return leg.homeTeam.id === teamId
            ? { goals: leg.score.fullTime.home, penalties: leg.score.penalties?.home ?? null }
            : leg.awayTeam.id === teamId
              ? { goals: leg.score.fullTime.away, penalties: leg.score.penalties?.away ?? null }
              : null;
        });
        const scoreCount = column.stage === 'FINAL' ? 1 : 2;
        const homeScores = scoresForTeam(home.id).slice(0, scoreCount);
        const awayScores = scoresForTeam(away.id).slice(0, scoreCount);
        const bothLegsFinished = legs.length >= 2 && legs.slice(0, 2).every(leg =>
          leg.status === 'FINISHED' && leg.score.fullTime.home !== null && leg.score.fullTime.away !== null,
        );
        const homeTotal = homeScores.reduce<number>((total, score) => total + (goalsWithoutPenaltyShootout(score?.goals, score?.penalties) ?? 0), 0);
        const awayTotal = awayScores.reduce<number>((total, score) => total + (goalsWithoutPenaltyShootout(score?.goals, score?.penalties) ?? 0), 0);
        const decidingLeg = legs[1];
        const shootoutHome = decidingLeg?.score.penalties?.home;
        const shootoutAway = decidingLeg?.score.penalties?.away;
        const shootoutWinnerId = decidingLeg && shootoutHome != null && shootoutAway != null && shootoutHome !== shootoutAway
          ? shootoutHome > shootoutAway ? decidingLeg.homeTeam.id : decidingLeg.awayTeam.id
          : null;
        const homeWon = bothLegsFinished && (homeTotal > awayTotal || (homeTotal === awayTotal && shootoutWinnerId === home.id));
        const awayWon = bothLegsFinished && (awayTotal > homeTotal || (homeTotal === awayTotal && shootoutWinnerId === away.id));
        const hasPenalty = legs.some(leg => leg.score.penalties?.home != null && leg.score.penalties?.away != null);
        const tieTlas = new Set(legs.flatMap(leg => [leg.homeTeam.shortName, leg.awayTeam.shortName]).filter((shortName): shortName is string => Boolean(shortName)));
        const isFocused = focusedTlas !== null && [...tieTlas].some(shortName => focusedTlas.has(shortName));
        const expanded = expandedTies.has(key);
        const toggle = () => {
          const closing = expandedTies.has(key);
          setExpandedTies(current => {
            const next = new Set(current);
            if (closing) next.delete(key); else next.add(key);
            return next;
          });
          if (!closing) {
            setTieZIndexes(current => new Map(current).set(key, nextTieZIndex));
            setNextTieZIndex(current => current + 1);
          }
        };
        return <div className="playoff-tie" key={key} data-playoff-tie={key} style={{ zIndex: expanded ? tieZIndexes.get(key) : undefined }} onMouseEnter={() => setFocusedTlas(tieTlas)} onMouseLeave={() => setFocusedTlas(null)}>
          <button type="button" className={`playoff-fixture${isFocused ? ' focused' : ''}${hasPenalty ? ' hasPenalty' : ''}${column.stage === 'FINAL' ? ' final' : ''}`} onClick={toggle} aria-expanded={expanded}>
            <span className={`playoff-team${homeWon ? ' winner' : ''}`}><img src={home?.crest ?? ''} alt="" /><span>{home?.shortName ? getTeamDisplayName(home) : 'Определиться позже'}</span>{homeScores.map((score, index) => <b key={index}>{goalsWithoutPenaltyShootout(score?.goals, score?.penalties) ?? '–'}{score && score.penalties != null && <small>({score.penalties})</small>}</b>)}</span>
            <span className={`playoff-team${awayWon ? ' winner' : ''}`}><img src={away?.crest ?? ''} alt="" /><span>{away?.shortName ? getTeamDisplayName(away) : 'Определиться позже'}</span>{awayScores.map((score, index) => <b key={index}>{goalsWithoutPenaltyShootout(score?.goals, score?.penalties) ?? '–'}{score && score.penalties != null && <small>({score.penalties})</small>}</b>)}</span>
          </button>
          {expanded && <div className="playoff-leg-results">{legs.map(leg => {
            const date = new Date(leg.utcDate);
            const hasScore = leg.score.fullTime.home !== null && leg.score.fullTime.away !== null;
            const hasLegPenalty = leg.score.penalties?.home != null && leg.score.penalties?.away != null;
            return <div className="playoff-leg" key={leg.id}>
              <time dateTime={leg.utcDate}>{date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })}</time>
              <div className="playoff-leg-details">
                <span>{leg.homeTeam.tla ?? '—'} - {leg.awayTeam.tla ?? '—'}</span>
                {hasLegPenalty && <span className="playoff-penalties">Серия пенальти</span>}
              </div>
              <div className="playoff-leg-details">
              <b>{hasScore ? `${goalsWithoutPenaltyShootout(leg.score.fullTime.home, leg.score.penalties?.home) ?? '–'} - ${goalsWithoutPenaltyShootout(leg.score.fullTime.away, leg.score.penalties?.away) ?? '–'}` : ''}</b>
                {hasLegPenalty && <b>{leg.score.penalties?.home} - {leg.score.penalties?.away}</b>}
              </div>
            </div>;
          })}</div>}
        </div>;
      })}</div>
    </section>)}
  </div>;
}

function MatchGroups({ matches, order, empty }: { matches: Match[]; order: 'recent' | 'upcoming'; empty: string }) {
  if (!matches.length) return <div className="news-empty"><p>{empty}</p></div>;

  const direction = order === 'recent' ? -1 : 1;
  const grouped = new Map<string, { label: string; matches: Match[]; sortDate: number }>();
  for (const match of matches) {
    const date = new Date(match.utcDate).getTime();
    const matchday = match.matchday;
    const isLeagueStage = match.stage === 'LEAGUE_STAGE';
    const key = isLeagueStage && matchday && matchday > 0 ? `matchday-${matchday}` : `stage-${match.stage}`;
    const label = isLeagueStage && matchday && matchday > 0 ? `Тур ${matchday}` : stageLabel(match.stage);
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
    PLAYOFFS: '1/16 финала',
    LAST_16: '1/8 финала',
    QUARTER_FINALS: 'Четвертьфинал',
    SEMI_FINALS: 'Полуфинал',
    FINAL: 'Финал',
  };
  return labels[stage] ?? stage.replaceAll('_', ' ');
}
