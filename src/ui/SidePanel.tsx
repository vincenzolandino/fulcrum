// The right-hand briefing cabinet: seven tabbed panels over the same store.
// Pure shell — each tab body is its own component; this file only owns which
// drawer is open.

import { useState } from 'react';
import type { CSSProperties } from 'react';
import ReportsPanel from './ReportsPanel';
import FrontsPanel from './FrontsPanel';
import ProductionPanel from './ProductionPanel';
import ResearchPanel from './ResearchPanel';
import DiplomacyPanel from './DiplomacyPanel';
import CovertPanel from './CovertPanel';
import ChroniclePanel from './ChroniclePanel';

const TABS = [
  { id: 'reports', label: 'Reports' },
  { id: 'fronts', label: 'Fronts' },
  { id: 'production', label: 'Production' },
  { id: 'research', label: 'Research' },
  { id: 'diplomacy', label: 'Diplomacy' },
  { id: 'covert', label: 'Covert' },
  { id: 'chronicle', label: 'Chronicle' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const styles: Record<string, CSSProperties> = {
  shell: {
    width: 400,
    minWidth: 320,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-raised)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  tabBar: {
    display: 'flex',
    flexWrap: 'wrap',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg)',
  },
  tab: {
    flex: '1 0 auto',
    padding: '7px 8px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--text-dim)',
    fontSize: 11,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  tabActive: {
    color: 'var(--accent)',
    borderBottomColor: 'var(--accent)',
  },
  body: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: 12,
  },
};

export default function SidePanel() {
  const [active, setActive] = useState<TabId>('reports');

  return (
    <aside style={styles.shell} aria-label="Briefing panels">
      <div role="tablist" aria-label="Briefing tabs" style={styles.tabBar}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            style={{ ...styles.tab, ...(active === t.id ? styles.tabActive : undefined) }}
            onClick={() => setActive(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={styles.body} role="tabpanel">
        {active === 'reports' && <ReportsPanel />}
        {active === 'fronts' && <FrontsPanel />}
        {active === 'production' && <ProductionPanel />}
        {active === 'research' && <ResearchPanel />}
        {active === 'diplomacy' && <DiplomacyPanel />}
        {active === 'covert' && <CovertPanel />}
        {active === 'chronicle' && <ChroniclePanel />}
      </div>
    </aside>
  );
}
