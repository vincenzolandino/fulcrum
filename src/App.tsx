// Screen router: picker -> game -> end, driven entirely by the store. The game
// screen is the war room — a top command bar, the map table, and the briefing
// cabinet on the right. Forced decisions overlay as a paper document; the end
// screen replaces everything when history renders its verdict.

import type { CSSProperties } from 'react';
import { useStore } from './store';
import NationPicker from './ui/NationPicker';
import TopBar from './ui/TopBar';
import MapView from './ui/MapView';
import SidePanel from './ui/SidePanel';
import EventModal from './ui/EventModal';
import EndScreen from './ui/EndScreen';

const styles: Record<string, CSSProperties> = {
  frame: { display: 'flex', flexDirection: 'column', height: '100%' },
  body: { flex: 1, minHeight: 0, display: 'flex', gap: 12, padding: 12 },
  mapWrap: {
    flex: 1,
    minWidth: 0,
    border: '1px solid var(--border)',
    borderRadius: 3,
    overflow: 'hidden',
    background: 'var(--bg)',
  },
};

function GameScreen() {
  const game = useStore((s) => s.game);
  const selected = useStore((s) => s.selectedRegion);
  const setSelectedRegion = useStore((s) => s.setSelectedRegion);
  if (game === null) return null;

  return (
    <div style={styles.frame}>
      <TopBar />
      <main style={styles.body}>
        <div style={styles.mapWrap}>
          <MapView
            state={game}
            selected={selected}
            onSelect={setSelectedRegion}
            playerNation={game.playerNation}
          />
        </div>
        <SidePanel />
      </main>
      <EventModal />
    </div>
  );
}

export default function App() {
  const screen = useStore((s) => s.screen);
  const hasGame = useStore((s) => s.game !== null);
  if (screen === 'game' && hasGame) return <GameScreen />;
  if (screen === 'end' && hasGame) return <EndScreen />;
  return <NationPicker />;
}
