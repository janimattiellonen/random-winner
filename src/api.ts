import type { MetrixApiResponse } from './types';

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

export async function fetchParticipants(
  competitionId: string,
): Promise<FetchedCompetition> {
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

  const rows = data.Competition.Results.map((r) => ({
    name: r.Name?.trim() ?? '',
    className: r.ClassName?.trim() ?? '',
    diff: formatDiff(r.Diff),
  })).filter((row) => row.name !== '');

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
    competitionName: data.Competition.Name ?? '',
    participants,
  };
}
