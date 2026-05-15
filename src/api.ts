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
  participants: string[];
}

async function fetchCompetition(
  competitionId: string,
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

  if (!data.Competition || !Array.isArray(data.Competition.Results)) {
    throw new Error('Unexpected API response: missing Competition.Results');
  }

  return data;
}

export async function fetchParticipants(
  competitionId: string,
): Promise<FetchedCompetition> {
  const parent = await fetchCompetition(competitionId);

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
      parent.Competition.Events.map((event) => fetchCompetition(event.ID)),
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
      name: r.Name?.trim() ?? '',
      className: r.ClassName?.trim() ?? '',
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

  return {
    competitionName: parent.Competition.Name ?? '',
    participants,
  };
}
