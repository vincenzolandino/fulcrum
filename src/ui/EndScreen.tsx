// History's verdict. When the game ends the store flips to this screen: the
// verdict headline, the score, the generated epilogue, and the full chronicle
// offered as a downloadable record. One button back to the map room.

import type { CSSProperties } from 'react';
import { useStore } from '../store';
import { formatDate } from '../engine/types';

const styles: Record<string, CSSProperties> = {
  wrap: { minHeight: '100%', display: 'grid', placeItems: 'center', padding: 24 },
  doc: { maxWidth: 680, width: '100%', padding: '34px 40px', boxShadow: '0 6px 40px rgba(0,0,0,0.5)' },
  verdict: { margin: '0 0 4px', fontSize: 30, lineHeight: 1.1 },
  score: { fontFamily: 'var(--font-doc)', fontSize: 13, letterSpacing: '0.08em', color: 'var(--ink)', opacity: 0.7, marginBottom: 20 },
  epilogue: { whiteSpace: 'pre-wrap', fontSize: 14.5, lineHeight: 1.66 },
  rule: { border: 'none', borderTop: '1px solid rgba(38,34,26,0.25)', margin: '22px 0' },
  chronHead: { fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 8, fontFamily: 'var(--font-doc)' },
  chronEntry: { fontSize: 12.5, lineHeight: 1.5, marginBottom: 5 },
  chronDate: { opacity: 0.55, marginRight: 6 },
  diverge: { color: 'var(--comintern)', fontWeight: 600 },
  actions: { display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' },
  btn: {
    background: 'var(--ink)', color: 'var(--paper)', border: 'none',
    borderRadius: 3, padding: '10px 20px', fontFamily: 'var(--font-doc)', fontSize: 13,
  },
  btnGhost: {
    background: 'transparent', color: 'var(--ink)', border: '1px solid var(--ink)',
    borderRadius: 3, padding: '10px 20px', fontFamily: 'var(--font-doc)', fontSize: 13,
  },
};

export default function EndScreen() {
  const game = useStore((s) => s.game);
  const reset = useStore((s) => s.reset);
  if (game === null || game.gameOver === null) return null;

  const { verdict, score, epilogue } = game.gameOver;
  const nation = game.nations[game.playerNation];

  const exportChronicle = () => {
    const lines = game.chronicle.map(
      (e) => `${formatDate(e.turn)}${e.divergence ? '  [DIVERGENCE]' : ''}\n${e.text}\n`,
    );
    const header = `FULCRUM — ${nation?.name ?? game.playerNation}, 1938–${formatDate(game.turn).split(' ')[1]}\n${verdict} (score ${score})\n\n${epilogue}\n\n${'='.repeat(48)}\nTHE CHRONICLE\n\n`;
    const blob = new Blob([header + lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fulcrum-${game.playerNation.toLowerCase()}-chronicle.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.wrap}>
      <div className="doc" style={styles.doc}>
        <h1 style={styles.verdict}>{verdict}</h1>
        <div style={styles.score}>
          {nation?.name ?? game.playerNation} — final score {score} — {formatDate(game.turn)}
        </div>
        <div style={styles.epilogue}>{epilogue}</div>

        {game.chronicle.length > 0 && (
          <>
            <hr style={styles.rule} />
            <div style={styles.chronHead}>How history turned</div>
            {game.chronicle
              .filter((e) => e.divergence)
              .slice(0, 12)
              .map((e, i) => (
                <div key={i} style={styles.chronEntry}>
                  <span style={styles.chronDate}>{formatDate(e.turn)}</span>
                  <span style={styles.diverge}>{e.text}</span>
                </div>
              ))}
          </>
        )}

        <div style={styles.actions}>
          <button type="button" style={styles.btn} onClick={reset}>
            New campaign
          </button>
          <button type="button" style={styles.btnGhost} onClick={exportChronicle}>
            Download the chronicle
          </button>
        </div>
      </div>
    </div>
  );
}
