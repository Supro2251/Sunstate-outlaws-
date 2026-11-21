import React, { useEffect, useState } from 'react';
import {
  Cloud,
  CloudDownload,
  CloudUpload,
  Gamepad2,
  Globe,
  Keyboard,
  RotateCcw,
  Settings,
  Sliders,
  Smartphone,
  Monitor,
  Trash2,
  Unlink,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  getActionLabel,
  getContextLabel,
  getUi,
  LANGUAGE_OPTIONS,
} from '../game/i18n';
import {
  ActionBinding,
  ControlActionId,
  ControlContextId,
  DEFAULT_CONTROLS_CONFIG,
  formatKeyCodeLabel,
  formatPadCodeLabel,
  GamepadInputCode,
  GamepadLayoutPreference,
  HudSnapshot,
  InputDeviceType,
  LanguageCode,
  QualityLevel,
  UiModePreference,
} from '../game/types';

interface SettingsModalProps {
  hud: HudSnapshot;
  onSetQuality: (q: QualityLevel) => void;
  onSetLanguage: (lang: LanguageCode) => void;
  onSetUiMode: (pref: UiModePreference) => void;
  onSetGamepadLayout: (pref: GamepadLayoutPreference) => void;
  onSetSteeringSensitivity: (val: number) => void;
  onSetLookSensitivity: (val: number) => void;
  onSaveCloud: (
    syncId: string,
  ) => Promise<{ ok: boolean; syncId?: string; savedAt?: string; error?: string }>;
  onLoadCloud: (
    syncId: string,
  ) => Promise<{ ok: boolean; language?: LanguageCode; error?: string }>;
  onUnlinkCloud: () => void;
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

const VALID_PAD_BUTTONS = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
const CONTEXT_ORDER: ControlContextId[] = ['on_foot', 'car', 'helicopter', 'plane', 'jet'];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  hud,
  onSetQuality,
  onSetLanguage,
  onSetUiMode,
  onSetGamepadLayout,
  onSetSteeringSensitivity,
  onSetLookSensitivity,
  onSaveCloud,
  onLoadCloud,
  onUnlinkCloud,
  onSetHandle,
  onAddFriend,
  onRemoveFriend,
  onUpdateControlBinding,
  onResetControls,
  onCaptureStateChange,
  onResetProgress,
  onClose,
}) => {
  const ui = getUi(hud.language);
  const accentHex = hud.characterTheme.accentHex;

  const [handleInput, setHandleInput] = useState(hud.playerHandle);
  const [friendInput, setFriendInput] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [selectedCtx, setSelectedCtx] = useState<ControlContextId>(hud.activeControlContext);
  const [viewDevice, setViewDevice] = useState<InputDeviceType>(hud.activeInputDevice);
  const [syncIdInput, setSyncIdInput] = useState(hud.cloudSyncId || '');
  const [cloudMsg, setCloudMsg] = useState('');
  const [cloudBusy, setCloudBusy] = useState(false);
  const [capturing, setCapturing] = useState<{
    ctx: ControlContextId;
    action: ControlActionId;
    mode: 'key' | 'pad';
  } | null>(null);

  useEffect(() => {
    setViewDevice(hud.activeInputDevice);
  }, [hud.activeInputDevice]);

  useEffect(() => {
    onCaptureStateChange?.(Boolean(capturing));
    return () => onCaptureStateChange?.(false);
  }, [capturing, onCaptureStateChange]);

  // Keyboard or Gamepad capture listener while rebinding a context-isolated action
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
  const detectedDeviceLabel =
    hud.activeInputDevice === 'touch'
      ? ui.deviceTouch
      : hud.activeInputDevice === 'keyboard'
        ? ui.deviceKeyboard
        : hud.activeInputDevice === 'playstation'
          ? ui.devicePlaystation
          : ui.deviceXbox;

  const handleCloudSave = async () => {
    const clean = syncIdInput.trim();
    if (clean.length < 3 || cloudBusy) return;
    setCloudBusy(true);
    setCloudMsg('');
    const res = await onSaveCloud(clean);
    setCloudBusy(false);
    if (res.ok) {
      setSyncIdInput(res.syncId || clean);
      setCloudMsg(`OK · ${res.syncId} (${hud.language.toUpperCase()})`);
    } else {
      setCloudMsg(res.error || 'Error saving to cloud');
    }
  };

  const handleCloudLoad = async () => {
    const clean = syncIdInput.trim();
    if (clean.length < 3 || cloudBusy) return;
    setCloudBusy(true);
    setCloudMsg('');
    const res = await onLoadCloud(clean);
    setCloudBusy(false);
    if (res.ok) {
      setCloudMsg(getUi(res.language ?? hud.language).cloudLoadedToast);
    } else {
      setCloudMsg(res.error || 'Cloud Save not found');
    }
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-slate-950/85 p-4">
      <div
        className="w-full max-w-3xl rounded-lg bg-slate-900 border shadow-2xl overflow-hidden flex flex-col"
        style={{ borderColor: `${accentHex}55` }}
      >
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5" style={{ color: accentHex }} />
            <div>
              <h2 className="font-display text-lg font-bold text-white">{ui.settingsHeader}</h2>
              <p className="text-xs text-slate-400">{ui.settingsSub}</p>
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
          {/* Language Selection */}
          <div className="p-4 rounded-lg bg-slate-950/80 border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>{ui.langSectionTitle}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono-num">
                {hud.language.toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {LANGUAGE_OPTIONS.map((opt) => {
                const active = hud.language === opt.code;
                return (
                  <button
                    key={opt.code}
                    onClick={() => onSetLanguage(opt.code)}
                    style={
                      active
                        ? { backgroundColor: accentHex, color: '#020617', borderColor: accentHex }
                        : undefined
                    }
                    className={`px-2.5 py-2 rounded border text-center transition-colors ${
                      active
                        ? 'font-bold'
                        : 'bg-slate-900 text-slate-200 border-white/10 hover:bg-slate-800'
                    }`}
                  >
                    {opt.native.split(' ')[0]}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400">{ui.langDefaultHint}</p>
          </div>

          {/* PC / Mobile Interface Auto-Switch */}
          <div className="p-4 rounded-lg bg-slate-950/80 border border-white/10 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold text-white">
                {hud.isMobileUi ? (
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Monitor className="w-4 h-4 text-cyan-400" />
                )}
                <span>{ui.uiModeTitle}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-white/10 text-slate-300">
                {ui.detectedPlatformLabel}:{' '}
                <strong className="text-emerald-300">
                  {hud.detectedPlatform === 'mobile' ? ui.platformMobile : ui.platformPc}
                </strong>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'auto', label: ui.uiModeAuto },
                  { id: 'pc', label: ui.uiModePc },
                  { id: 'mobile', label: ui.uiModeMobile },
                ] as Array<{ id: UiModePreference; label: string }>
              ).map((mode) => {
                const active = hud.uiModePreference === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => onSetUiMode(mode.id)}
                    style={
                      active
                        ? { backgroundColor: accentHex, color: '#020617', borderColor: accentHex }
                        : undefined
                    }
                    className={`min-h-[40px] px-2.5 py-2 rounded border text-center transition-colors ${
                      active
                        ? 'font-bold'
                        : 'bg-slate-900 text-slate-200 border-white/10 hover:bg-slate-800'
                    }`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400">{ui.uiModeHint}</p>
          </div>

          {/* Cloud Save & Progress + Language Sync */}
          <div className="p-4 rounded-lg bg-slate-950/80 border border-sky-500/30 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Cloud className="w-4 h-4 text-sky-400" />
                <span>{ui.cloudSectionTitle}</span>
              </div>
              {hud.cloudLastSavedAt && (
                <span className="text-[10px] text-emerald-300 font-mono-num">
                  {ui.cloudSavedAtLabel}: {new Date(hud.cloudLastSavedAt).toLocaleString()}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300">{ui.cloudDesc}</p>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={syncIdInput}
                onChange={(e) => setSyncIdInput(e.target.value)}
                placeholder={ui.cloudSyncPlaceholder}
                className="flex-1 min-w-[180px] px-3 py-2 rounded bg-slate-900 border border-white/15 text-white outline-none focus:border-sky-400"
              />
              <button
                onClick={() => void handleCloudSave()}
                disabled={cloudBusy || syncIdInput.trim().length < 3}
                className="px-3 py-2 rounded bg-emerald-500 hover:bg-emerald-400 disabled:opacity-45 text-slate-950 font-bold flex items-center gap-1.5"
              >
                <CloudUpload className="w-3.5 h-3.5" /> {ui.cloudSaveBtn}
              </button>
              <button
                onClick={() => void handleCloudLoad()}
                disabled={cloudBusy || syncIdInput.trim().length < 3}
                className="px-3 py-2 rounded bg-sky-500 hover:bg-sky-400 disabled:opacity-45 text-slate-950 font-bold flex items-center gap-1.5"
              >
                <CloudDownload className="w-3.5 h-3.5" /> {ui.cloudLoadBtn}
              </button>
              {hud.cloudSyncId && (
                <button
                  onClick={() => {
                    onUnlinkCloud();
                    setSyncIdInput('');
                    setCloudMsg('');
                  }}
                  className="px-2.5 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 flex items-center gap-1"
                  title={ui.cloudUnlinkBtn}
                >
                  <Unlink className="w-3.5 h-3.5" /> {ui.cloudUnlinkBtn}
                </button>
              )}
            </div>
            {cloudMsg && (
              <div className="px-2.5 py-1.5 rounded bg-slate-900 border border-sky-400/30 text-[11px] text-sky-200">
                {cloudMsg}
              </div>
            )}
          </div>

          {/* Steering & Camera Sensitivity Sliders */}
          <div className="p-4 rounded-lg bg-slate-950/80 border border-white/10 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>{ui.sensitivityTitle}</span>
              </div>
              <button
                onClick={() => {
                  onSetSteeringSensitivity(1.0);
                  onSetLookSensitivity(1.0);
                }}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 text-[11px]"
              >
                {ui.resetSensBtn}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-200 font-medium">{ui.steeringSensLabel}</span>
                  <span className="font-mono-num text-amber-300 font-bold">
                    {Math.round(hud.steeringSensitivity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.3}
                  max={2.5}
                  step={0.05}
                  value={hud.steeringSensitivity}
                  onChange={(e) => onSetSteeringSensitivity(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-200 font-medium">{ui.lookSensLabel}</span>
                  <span className="font-mono-num text-cyan-300 font-bold">
                    {Math.round(hud.lookSensitivity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.3}
                  max={2.5}
                  step={0.05}
                  value={hud.lookSensitivity}
                  onChange={(e) => onSetLookSensitivity(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Device-Specific Control Remapping (Shows ONLY the active/selected device's bindings!) */}
          <div className="p-4 rounded-lg bg-slate-950/80 border border-white/10 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Gamepad2 className="w-4 h-4 text-amber-400" />
                <span>{ui.controlsTitle}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-white/10 text-[10px] text-cyan-300">
                  {ui.activeDeviceBadge}: {detectedDeviceLabel}
                </span>
                <span className={hud.gamepadConnected ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                  {hud.gamepadConnected ? ui.controllerConnected : ui.controllerDisconnected}
                </span>
                <button
                  onClick={() => onResetControls(selectedCtx)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 text-[11px]"
                >
                  {ui.resetDefaultsBtn}
                </button>
              </div>
            </div>

            {/* Active Device / Controller Layout Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded bg-slate-900/90 border border-white/10">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'touch', label: ui.deviceTouch, icon: Smartphone },
                    { id: 'keyboard', label: ui.deviceKeyboard, icon: Keyboard },
                    { id: 'playstation', label: ui.devicePlaystation, icon: Gamepad2 },
                    { id: 'xbox', label: ui.deviceXbox, icon: Gamepad2 },
                  ] as Array<{ id: InputDeviceType; label: string; icon: typeof Keyboard }>
                ).map((dev) => {
                  const Icon = dev.icon;
                  const active = viewDevice === dev.id;
                  return (
                    <button
                      key={dev.id}
                      onClick={() => {
                        setCapturing(null);
                        setViewDevice(dev.id);
                        if (dev.id === 'playstation' || dev.id === 'xbox') {
                          onSetGamepadLayout(dev.id);
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded border text-[11px] flex items-center gap-1.5 ${
                        active
                          ? 'bg-emerald-500 text-slate-950 border-emerald-300 font-bold'
                          : 'bg-slate-950 text-slate-300 border-white/10 hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {dev.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-slate-400">{ui.controllerLayoutLabel}:</span>
                {(['auto', 'playstation', 'xbox'] as GamepadLayoutPreference[]).map((pref) => (
                  <button
                    key={pref}
                    onClick={() => onSetGamepadLayout(pref)}
                    className={`px-2 py-0.5 rounded border text-[10px] ${
                      hud.gamepadLayoutPreference === pref
                        ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-bold'
                        : 'bg-slate-950 text-slate-300 border-white/10 hover:bg-slate-800'
                    }`}
                  >
                    {pref === 'auto' ? ui.layoutAuto : pref === 'playstation' ? 'PS' : 'Xbox'}
                  </button>
                ))}
              </div>
            </div>

            {viewDevice === 'touch' ? (
              <div className="p-3.5 rounded bg-cyan-950/40 border border-cyan-400/35 text-[11px] text-cyan-100 leading-relaxed">
                {ui.touchControlsTip}
              </div>
            ) : (
              <>
                <div className="px-3 py-2 rounded bg-emerald-950/40 border border-emerald-400/25 text-[11px] text-emerald-200">
                  {ui.controlsContextTip}
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
                        style={
                          isSelected
                            ? { backgroundColor: accentHex, color: '#020617', borderColor: accentHex }
                            : undefined
                        }
                        className={`px-2.5 py-1.5 rounded border text-[11px] font-medium transition-colors ${
                          isSelected
                            ? 'font-bold'
                            : 'bg-slate-900 text-slate-300 border-white/10 hover:bg-slate-800'
                        }`}
                      >
                        {getContextLabel(ctxId, hud.language)}
                        {isCurrent ? ' ●' : ''}
                      </button>
                    );
                  })}
                </div>

                {(selectedCtx === 'plane' || selectedCtx === 'jet' || selectedCtx === 'helicopter') && (
                  <div className="px-3 py-2 rounded bg-sky-950/50 border border-sky-400/30 text-[11px] text-sky-200">
                    {ui.flightTip}
                  </div>
                )}

                <div className="divide-y divide-white/10 border border-white/10 rounded-md overflow-hidden bg-slate-900/60">
                  {contextActions.map((action) => {
                    const binding = hud.controlsConfig[selectedCtx]?.[action] ?? { key: '', pad: '' };
                    const isKeyboard = viewDevice === 'keyboard';
                    const cap =
                      capturing?.ctx === selectedCtx &&
                      capturing.action === action &&
                      capturing.mode === (isKeyboard ? 'key' : 'pad');

                    return (
                      <div
                        key={action}
                        className="px-3 py-2 flex items-center justify-between gap-2 text-[11px]"
                      >
                        <span className="text-slate-200 font-medium">
                          {getActionLabel(action, hud.language)}
                        </span>
                        {isKeyboard ? (
                          <button
                            onClick={() => setCapturing({ ctx: selectedCtx, action, mode: 'key' })}
                            className={`min-w-[126px] px-3 py-1 rounded border flex items-center justify-center gap-1.5 font-mono-num ${
                              cap
                                ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold'
                                : 'bg-slate-950 hover:bg-slate-800 text-slate-100 border-white/15'
                            }`}
                          >
                            <Keyboard className="w-3.5 h-3.5 opacity-75" />
                            <span>
                              {cap ? ui.pressKeyPrompt : formatKeyCodeLabel(binding.key, hud.language)}
                            </span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setCapturing({ ctx: selectedCtx, action, mode: 'pad' })}
                            className={`min-w-[140px] px-3 py-1 rounded border flex items-center justify-center gap-1.5 font-mono-num ${
                              cap
                                ? 'bg-emerald-400 text-slate-950 border-emerald-200 font-bold'
                                : 'bg-slate-950 hover:bg-slate-800 text-amber-300 border-white/15'
                            }`}
                          >
                            <Gamepad2 className="w-3.5 h-3.5 opacity-75" />
                            <span>
                              {cap
                                ? ui.pressPadPrompt
                                : formatPadCodeLabel(binding.pad, viewDevice, hud.language)}
                            </span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Multiplayer Profile & Friends */}
          <div className="p-4 rounded-lg bg-slate-950/80 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>{ui.multiplayerTitle}</span>
              </div>
              <span className="text-[11px] text-emerald-400">
                {ui.onlineFriendsCount}: {hud.onlineFriends.length}
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value)}
                placeholder={ui.handlePlaceholder}
                className="flex-1 px-3 py-2 rounded bg-slate-900 border border-white/15 text-white outline-none focus:border-cyan-400"
              />
              <button
                onClick={() => onSetHandle(handleInput)}
                className="px-3 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
              >
                {ui.saveHandleBtn}
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={friendInput}
                onChange={(e) => setFriendInput(e.target.value)}
                placeholder={ui.friendPlaceholder}
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
                <UserPlus className="w-4 h-4" /> {ui.addFriendBtn}
              </button>
            </div>

            <p className="text-[11px] text-slate-400">{ui.friendsHint}</p>

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
              <span className="font-semibold text-white">{ui.graphicsQualityTitle}</span>
              <span className="font-mono-num text-cyan-300">{hud.fps} FPS</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'high', label: ui.qualHighFull },
                  { id: 'medium', label: ui.qualMedFull },
                  { id: 'performance', label: ui.qualPerfFull },
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
              <div className="font-semibold text-rose-200">{ui.resetAllTitle}</div>
              <div className="text-[11px] text-rose-300/80">{ui.resetAllDesc}</div>
            </div>
            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="px-3 py-2 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-1.5 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" /> {ui.resetAllBtn}
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
                  {ui.confirmDeleteBtn}
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="px-2.5 py-2 rounded bg-slate-800 text-slate-200"
                >
                  {ui.cancelBtn}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
