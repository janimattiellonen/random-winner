import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import {
  extractCompetitionId,
  fetchParticipants,
  type FetchedCompetition,
} from './api';
import './App.css';

function sourceList(
  competition: FetchedCompetition,
  drawIndividuals: boolean,
): string[] {
  if (drawIndividuals && competition.isDoubles) {
    return competition.individualParticipants;
  }
  return competition.participants;
}

function pickRandom<T>(items: readonly T[]): T | null {
  if (items.length === 0) {
    return null;
  }
  const index = Math.floor(Math.random() * items.length);
  return items[index] ?? null;
}

function competitionIdFromPath(pathname: string): string | null {
  const match = /^\/(\d+)\/?$/.exec(pathname);
  return match ? (match[1] ?? null) : null;
}

function competitionUrl(competitionId: string): string {
  return `https://discgolfmetrix.com/${competitionId}`;
}

export default function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [competition, setCompetition] = useState<FetchedCompetition | null>(
    null,
  );
  const [participants, setParticipants] = useState<string[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [previousWinners, setPreviousWinners] = useState<string[]>([]);
  const [drawIndividuals, setDrawIndividuals] = useState(false);
  // Incremented on every load and on navigating away from a competition, so a
  // response that arrives after a newer request (or a reset) is discarded.
  const latestLoadId = useRef(0);

  const canFetch = url.trim() !== '' && !loading;
  const canDraw = participants.length > 0;
  const removed = useMemo(() => {
    if (!competition) {
      return 0;
    }
    return (
      sourceList(competition, drawIndividuals).length - participants.length
    );
  }, [competition, drawIndividuals, participants.length]);

  function clearDraw() {
    setWinner(null);
    setPreviousWinners([]);
  }

  function clearCompetition() {
    setCompetition(null);
    setParticipants([]);
    clearDraw();
  }

  async function loadCompetition(competitionId: string) {
    latestLoadId.current += 1;
    const loadId = latestLoadId.current;
    const isStale = () => loadId !== latestLoadId.current;

    setError(null);
    clearDraw();
    setLoading(true);
    try {
      const fetched = await fetchParticipants(competitionId);
      if (isStale()) {
        return;
      }
      if (fetched.participants.length === 0) {
        setError('No participants found for this competition.');
        clearCompetition();
        return;
      }
      setCompetition(fetched);
      setParticipants(sourceList(fetched, drawIndividuals));
    } catch (err) {
      if (isStale()) {
        return;
      }
      const message =
        err instanceof Error ? err.message : 'Unknown error fetching data';
      setError(message);
      clearCompetition();
    } finally {
      if (!isStale()) {
        setLoading(false);
      }
    }
  }

  function handleFetch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const competitionId = extractCompetitionId(url);
    if (!competitionId) {
      setError(
        'Could not parse a competition id. Use a Disc Golf Metrix URL like https://discgolfmetrix.com/3580479 or just the numeric id.',
      );
      setWinner(null);
      return;
    }

    const path = `/${competitionId}`;
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    void loadCompetition(competitionId);
  }

  const handleLocationChange = useEffectEvent(() => {
    const competitionId = competitionIdFromPath(window.location.pathname);
    if (competitionId) {
      setUrl(competitionUrl(competitionId));
      void loadCompetition(competitionId);
    } else {
      latestLoadId.current += 1;
      setLoading(false);
      setUrl('');
      setError(null);
      clearCompetition();
    }
  });

  useEffect(() => {
    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
    // Effect events must not be listed as dependencies; this version of
    // eslint-plugin-react-hooks does not know about useEffectEvent yet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDraw() {
    const picked = pickRandom(participants);
    setWinner(picked);
  }

  function handleRemoveWinner() {
    if (!winner) {
      return;
    }
    setParticipants((prev) => {
      const idx = prev.indexOf(winner);
      if (idx === -1) {
        return prev;
      }
      const next = prev.slice();
      next.splice(idx, 1);
      return next;
    });
    setPreviousWinners((prev) => [...prev, winner]);
    setWinner(null);
  }

  function handleReset() {
    if (!competition) {
      return;
    }
    setParticipants(sourceList(competition, drawIndividuals));
    clearDraw();
  }

  function handleToggleIndividuals(checked: boolean) {
    setDrawIndividuals(checked);
    clearDraw();
    if (competition) {
      setParticipants(sourceList(competition, checked));
    }
  }

  return (
    <main className="app">
      <h1>Random winner</h1>
      <p className="lede">
        Fetch participants from a Disc Golf Metrix competition and draw a random
        winner.
      </p>

      <form className="fetch-form" onSubmit={handleFetch}>
        <label htmlFor="competition-url" className="field-label">
          Competition URL or id
        </label>
        <div className="field-row">
          <input
            id="competition-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://discgolfmetrix.com/3580479"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" disabled={!canFetch}>
            {loading ? 'Loading…' : 'Fetch participants'}
          </button>
        </div>
      </form>

      {error && <p className="error">{error}</p>}

      {competition && (
        <section className="participants" aria-label="Participants">
          <header className="participants-header">
            <div>
              <h2>{competition.competitionName || 'Competition'}</h2>
              <p className="meta">
                {participants.length} participant
                {participants.length === 1 ? '' : 's'}
                {removed > 0 ? ` (${removed} removed)` : ''}
              </p>
              {competition.isDoubles && (
                <label className="doubles-toggle">
                  <input
                    type="checkbox"
                    checked={drawIndividuals}
                    onChange={(e) => handleToggleIndividuals(e.target.checked)}
                  />
                  Draw a single player instead of a pair
                </label>
              )}
            </div>
            <div className="actions">
              <button
                type="button"
                onClick={handleDraw}
                disabled={!canDraw}
                className="primary"
              >
                Draw winner
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={removed === 0 && !winner}
              >
                Reset list
              </button>
            </div>
          </header>

          {winner && (
            <div className="winner" role="status" aria-live="polite">
              <span className="winner-label">Winner</span>
              <span className="winner-name">{winner}</span>
              <button
                type="button"
                onClick={handleRemoveWinner}
                className="winner-remove"
              >
                Remove and draw again
              </button>
            </div>
          )}

          {previousWinners.length > 0 && (
            <div className="previous-winners">
              <h3>Previous winners</h3>
              <ol>
                {previousWinners.map((name, index) => (
                  <li key={`${name}-${index}`}>{name}</li>
                ))}
              </ol>
            </div>
          )}

          <ul className="participant-list">
            {participants.map((name, index) => (
              <li
                key={`${name}-${index}`}
                className={name === winner ? 'is-winner' : ''}
              >
                {name}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
