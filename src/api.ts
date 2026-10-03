import type { MetrixApiResponse, MetrixResult } from './types';

const METRIX_HOST = 'discgolfmetrix.com';

export function extractCompetitionId(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === '') {
    return null;
  }

  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(
      trimmed.startsWith('http') ? trimmed : `https://${trimmed}`,
    );
    if (!url.hostname.endsWith(METRIX_HOST)) {
      return null;
    }
    const segments = url.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && /^\d+$/.test(last)) {
      return last;
    }
    const idParam = url.searchParams.get('id');
    if (idParam && /^\d+$/.test(idParam)) {
      return idParam;
    }
    return null;
  } catch {
    return null;
  }
}

export function competitionUrl(competitionId: string): string {
  return `https://${METRIX_HOST}/${competitionId}`;
}

/**
 * Metrix returns some text HTML-encoded, e.g. "&rarr;" instead of "→".
 * A textarea's content is parsed as RCDATA, so entities are decoded while
 * anything that looks like a tag is kept as literal text.
 */
function decodeHtmlEntities(text: string): string {
  if (!text.includes('&')) {
    return text;
  }
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

function formatDiff(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return '';
    }
    return value > 0 ? `+${value}` : String(value);
  }
  return value.trim();
}

export interface FetchedCompetition {
  competitionName: string;
  /** Participants as they appear in the results, i.e. teams for doubles. */
  participants: string[];
  /**
   * For doubles competitions: the individual players behind the teams,
   * deduplicated by name. Empty when the competition is not doubles.
   */
  individualParticipants: string[];
  isDoubles: boolean;
}

function splitTeamName(name: string): string[] {
  return name
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '');
}

function collectIndividuals(names: readonly string[]): string[] {
  const seen = new Set<string>();
  const players: string[] = [];
  for (const name of names) {
    for (const player of splitTeamName(name)) {
      const key = player.toLocaleLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      players.push(player);
    }
  }
  return players;
}

async function fetchCompetition(
  competitionId: string,
  notFoundMessage: string,
): Promise<MetrixApiResponse> {
  const apiUrl = `https://${METRIX_HOST}/api.php?content=result&id=${encodeURIComponent(
    competitionId,
  )}`;

  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch competition data (HTTP ${response.status})`,
    );
  }

  const data = (await response.json()) as MetrixApiResponse;

  if (!data.Competition) {
    throw new Error(notFoundMessage);
  }
  if (!Array.isArray(data.Competition.Results)) {
    throw new Error(
      'Disc Golf Metrix returned competition data in an unexpected format. Please try again later.',
    );
  }

  return data;
}

export async function fetchParticipants(
  competitionId: string,
): Promise<FetchedCompetition> {
  const parent = await fetchCompetition(
    competitionId,
    `Competition ${competitionId} was not found on Disc Golf Metrix. Check the link and try again.`,
  );

  let rawResults: MetrixResult[];
  if (parent.Competition.Results.length > 0) {
    rawResults = parent.Competition.Results;
  } else if (
    Array.isArray(parent.Competition.SubCompetitions) &&
    parent.Competition.SubCompetitions.length > 0
  ) {
    rawResults = parent.Competition.SubCompetitions.flatMap(
      (sub) => sub.Results ?? [],
    );
  } else if (
    Array.isArray(parent.Competition.Events) &&
    parent.Competition.Events.length > 0
  ) {
    const subResponses = await Promise.all(
      parent.Competition.Events.map((event) =>
        fetchCompetition(
          event.ID,
          'Disc Golf Metrix could not return all rounds of this competition. Please try again later.',
        ),
      ),
    );
    rawResults = subResponses.flatMap((sub) => sub.Competition.Results);
  } else {
    rawResults = [];
  }

  const seenUserIds = new Set<string>();
  const results: MetrixResult[] = [];
  for (const r of rawResults) {
    if (r.UserID && seenUserIds.has(r.UserID)) {
      continue;
    }
    if (r.UserID) {
      seenUserIds.add(r.UserID);
    }
    results.push(r);
  }

  const rows = results
    .map((r) => ({
      name: decodeHtmlEntities(r.Name ?? '').trim(),
      className: decodeHtmlEntities(r.ClassName ?? '').trim(),
      diff: formatDiff(r.Diff),
    }))
    .filter((row) => row.name !== '');

  const nameCounts = new Map<string, number>();
  for (const row of rows) {
    nameCounts.set(row.name, (nameCounts.get(row.name) ?? 0) + 1);
  }

  const participants = rows.map((row) => {
    if ((nameCounts.get(row.name) ?? 0) <= 1) {
      return row.name;
    }
    const parts: string[] = [];
    if (row.diff !== '') {
      parts.push(row.diff);
    }
    if (row.className !== '') {
      parts.push(`"${row.className}"`);
    }
    return parts.length > 0 ? `${row.name} (${parts.join(', ')})` : row.name;
  });

  const teamRowCount = rows.filter((row) => row.name.includes(',')).length;
  const isDoubles = rows.length > 0 && teamRowCount * 2 >= rows.length;

  return {
    competitionName: decodeHtmlEntities(parent.Competition.Name ?? ''),
    participants,
    individualParticipants: isDoubles
      ? collectIndividuals(rows.map((row) => row.name))
      : [],
    isDoubles,
  };
}
