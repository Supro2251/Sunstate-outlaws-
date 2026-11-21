import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Camera,
  Car,
  ChevronLeft,
  ChevronRight,
  Compass,
  Crosshair,
  DoorOpen,
  Flame,
  Footprints,
  MessageSquare,
  Radio,
  Shield,
  Store,
  Wind,
} from 'lucide-react';
import { getUi } from '../game/i18n';
import { ControlActionId, HudSnapshot } from '../game/types';

interface MobileControlsOverlayProps {
  hud: HudSnapshot;
  modalOpen: boolean;
  onVirtualJoystick: (x: number, y: number) => void;
  onVirtualAction: (action: ControlActionId, active: boolean) => void;
  onDiscreteAction: (
    kind: 'interact' | 'camera' | 'radio' | 'weapon_next' | 'npc_talk' | 'parachute',
  ) => void;
  onOpenNearbyShop: () => void;
  onStartHiddenMission: (id: string) => void;
}

interface HoldButtonProps {
  label: string;
  active?: boolean;
  accentHex?: string;
  className?: string;
  onActiveChange: (active: boolean) => void;
  children?: React.ReactNode;
}

const HoldTouchButton: React.FC<HoldButtonProps> = ({
  label,
  active = false,
  accentHex,
  className = '',
  onActiveChange,
  children,
}) => {
  const pointerIdRef = useRef<number | null>(null);
  const [pressed, setPressed] = useState(false);

  const release = () => {
    if (pointerIdRef.current !== null) {
      pointerIdRef.current = null;
      setPressed(false);
      onActiveChange(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pointerIdRef.current !== null) {
        onActiveChange(false);
      }
    };
  }, [onActiveChange]);

  const isOn = pressed || active;

  return (
    <button
      type="button"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (pointerIdRef.current === null) {
          pointerIdRef.current = e.pointerId;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // Ignore capture errors
          }
          setPressed(true);
          onActiveChange(true);
        }
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.pointerId === pointerIdRef.current) {
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {
            // Ignore
          }
          release();
        }
      }}
      onPointerCancel={(e) => {
        e.stopPropagation();
        if (e.pointerId === pointerIdRef.current) release();
      }}
      onLostPointerCapture={() => release()}
      style={
        isOn && accentHex
          ? {
              borderColor: accentHex,
              backgroundColor: `${accentHex}38`,
            }
          : undefined
      }
      className={`touch-none select-none min-w-[46px] min-h-[46px] rounded-xl border flex flex-col items-center justify-center gap-0.5 font-display font-bold tracking-wider transition-transform active:scale-95 ${
        isOn
          ? 'bg-slate-800/95 border-white/60 text-white shadow-lg'
          : 'bg-slate-950/72 border-white/20 text-slate-100'
      } ${className}`}
    >
      {children}
      <span className="text-[10px] leading-none">{label}</span>
    </button>
  );
};

export const MobileControlsOverlay: React.FC<MobileControlsOverlayProps> = ({
  hud,
  modalOpen,
  onVirtualJoystick,
  onVirtualAction,
  onDiscreteAction,
  onOpenNearbyShop,
  onStartHiddenMission,
}) => {
  const ui = getUi(hud.language);
  const accentHex = hud.characterTheme.accentHex;

  const stickBaseRef = useRef<HTMLDivElement>(null);
  const stickPointerIdRef = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const [aimToggled, setAimToggled] = useState(false);
  const [sprintToggled, setSprintToggled] = useState(false);

  // Sync toggles cleanly when entering vehicles or closing overlay
  useEffect(() => {
    if (hud.inVehicle || hud.wasted || modalOpen) {
      if (aimToggled) {
        setAimToggled(false);
        onVirtualAction('aim', false);
      }
      if (sprintToggled) {
        setSprintToggled(false);
        onVirtualAction('sprint', false);
      }
    }
  }, [hud.inVehicle, hud.wasted, modalOpen, aimToggled, sprintToggled, onVirtualAction]);

  // Reset stick & held inputs on unmount/modal open
  useEffect(() => {
    if (modalOpen) {
      stickPointerIdRef.current = null;
      setKnobOffset({ x: 0, y: 0 });
      onVirtualJoystick(0, 0);
    }
  }, [modalOpen, onVirtualJoystick]);

  if (!hud.isMobileUi || hud.cutscene.active || hud.wasted || modalOpen) {
    return null;
  }

  const updateStickFromPointer = (clientX: number, clientY: number) => {
    const el = stickBaseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    const maxRadius = rect.width * 0.38;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius && dist > 0) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    setKnobOffset({ x: dx, y: dy });
    const normX = Math.abs(dx / maxRadius) < 0.08 ? 0 : dx / maxRadius;
    const normY = Math.abs(dy / maxRadius) < 0.08 ? 0 : -dy / maxRadius; // Up is +1
    onVirtualJoystick(normX, normY);
  };

  const resetStick = () => {
    stickPointerIdRef.current = null;
    setKnobOffset({ x: 0, y: 0 });
    onVirtualJoystick(0, 0);
  };

  const isCar = hud.inVehicle && hud.vehicleKind === 'car';
  const isHeli = hud.inVehicle && hud.vehicleKind === 'helicopter';
  const isPlane = hud.inVehicle && hud.vehicleKind === 'plane';
  const weaponShort =
    hud.weaponId === 'fists'
      ? ui.fistsLabel
      : hud.weaponId === 'pistol'
        ? '9mm'
        : 'SMG';

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex items-end justify-between gap-2 px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {/* LEFT THUMB ZONE: Steering Buttons for Cars OR Virtual Analog Joystick */}
      <div className="pointer-events-auto flex items-end gap-2">
        {isCar ? (
          <div className="flex items-center gap-2.5 bg-slate-950/45 p-1.5 rounded-2xl border border-white/10 backdrop-blur-[2px]">
            <HoldTouchButton
              label={ui.touchLeft}
              accentHex={accentHex}
              className="w-16 h-16 rounded-2xl"
              onActiveChange={(act) => onVirtualAction('left', act)}
            >
              <ChevronLeft className="w-7 h-7" />
            </HoldTouchButton>
            <HoldTouchButton
              label={ui.touchRight}
              accentHex={accentHex}
              className="w-16 h-16 rounded-2xl"
              onActiveChange={(act) => onVirtualAction('right', act)}
            >
              <ChevronRight className="w-7 h-7" />
            </HoldTouchButton>
          </div>
        ) : (
          <div
            ref={stickBaseRef}
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (stickPointerIdRef.current === null) {
                stickPointerIdRef.current = e.pointerId;
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  // Ignore
                }
                updateStickFromPointer(e.clientX, e.clientY);
              }
            }}
            onPointerMove={(e) => {
              if (e.pointerId !== stickPointerIdRef.current) return;
              e.preventDefault();
              e.stopPropagation();
              updateStickFromPointer(e.clientX, e.clientY);
            }}
            onPointerUp={(e) => {
              if (e.pointerId !== stickPointerIdRef.current) return;
              e.preventDefault();
              e.stopPropagation();
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {
                // Ignore
              }
              resetStick();
            }}
            onPointerCancel={(e) => {
              if (e.pointerId === stickPointerIdRef.current) resetStick();
            }}
            onLostPointerCapture={() => resetStick()}
            style={{ borderColor: `${accentHex}55` }}
            className="relative w-32 h-32 rounded-full bg-slate-950/55 border-2 shadow-xl touch-none select-none flex items-center justify-center backdrop-blur-[2px]"
          >
            <div className="w-20 h-20 rounded-full border border-white/10 pointer-events-none" />
            <div
              style={{
                transform: `translate3d(${knobOffset.x}px, ${knobOffset.y}px, 0)`,
                borderColor: accentHex,
                backgroundColor: `${accentHex}35`,
              }}
              className="absolute w-12 h-12 rounded-full border-2 shadow-lg pointer-events-none flex items-center justify-center"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: accentHex }}
              />
            </div>
          </div>
        )}
      </div>

      {/* CENTER-BOTTOM FLOATING HINTS / PROMPT */}
      <div className="pointer-events-none hidden sm:flex flex-col items-center pb-1">
        <span className="text-[10px] text-slate-300/75 bg-slate-950/55 px-2.5 py-0.5 rounded border border-white/10">
          {ui.mobileLookHint}
        </span>
      </div>

      {/* RIGHT THUMB ZONE: Context-Specific Action Cluster */}
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        {/* Contextual Nearby Actions (Shop, Hidden Mission, NPC, Enter Car, Parachute) */}
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {!hud.inVehicle && hud.parachuteReady && (
            <button
              type="button"
              onClick={() => onDiscreteAction('parachute')}
              className="min-h-[44px] px-3.5 rounded-xl bg-cyan-400 text-slate-950 font-display text-xs font-bold shadow-lg flex items-center gap-1.5 active:scale-95"
            >
              <Wind className="w-4 h-4" /> {ui.touchChute}
            </button>
          )}
          {!hud.inVehicle && hud.nearbyHiddenMission && !hud.mission.activeId && (
            <button
              type="button"
              onClick={() => onStartHiddenMission(hud.nearbyHiddenMission!.id)}
              className="min-h-[44px] px-3 rounded-xl bg-amber-400 text-slate-950 font-display text-xs font-bold shadow-lg flex items-center gap-1.5 active:scale-95"
            >
              <Compass className="w-4 h-4" /> {ui.touchMission} +${hud.nearbyHiddenMission.reward}
            </button>
          )}
          {hud.nearbyShop && (
            <button
              type="button"
              onClick={onOpenNearbyShop}
              style={{ backgroundColor: accentHex }}
              className="min-h-[44px] px-3 rounded-xl text-slate-950 font-display text-xs font-bold shadow-lg flex items-center gap-1.5 active:scale-95"
            >
              <Store className="w-4 h-4" /> {ui.touchShop}
            </button>
          )}
          {!hud.inVehicle && hud.nearbyInteractNpc && !hud.nearbyShop && (
            <button
              type="button"
              onClick={() => onDiscreteAction('npc_talk')}
              className="min-h-[44px] px-3 rounded-xl bg-cyan-400 text-slate-950 font-display text-xs font-bold shadow-lg flex items-center gap-1.5 active:scale-95"
            >
              <MessageSquare className="w-4 h-4" /> {ui.touchTalk}
            </button>
          )}
          {!hud.inVehicle && hud.promptText && !hud.nearbyShop && (
            <button
              type="button"
              onClick={() => onDiscreteAction('interact')}
              style={{ borderColor: accentHex }}
              className="min-h-[44px] px-3.5 rounded-xl bg-slate-900/92 border text-white font-display text-xs font-bold shadow-lg flex items-center gap-1.5 active:scale-95"
            >
              <Car className="w-4 h-4" style={{ color: accentHex }} /> {ui.touchEnter}
            </button>
          )}
        </div>

        {/* Main Right-Side Controls */}
        {!hud.inVehicle ? (
          <div className="flex items-end gap-2">
            {/* Column 1: Gun switch, Aim toggle, Sprint toggle */}
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={() => onDiscreteAction('weapon_next')}
                className="min-w-[52px] min-h-[46px] px-2.5 rounded-xl bg-slate-950/78 border border-white/20 text-slate-100 font-display text-[10px] font-bold flex flex-col items-center justify-center active:scale-95"
              >
                <span className="text-amber-300">{weaponShort}</span>
                <span className="text-[9px] text-slate-400">
                  {hud.weaponId === 'fists' ? ui.touchWeapon : hud.ammo[hud.weaponId]}
                </span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = !sprintToggled;
                    setSprintToggled(next);
                    onVirtualAction('sprint', next);
                  }}
                  style={
                    sprintToggled
                      ? { backgroundColor: `${accentHex}40`, borderColor: accentHex }
                      : undefined
                  }
                  className={`min-w-[48px] min-h-[48px] rounded-xl border flex flex-col items-center justify-center gap-0.5 font-display font-bold active:scale-95 ${
                    sprintToggled
                      ? 'text-white'
                      : 'bg-slate-950/75 border-white/20 text-slate-200'
                  }`}
                >
                  <Footprints className="w-4 h-4" />
                  <span className="text-[9px]">{ui.touchSprint}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = !aimToggled;
                    setAimToggled(next);
                    onVirtualAction('aim', next);
                  }}
                  className={`min-w-[48px] min-h-[48px] rounded-xl border flex flex-col items-center justify-center gap-0.5 font-display font-bold active:scale-95 ${
                    aimToggled
                      ? 'bg-amber-500/35 border-amber-300 text-amber-200'
                      : 'bg-slate-950/75 border-white/20 text-slate-200'
                  }`}
                >
                  <Crosshair className="w-4 h-4" />
                  <span className="text-[9px]">{ui.touchAim}</span>
                </button>
              </div>
            </div>

            {/* Column 2: Jump + Large Primary Fire */}
            <div className="flex flex-col items-center gap-2">
              <HoldTouchButton
                label={hud.parachuteReady ? ui.touchChute : ui.touchJump}
                className="w-14 h-12 rounded-xl"
                onActiveChange={(act) => onVirtualAction('jump', act)}
              >
                <ArrowUp className="w-4 h-4" />
              </HoldTouchButton>
              <HoldTouchButton
                label={ui.touchFire}
                accentHex="#f43f5e"
                className="w-16 h-16 rounded-2xl border-rose-400/50 bg-rose-950/70"
                onActiveChange={(act) => onVirtualAction('fire', act)}
              >
                <Flame className="w-6 h-6 text-rose-300" />
              </HoldTouchButton>
            </div>
          </div>
        ) : isCar ? (
          <div className="flex flex-col items-end gap-2">
            {/* Car Utility Row: Fire (Water Cannon), Radio, Cam, Exit */}
            <div className="flex items-center gap-1.5">
              {hud.vehicleName.toLowerCase().includes('hasi') && (
                <HoldTouchButton
                  label={ui.touchFire}
                  accentHex="#38bdf8"
                  className="w-12 h-11 rounded-xl"
                  onActiveChange={(act) => onVirtualAction('fire', act)}
                >
                  <Shield className="w-4 h-4 text-sky-300" />
                </HoldTouchButton>
              )}
              <button
                type="button"
                onClick={() => onDiscreteAction('radio')}
                className="min-w-[44px] min-h-[44px] px-2 rounded-xl bg-slate-950/78 border border-white/20 text-emerald-300 flex flex-col items-center justify-center active:scale-95"
              >
                <Radio className="w-4 h-4" />
                <span className="text-[9px] font-bold">{ui.radioBtn}</span>
              </button>
              <button
                type="button"
                onClick={() => onDiscreteAction('camera')}
                className="min-w-[44px] min-h-[44px] px-2 rounded-xl bg-slate-950/78 border border-white/20 text-amber-300 flex flex-col items-center justify-center active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span className="text-[9px] font-bold">CAM</span>
              </button>
              <button
                type="button"
                onClick={() => onDiscreteAction('interact')}
                className="min-w-[52px] min-h-[44px] px-2.5 rounded-xl bg-rose-950/80 border border-rose-400/45 text-rose-200 flex flex-col items-center justify-center active:scale-95"
              >
                <DoorOpen className="w-4 h-4" />
                <span className="text-[9px] font-bold">{ui.touchExit}</span>
              </button>
            </div>

            {/* Car Driving Pedals: Handbrake, Brake/Reverse, Gas */}
            <div className="flex items-end gap-2">
              <HoldTouchButton
                label={ui.touchDrift}
                accentHex="#f59e0b"
                className="w-13 h-13 rounded-xl"
                onActiveChange={(act) => onVirtualAction('handbrake', act)}
              />
              <HoldTouchButton
                label={ui.touchBrake}
                accentHex="#fb7185"
                className="w-14 h-16 rounded-2xl border-rose-400/40"
                onActiveChange={(act) => onVirtualAction('backward', act)}
              >
                <ArrowDown className="w-5 h-5 text-rose-300" />
              </HoldTouchButton>
              <HoldTouchButton
                label={ui.touchGas}
                accentHex="#34d399"
                className="w-16 h-20 rounded-2xl border-emerald-400/50 bg-emerald-950/65"
                onActiveChange={(act) => onVirtualAction('forward', act)}
              >
                <ArrowUp className="w-6 h-6 text-emerald-300" />
              </HoldTouchButton>
            </div>
          </div>
        ) : isHeli ? (
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5">
              <HoldTouchButton
                label="YAW L"
                className="w-12 h-11 rounded-xl"
                onActiveChange={(act) => onVirtualAction('yawLeft', act)}
              />
              <HoldTouchButton
                label="YAW R"
                className="w-12 h-11 rounded-xl"
                onActiveChange={(act) => onVirtualAction('yawRight', act)}
              />
              <button
                type="button"
                onClick={() => onDiscreteAction('camera')}
                className="min-w-[44px] min-h-[44px] px-2 rounded-xl bg-slate-950/78 border border-white/20 text-amber-300 flex flex-col items-center justify-center active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span className="text-[9px] font-bold">CAM</span>
              </button>
              <button
                type="button"
                onClick={() => onDiscreteAction('interact')}
                className="min-w-[50px] min-h-[44px] px-2 rounded-xl bg-rose-950/80 border border-rose-400/45 text-rose-200 flex flex-col items-center justify-center active:scale-95"
              >
                <DoorOpen className="w-4 h-4" />
                <span className="text-[9px] font-bold">{ui.touchExit}</span>
              </button>
            </div>
            <div className="flex items-end gap-2">
              <HoldTouchButton
                label={ui.touchDown}
                accentHex="#fb7185"
                className="w-14 h-16 rounded-2xl"
                onActiveChange={(act) => onVirtualAction('backward', act)}
              >
                <ArrowDown className="w-5 h-5 text-rose-300" />
              </HoldTouchButton>
              <HoldTouchButton
                label={ui.touchUp}
                accentHex="#34d399"
                className="w-16 h-16 rounded-2xl border-emerald-400/50 bg-emerald-950/65"
                onActiveChange={(act) => onVirtualAction('forward', act)}
              >
                <ArrowUp className="w-6 h-6 text-emerald-300" />
              </HoldTouchButton>
            </div>
          </div>
        ) : (
          /* Plane or Fighter Jet */
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5">
              {hud.activeControlContext === 'jet' && (
                <HoldTouchButton
                  label={ui.touchFire}
                  accentHex="#f43f5e"
                  className="w-14 h-12 rounded-xl border-rose-400/50 bg-rose-950/70"
                  onActiveChange={(act) => onVirtualAction('fire', act)}
                >
                  <Flame className="w-4 h-4 text-rose-300" />
                </HoldTouchButton>
              )}
              <button
                type="button"
                onClick={() => onDiscreteAction('camera')}
                className="min-w-[44px] min-h-[44px] px-2 rounded-xl bg-slate-950/78 border border-white/20 text-amber-300 flex flex-col items-center justify-center active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span className="text-[9px] font-bold">CAM</span>
              </button>
              <button
                type="button"
                onClick={() => onDiscreteAction('interact')}
                className="min-w-[50px] min-h-[44px] px-2 rounded-xl bg-rose-950/80 border border-rose-400/45 text-rose-200 flex flex-col items-center justify-center active:scale-95"
              >
                <DoorOpen className="w-4 h-4" />
                <span className="text-[9px] font-bold">{ui.touchExit}</span>
              </button>
            </div>
            <div className="flex items-end gap-2">
              <HoldTouchButton
                label={ui.touchBrake}
                accentHex="#fb7185"
                className="w-14 h-16 rounded-2xl"
                onActiveChange={(act) => onVirtualAction('backward', act)}
              >
                <ArrowDown className="w-5 h-5 text-rose-300" />
              </HoldTouchButton>
              <HoldTouchButton
                label={ui.touchGas}
                accentHex="#34d399"
                className="w-16 h-16 rounded-2xl border-emerald-400/50 bg-emerald-950/65"
                onActiveChange={(act) => onVirtualAction('forward', act)}
              >
                <ArrowUp className="w-6 h-6 text-emerald-300" />
              </HoldTouchButton>
            </div>
          </div>
        )}
      </div>

      {/* Hidden unused reference lint guard if isPlane */}
      {isPlane && null}
    </div>
  );
};
