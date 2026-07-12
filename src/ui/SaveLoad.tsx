// Save menu: three manual slots, the autosave (slot 0, written every End
// Turn), and export/import of the full save JSON through a textarea. Pure
// UI; all persistence rules live in the store.

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { MANUAL_SLOTS, slotSummary, useStore } from '../store';
import { formatDate } from '../engine/types';
import { NATIONS_1938 } from '../data/nations';

const styles: Record<string, CSSProperties> = {
  wrap: { position: 'relative' },
  toggle: {
    background: 'var(--bg)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    padding: '7px 14px',
    fontSize: 13,
  },
  panel: {
    position: 'absolute',
    right: 0,
    top: 'calc(100% + 6px)',
    width: 340,
    background: 'var(--bg-raised)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    padding: 12,
    zIndex: 40,
    boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '5px 0',
    borderBottom: '1px solid var(--border)',
  },
  slotLabel: { flex: 1, fontFamily: 'var(--font-doc)', fontSize: 12.5 },
  btn: {
    background: 'var(--bg)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    padding: '4px 10px',
    fontSize: 12,
  },
  textarea: {
    width: '100%',
    height: 80,
    marginTop: 8,
    background: 'var(--bg)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    fontFamily: 'var(--font-doc)',
    fontSize: 11,
    padding: 6,
    resize: 'vertical',
  },
  msg: { marginTop: 8, fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font-doc)' },
};

function describeSlot(slot: number): string {
  const info = slotSummary(slot);
  if (info === null) return 'empty';
  const name = NATIONS_1938[info.nation]?.name ?? info.nation;
  return `${name}, ${formatDate(info.turn)}`;
}

export default function SaveLoad() {
  const saveSlot = useStore((s) => s.saveSlot);
  const loadSlot = useStore((s) => s.loadSlot);
  const exportJSON = useStore((s) => s.exportJSON);
  const importJSON = useStore((s) => s.importJSON);

  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  // Bumped after each save so the slot descriptions re-read localStorage.
  const [, setStamp] = useState(0);

  const doSave = (slot: number) => {
    const ok = saveSlot(slot);
    setMsg(ok ? `Saved to slot ${slot}.` : `Could not save to slot ${slot}.`);
    setStamp((n) => n + 1);
  };
  const doLoad = (slot: number) => {
    const ok = loadSlot(slot);
    setMsg(ok ? `Loaded slot ${slot}.` : `Slot ${slot} is empty or unreadable.`);
  };

  return (
    <div style={styles.wrap}>
      <button type="button" style={styles.toggle} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        Saves
      </button>
      {open && (
        <div style={styles.panel} role="dialog" aria-label="Save and load">
          <div style={styles.row}>
            <span style={styles.slotLabel}>Autosave: {describeSlot(0)}</span>
            <button type="button" style={styles.btn} onClick={() => doLoad(0)} aria-label="Load autosave">
              Load
            </button>
          </div>
          {MANUAL_SLOTS.map((slot) => (
            <div key={slot} style={styles.row}>
              <span style={styles.slotLabel}>Slot {slot}: {describeSlot(slot)}</span>
              <button type="button" style={styles.btn} onClick={() => doSave(slot)} aria-label={`Save to slot ${slot}`}>
                Save
              </button>
              <button type="button" style={styles.btn} onClick={() => doLoad(slot)} aria-label={`Load slot ${slot}`}>
                Load
              </button>
            </div>
          ))}
          <div style={{ ...styles.row, borderBottom: 'none' }}>
            <button
              type="button"
              style={styles.btn}
              onClick={() => {
                const json = exportJSON();
                setText(json ?? '');
                setMsg(json === null ? 'No campaign to export.' : 'Campaign exported below. Copy it somewhere safe.');
              }}
            >
              Export JSON
            </button>
            <button
              type="button"
              style={styles.btn}
              onClick={() => {
                const ok = importJSON(text);
                setMsg(ok ? 'Campaign imported.' : 'That text is not a readable save.');
              }}
            >
              Import JSON
            </button>
          </div>
          <textarea
            aria-label="Save JSON"
            style={styles.textarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Exported save appears here. Paste a save here to import."
          />
          {msg !== '' && <div style={styles.msg}>{msg}</div>}
        </div>
      )}
    </div>
  );
}
