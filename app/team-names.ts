export const TEAM_NAME_ALIASES: Record<string, string> = {
  'Barça': 'Barcelona',
  Atleti: 'Atletico',
  Leverkusen: 'Bayer',
  'Paris Saint-Germain FC': 'PSG'
};

const aliasesByNormalizedName = new Map(
  Object.entries(TEAM_NAME_ALIASES).map(([name, replacement]) => [name.trim().toLocaleLowerCase(), replacement]),
);

export function getCanonicalTeamName(name?: string | null): string | undefined {
  if (!name) return undefined;
  return aliasesByNormalizedName.get(name.trim().toLocaleLowerCase()) ?? name;
}

export function getTeamDisplayName(team: { name?: string | null; shortName?: string | null }, preferShortName = false): string {
  const names = preferShortName ? [team.shortName, team.name] : [team.name, team.shortName];
  for (const name of names) {
    const canonicalName = getCanonicalTeamName(name);
    if (canonicalName && canonicalName !== name) return canonicalName;
  }
  return names.find(Boolean) ?? '';
}
