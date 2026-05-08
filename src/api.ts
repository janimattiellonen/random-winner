import type { MetrixApiResponse } from './types';

const METRIX_HOST = 'discgolfmetrix.com';

export function extractCompetitionId(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;

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

  const participants = data.Competition.Results.map((r) => r.Name)
    .map((name) => name?.trim())
    .filter((name): name is string => Boolean(name));

  return {
    competitionName: data.Competition.Name ?? '',
    participants,
  };
}
