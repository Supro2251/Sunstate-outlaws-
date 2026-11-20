import React from 'react';
import { Play, ShieldCheck, Car, MapPin, Users } from 'lucide-react';
import { CHARACTERS, CharacterId } from '../game/types';

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
  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex flex-col justify-between p-6 md:p-10 bg-gradient-to-t from-slate-950 via-slate-950/45 to-slate-950/75">
      {/* Top Brand Showcase Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold tracking-widest uppercase text-cyan-400 mb-1">
            PALMETTO BAY & CORAL KEYS COUNTY
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-white">
            SUNSTATE OUTLAWS: <span className="text-rose-500">NEON TIDE</span>
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Rozsiahly 3D otvorený svet s cestami, mostami, lesnými trasami, letiskami, vstupnými obchodmi, 20 príbehovými a 25 tajnými misiami.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-slate-200">
          <div className="px-3 py-1.5 rounded bg-slate-900/90 border border-white/10 flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-amber-400" /> 11 vozidiel & lietadiel
          </div>
          <div className="px-3 py-1.5 rounded bg-slate-900/90 border border-white/10 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" /> 14 otvorených obchodov
          </div>
          <div className="px-3 py-1.5 rounded bg-slate-900/90 border border-white/10 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-emerald-400" /> Multiplayer s kamarátmi
          </div>
        </div>
      </div>

      {/* Bottom Character Showcase Cards & Start Button */}
      <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
          {(['dante', 'elena'] as CharacterId[]).map((id) => {
            const p = CHARACTERS[id];
            const active = selectedCharacter === id;
            return (
              <button
                key={id}
                onClick={() => onSelectCharacter(id)}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  active
                    ? 'bg-slate-900/95 border-cyan-400 shadow-lg'
                    : 'bg-slate-950/85 border-white/12 hover:bg-slate-900/90'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display text-base font-bold text-white">{p.name}</span>
                  <span className="text-[11px] font-semibold text-amber-400">{p.role}</span>
                </div>
                <div className="text-xs text-emerald-300 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> {p.strengthNote}
                </div>
                <div className="text-[11px] text-rose-300 mt-0.5">{p.weaknessNote}</div>
                <div className="mt-2 pt-2 border-t border-white/10 flex justify-between text-[11px] text-slate-300 font-mono-num">
                  <span>Šoférovanie {p.startingSkills.driving}%</span>
                  <span>Streľba {p.startingSkills.shooting}%</span>
                  <span>Let {p.startingSkills.flying}%</span>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={onStartGame}
          className="px-8 py-4 rounded-lg bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-display text-lg font-bold tracking-wide shadow-xl flex items-center justify-center gap-2.5 shrink-0"
        >
          <Play className="w-5 h-5 fill-slate-950" /> SPUSTIŤ HRU
        </button>
      </div>
    </div>
  );
};
