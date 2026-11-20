import React, { useEffect, useState } from 'react';
import { Gamepad2, Keyboard, RotateCcw, Settings, UserPlus, Users, X, Trash2 } from 'lucide-react';
import {
  ACTION_LABELS_SK,
  ActionBinding,
  CONTEXT_LABELS_SK,
  ControlActionId,
  ControlContextId,
  DEFAULT_CONTROLS_CONFIG,
  formatKeyCodeLabel,
  formatPadCodeLabel,
  GamepadInputCode,
  HudSnapshot,
  QualityLevel,
} from '../game/types';

interface SettingsModalProps {
  hud: HudSnapshot;
  onSetQuality: (q: QualityLevel) => void;
  onSetHandle: (handle: string) => void;
  onAddFriend: (handle: string) => void;
  onRemoveFriend: (handle: string) => void;
  onUpdateControlBinding: (
    ctx: ControlContextId,
    action: ControlActionId,
    patch: Partial<ActionBinding>,
  ) => void;
  onResetControls: (ctx?: ControlContextId) => void;
  onCaptureStateChange?: (capturing: boolean) => void;
  onResetProgress: () => void;
  onClose: () => void;
}

const VALID_PAD_BUTTONS = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 13, 14, 15]);
const CONTEXT_ORDER: ControlContextId[] = ['on_foot', 'car', 'helicopter', 'plane', 'jet'];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  hud,
  onSetQuality,
  onSetHandle,
  onAddFriend,
  onRemoveFriend,
  onUpdateControlBinding,
  onResetControls,
  onCaptureStateChange,
  onResetProgress,
  onClose,
}) => {
  const [handleInput, setHandleInput] = useState(hud.playerHandle);
  const [friendInput, setFriendInput] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [selectedCtx, setSelectedCtx] = useState<ControlContextId>(hud.activeControlContext);
  const [capturing, setCapturing] = useState<{
    ctx: ControlContextId;
    action: ControlActionId;
    mode: 'key' | 'pad';
  } | null>(null);

  useEffect(() => {
    onCaptureStateChange?.(Boolean(capturing));
    return () => onCaptureStateChange?.(false);
  }, [capturing, onCaptureStateChange]);

  // Keyboard or Gamepad capture listener while user is rebinding an action
  useEffect(() => {
    if (!capturing) return;

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        setCapturing(null);
        return;
      }
      if (capturing.mode === 'key') {
        onUpdateControlBinding(capturing.ctx, capturing.action, { key: e.code });
        setCapturing(null);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);

    let rafId = 0;
    let baselineButtons: boolean[] | null = null;
    if (capturing.mode === 'pad') {
      const poll = () => {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        const pad = Array.from(pads).find((p) => p && p.connected) ?? null;
        if (pad) {
          if (!baselineButtons) {
            baselineButtons = pad.buttons.map((b) => b.pressed);
          } else {
            for (let i = 0; i < pad.buttons.length; i++) {
              if (!VALID_PAD_BUTTONS.has(i)) continue;
              if (pad.buttons[i]?.pressed && !baselineButtons[i]) {
                onUpdateControlBinding(capturing.ctx, capturing.action, {
                  pad: `BTN_${i}` as GamepadInputCode,
                });
                setCapturing(null);
                return;
              }
            }
            const lx = pad.axes[0] ?? 0;
            const ly = pad.axes[1] ?? 0;
            if (Math.abs(lx) > 0.65) {
              onUpdateControlBinding(capturing.ctx, capturing.action, {
                pad: lx < 0 ? 'AXIS_LX_NEG' : 'AXIS_LX_POS',
              });
              setCapturing(null);
              return;
            }
            if (Math.abs(ly) > 0.65) {
              onUpdateControlBinding(capturing.ctx, capturing.action, {
                pad: ly < 0 ? 'AXIS_LY_NEG' : 'AXIS_LY_POS',
              });
              setCapturing(null);
              return;
            }
            baselineButtons = pad.buttons.map((b) => b.pressed);
          }
        }
        rafId = requestAnimationFrame(poll);
      };
      rafId = requestAnimationFrame(poll);
    }

    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [capturing, onUpdateControlBinding]);

  const contextActions = Object.keys(DEFAULT_CONTROLS_CONFIG[selectedCtx]) as ControlActionId[];

  return (
    <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-slate-950/85 p-4">
      <div className="w-full max-w-3xl rounded-lg bg-slate-900 border border-white/15 shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                Nastavenia, Ovládanie (GTA V) & Multiplayer
              </h2>
              <p className="text-xs text-slate-400">
                Uprav si klávesy a tlačidlá ovládača pre každé vozidlo zvlášť, grafiku a priateľov
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[78vh] overflow-y-auto text-xs">
          {/* Per-Vehicle & On-Foot Control Remapping (Keyboard + Native GTA V Gamepad) */}
          <div className="p-4 rounded-lg bg-slate-950/80 border border-white/10 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Gamepad2 className="w-4 h-4 text-amber-400" />
                <span>Mapovanie klávesov a ovládača podľa vozidla</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={hud.gamepadConnected ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                  {hud.gamepadConnected ? 'Ovládač pripojený' : 'Ovládač nepripojený'}
                </span>
                <button
                  onClick={() => onResetControls(selectedCtx)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 text-[11px]"
                >
                  Obnoviť GTA V predvolené
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {CONTEXT_ORDER.map((ctxId) => {
                const isSelected = selectedCtx === ctxId;
                const isCurrent = hud.activeControlContext === ctxId;
                return (
                  <button
                    key={ctxId}
                    onClick={() => {
                      setCapturing(null);
                      setSelectedCtx(ctxId);
                    }}
                    className={`px-2.5 py-1.5 rounded border text-[11px] font-medium transition-colors ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-bold'
                        : 'bg-slate-900 text-slate-300 border-white/10 hover:bg-slate-800'
                    }`}
                  >
                    {CONTEXT_LABELS_SK[ctxId]}
                    {isCurrent ? ' (Aktívne)' : ''}
                  </button>
                );
              })}
            </div>

            {(selectedCtx === 'plane' || selectedCtx === 'jet' || selectedCtx === 'helicopter') && (
              <div className="px-3 py-2 rounded bg-sky-950/50 border border-sky-400/30 text-[11px] text-sky-200">
                Letecké riadenie: Potiahnutím ľavej páčky <strong>DOLE</strong> zdvihneš nos <strong>HORE</strong> (stúpanie). Zatlačením páčky <strong>HORE</strong> sklopíš nos <strong>DOLE</strong> (klesanie).
              </div>
            )}

            <div className="divide-y divide-white/10 border border-white/10 rounded-md overflow-hidden bg-slate-900/60">
              {contextActions.map((action) => {
                const binding = hud.controlsConfig[selectedCtx]?.[action] ?? { key: '', pad: '' };
                const capKey =
                  capturing?.ctx === selectedCtx &&
                  capturing.action === action &&
                  capturing.mode === 'key';
                const capPad =
                  capturing?.ctx === selectedCtx &&
                  capturing.action === action &&
                  capturing.mode === 'pad';

                return (
                  <div
                    key={action}
                    className="px-3 py-2 flex items-center justify-between gap-2 text-[11px]"
                  >
                    <span className="text-slate-200 font-medium">{ACTION_LABELS_SK[action]}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setCapturing({ ctx: selectedCtx, action, mode: 'key' })}
                        className={`min-w-[96px] px-2.5 py-1 rounded border flex items-center justify-center gap-1.5 font-mono-num ${
                          capKey
                            ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold'
                            : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border-white/15'
                        }`}
                        title="Klikni a stlač kláves na priradenie"
                      >
                        <Keyboard className="w-3 h-3 opacity-75" />
                        <span>{capKey ? 'Stlač kláves...' : formatKeyCodeLabel(binding.key)}</span>
                      </button>

                      <button
                        onClick={() => setCapturing({ ctx: selectedCtx, action, mode: 'pad' })}
                        className={`min-w-[110px] px-2.5 py-1 rounded border flex items-center justify-center gap-1.5 font-mono-num ${
                          capPad
                            ? 'bg-emerald-400 text-slate-950 border-emerald-200 font-bold'
                            : 'bg-slate-950 hover:bg-slate-800 text-amber-300 border-white/15'
                        }`}
                        title="Klikni a stlač tlačidlo alebo páčku na ovládači"
                      >
                        <Gamepad2 className="w-3 h-3 opacity-75" />
                        <span>{capPad ? 'Pohni / stlač...' : formatPadCodeLabel(binding.pad)}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Multiplayer Profile & Friends */}
          <div className="p-4 rounded-lg bg-slate-950/80 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Multiplayer & Kamaráti</span>
              </div>
              <span className="text-[11px] text-emerald-400">
                Online priatelia v meste: {hud.onlineFriends.length}
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value)}
                placeholder="Tvoja prezývka..."
                className="flex-1 px-3 py-2 rounded bg-slate-900 border border-white/15 text-white outline-none focus:border-cyan-400"
              />
              <button
                onClick={() => onSetHandle(handleInput)}
                className="px-3 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
              >
                Uložiť meno
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={friendInput}
                onChange={(e) => setFriendInput(e.target.value)}
                placeholder="Zadaj prezývku kamaráta..."
                className="flex-1 px-3 py-2 rounded bg-slate-900 border border-white/15 text-white outline-none focus:border-emerald-400"
              />
              <button
                onClick={() => {
                  if (friendInput.trim()) {
                    onAddFriend(friendInput.trim());
                    setFriendInput('');
                  }
                }}
                className="px-3 py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" /> Pridať kamaráta
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Keď sa kamarát zo zoznamu pripojí do hry pod svojou prezývkou, automaticky ho stretneš priamo v meste Palmetto Bay bez pozvánky!
            </p>

            {hud.friends.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {hud.friends.map((f) => {
                  const isOnline = hud.onlineFriends.some(
                    (o) => o.handle.toLowerCase() === f.toLowerCase(),
                  );
                  return (
                    <div
                      key={f}
                      className={`px-2.5 py-1 rounded border flex items-center gap-2 ${
                        isOnline
                          ? 'bg-emerald-950/70 border-emerald-400/50 text-emerald-200'
                          : 'bg-slate-900 border-white/10 text-slate-300'
                      }`}
                    >
                      <span>{f}</span>
                      <span className="text-[10px] opacity-75">
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                      <button
                        onClick={() => onRemoveFriend(f)}
                        className="text-slate-400 hover:text-rose-400"
                        title="Odstrániť"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Graphics & Hardware Performance */}
          <div className="p-4 rounded-lg bg-slate-950/80 border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Grafická kvalita (Optimalizované bez prežiarenia)</span>
              <span className="font-mono-num text-cyan-300">{hud.fps} FPS</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'high', label: 'Vysoká (Tiene + Bloom)' },
                  { id: 'medium', label: 'Stredná (Vyvážená)' },
                  { id: 'performance', label: 'Výkon (30+ FPS iGPU)' },
                ] as Array<{ id: QualityLevel; label: string }>
              ).map((q) => (
                <button
                  key={q.id}
                  onClick={() => onSetQuality(q.id)}
                  className={`p-2.5 rounded border text-center ${
                    hud.quality === q.id
                      ? 'bg-purple-500 text-white border-purple-300 font-semibold'
                      : 'bg-slate-900 text-slate-300 border-white/10 hover:bg-slate-800'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Full Reset */}
          <div className="p-4 rounded-lg bg-rose-950/35 border border-rose-500/30 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-rose-200">Začať hru úplne odznova</div>
              <div className="text-[11px] text-rose-300/80">
                Vymaže peniaze oboch postáv, schopnosti, zbrane aj splnené misie.
              </div>
            </div>
            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="px-3 py-2 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-1.5 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Resetovať hru
              </button>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    onResetProgress();
                    setConfirmReset(false);
                    onClose();
                  }}
                  className="px-3 py-2 rounded bg-rose-500 hover:bg-rose-400 text-white font-bold"
                >
                  Potvrdiť zmazanie
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="px-2.5 py-2 rounded bg-slate-800 text-slate-200"
                >
                  Zrušiť
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
