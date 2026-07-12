// Screen router: picker -> game -> end, driven entirely by the store. The game
// screen is the war room — a top command bar, the map table, and the briefing
// cabinet on the right. Forced decisions overlay as a paper document; the end
// screen replaces everything when history renders its verdict.

import type { CSSProperties } from 'react';
import { useStore } from './store';
import NationPicker from './ui/NationPicker';
import TopBar from './ui/TopBar';
import MapView from './ui/MapView';
import RegionPopover from './ui/RegionPopover';
import SidePanel from './ui/SidePanel';
import EventModal from './ui/EventModal';
import BattleSpotlight from './ui/BattleSpotlight';
import EndScreen from './ui/EndScreen';

const styles: Record<string, CSSProperties> = {
  frame: { display: 'flex', flexDirection: 'column', height: '100%' },
};

function GameScreen() {
  const game = useStore((s) => s.game);
  const selected = useStore((s) => s.selectedRegion);
  const setSelectedRegion = useStore((s) => s.setSelectedRegion);
  if (game === null) return null;

  return (
    <div style={styles.frame}>
      <TopBar />
      <main className="game-body">
        <div className="game-map">
          <MapView
            state={game}
            selected={selected}
            onSelect={setSelectedRegion}
            playerNation={game.playerNation}
          />
          <RegionPopover />
        </div>
        <SidePanel />
      </main>
      <EventModal />
      <BattleSpotlight />
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
