import { useMemo, useState } from 'react';
import {
  extractCompetitionId,
  fetchParticipants,
  type FetchedCompetition,
} from './api';
import './App.css';

function pickRandom<T>(items: readonly T[]): T | null {
  if (items.length === 0) return null;
  const index = Math.floor(Math.random() * items.length);
  return items[index] ?? null;
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

  const canFetch = url.trim() !== '' && !loading;
  const canDraw = participants.length > 0;
  const removed = useMemo(() => {
    if (!competition) return 0;
    return competition.participants.length - participants.length;
  }, [competition, participants.length]);

  async function handleFetch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setWinner(null);

    const competitionId = extractCompetitionId(url);
    if (!competitionId) {
      setError(
        'Could not parse a competition id. Use a Disc Golf Metrix URL like https://discgolfmetrix.com/3580479 or just the numeric id.',
      );
      return;
    }

    setLoading(true);
    try {
      const fetched = await fetchParticipants(competitionId);
      if (fetched.participants.length === 0) {
        setError('No participants found for this competition.');
        setCompetition(null);
        setParticipants([]);
        return;
      }
      setCompetition(fetched);
      setParticipants(fetched.participants);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown error fetching data';
      setError(message);
      setCompetition(null);
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  }

  function handleDraw() {
    const picked = pickRandom(participants);
    setWinner(picked);
  }

  function handleRemoveWinner() {
    if (!winner) return;
    setParticipants((prev) => {
      const idx = prev.indexOf(winner);
      if (idx === -1) return prev;
      const next = prev.slice();
      next.splice(idx, 1);
      return next;
    });
    setWinner(null);
  }

  function handleReset() {
    if (!competition) return;
    setParticipants(competition.participants);
    setWinner(null);
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
