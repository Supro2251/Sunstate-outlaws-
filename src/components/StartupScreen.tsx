import React from 'react';
import { Award, Car, Gamepad2, Home, MapPin, Play, ShieldCheck, Users } from 'lucide-react';
import { CHARACTERS, CharacterId, getReputationRank, SHOPS } from '../game/types';

interface StartupScreenProps {
  selectedCharacter: CharacterId;
  onSelectCharacter: (id: CharacterId) => void;
  onStartGame: () => void;
}

export const StartupScreen: React.FC<StartupScreenProps> = ({
  selectedCharacter,
  onSelectCharacter,
  onStartGame,
}) => {
  const activeProfile = CHARACTERS[selectedCharacter];
  const activeTheme = activeProfile.uiTheme;

  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex flex-col justify-between p-5 md:p-9 bg-gradient-to-t from-slate-950 via-slate-950/55 to-slate-950/80 overflow-y-auto">
      {/* Top Brand Showcase Header adapted to active character */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div
            className="text-xs font-semibold tracking-widest uppercase mb-1"
            style={{ color: activeTheme.accentHex }}
          >
            PALMETTO BAY & CORAL KEYS COUNTY · REŽIM {activeProfile.name.toUpperCase()}
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-white">
            SUNSTATE OUTLAWS:{' '}
            <span style={{ color: activeTheme.accentHex }}>NEON TIDE</span>
          </h1>
          <p className="text-sm text-slate-300 mt-1.5 max-w-2xl">
            Rozsiahly 3D otvorený svet s cestami, parkami, plážami, letiskami, vstupnými budovami, plynulým počasím, AI mestom, 20 príbehovými a 25 náhodnými výzvami.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-slate-200">
          <div className="px-3 py-1.5 rounded bg-slate-900/90 border border-white/10 flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-amber-400" /> 11 áut, vrtuľníkov & lietadiel
          </div>
          <div className="px-3 py-1.5 rounded bg-slate-900/90 border border-white/10 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" style={{ color: activeTheme.accentHex }} /> {SHOPS.length} vstupných budov
          </div>
          <div className="px-3 py-1.5 rounded bg-slate-900/90 border border-white/10 flex items-center gap-1.5">
            <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" /> PS4 / PS5 ovládač
          </div>
          <div className="px-3 py-1.5 rounded bg-slate-900/90 border border-white/10 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-sky-400" /> Co-op multiplayer
          </div>
        </div>
      </div>

      {/* Bottom 3-Character Selector Cards & Launch Button */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-end justify-between gap-4 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
          {(['dante', 'elena', 'kairo'] as CharacterId[]).map((id) => {
            const p = CHARACTERS[id];
            const active = selectedCharacter === id;
            const rank = getReputationRank(p.startingReputation, id);
            return (
              <button
                key={id}
                onClick={() => onSelectCharacter(id)}
                style={
                  active
                    ? {
                        borderColor: p.uiTheme.accentHex,
                        boxShadow: `0 12px 28px -12px ${p.uiTheme.accentHex}88`,
                      }
                    : undefined
                }
                className={`p-4 rounded-lg border text-left transition-all flex flex-col justify-between ${
                  active
                    ? 'bg-slate-900/95'
                    : 'bg-slate-950/88 border-white/12 hover:bg-slate-900/90'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-display text-base font-bold text-white">{p.name}</span>
                    <span
                      className="text-[11px] font-semibold"
                      style={{ color: p.uiTheme.accentHex }}
                    >
                      {p.role}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
                    {p.lifeStory}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] mb-2">
                    <span className="text-slate-200 flex items-center gap-1">
                      <Home className="w-3 h-3" style={{ color: p.uiTheme.accentHex }} />
                      {p.homeName}
                    </span>
                    <span className="text-amber-300 flex items-center gap-1">
                      <Award className="w-3 h-3" /> {rank} ({p.startingReputation} RP)
                    </span>
                  </div>

                  <div className="text-xs text-emerald-300 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> {p.strengthNote}
                  </div>
                  <div className="text-[11px] text-rose-300 mt-0.5">{p.weaknessNote}</div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-white/10 space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono-num">
                    <span className="text-emerald-400 font-semibold">
                      Hotovosť ${p.startingCash.toLocaleString()}
                    </span>
                    <span className="text-sky-300">
                      Banka ${p.startingBank.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-300 font-mono-num">
                    <span>Šofér {p.startingSkills.driving}%</span>
                    <span>Muška {p.startingSkills.shooting}%</span>
                    <span>Let {p.startingSkills.flying}%</span>
                    <span>Výdrž {p.startingSkills.stamina}%</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={onStartGame}
          style={{
            background: `linear-gradient(135deg, ${activeTheme.accentHex}, ${activeTheme.secondaryHex})`,
          }}
          className="px-8 py-4 rounded-lg text-slate-950 font-display text-lg font-bold tracking-wide shadow-xl flex items-center justify-center gap-2.5 shrink-0 hover:brightness-110 transition-all"
        >
          <Play className="w-5 h-5 fill-slate-950" /> HRAŤ ZA {activeProfile.name.split(' ')[0].toUpperCase()}
        </button>
      </div>
    </div>
  );
};
