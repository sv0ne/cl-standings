export const TEAM_NAME_ALIASES: Record<string, string> = {
  'Barça': 'Barcelona',
  Atleti: 'Atletico',
  Leverkusen: 'Bayer',
  'Paris Saint-Germain FC': 'PSG'
};

export function getTeamDisplayName(team: { name?: string | null; shortName?: string | null }): string {
  const name = team.shortName || team.name;
  return name ? TEAM_NAME_ALIASES[name] ?? name : '';
}

export const seasons = [2024, 2025, 2026] as const;
export const currentSeason = seasons[seasons.length - 1];
