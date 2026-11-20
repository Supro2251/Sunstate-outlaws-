import React from 'react';
import { X } from 'lucide-react';
import {
  BeardStyleId,
  CharacterCustomization,
  HairStyleId,
  HudSnapshot,
  NeonColorId,
  ShopLocation,
  TattooStyleId,
  TimePreset,
  VEHICLE_SPECS,
  VehicleTypeId,
} from '../game/types';

interface ShopModalProps {
  shop: ShopLocation;
  hud: HudSnapshot;
  onClose: () => void;
  onBuySnack: (name: string, cost: number, heal: number, armor?: number) => void;
  onVehicleMod: (
    action: 'repair' | 'paint' | 'engine' | 'turbo' | 'handling' | 'neon',
    value?: number | NeonColorId,
  ) => void;
  onBuyArmory: (item: 'pistol' | 'smg' | 'ammo_pistol' | 'ammo_smg' | 'armor' | 'parachute') => void;
  onUpdateStyle: (
    patch: Partial<CharacterCustomization>,
    cost: number,
    label: string,
    updateSkinTex?: boolean,
  ) => void;
  onBankAction: (action: 'deposit' | 'withdraw' | 'heist_job', amount?: number) => void;
  onDealershipVehicle: (type: VehicleTypeId, purchase: boolean) => void;
  onSafehouseAction: (action: 'rest' | 'save' | 'time', preset?: TimePreset) => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  shop,
  hud,
  onClose,
  onBuySnack,
  onVehicleMod,
  onBuyArmory,
  onUpdateStyle,
  onBankAction,
  onDealershipVehicle,
  onSafehouseAction,
}) => {
  return (
    <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-slate-950/78 p-4">
      <div className="w-full max-w-xl rounded-lg bg-slate-900 border border-white/15 shadow-2xl overflow-hidden">
        <div
          className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between"
          style={{ borderTop: `3px solid ${shop.color}` }}
        >
          <div>
            <h2 className="font-display text-lg font-bold text-white">{shop.name}</h2>
            <p className="text-xs text-slate-400">{shop.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono-num text-sm font-bold text-emerald-400">
              ${hud.cash.toLocaleString()}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
          {shop.category === 'convenience' && (
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { name: 'SunState Soda', cost: 15, heal: 25, armor: 0, desc: '+25 Zdravie' },
                { name: 'Cuban Espresso', cost: 25, heal: 40, armor: 0, desc: '+40 Zdravie' },
                { name: 'Tropical Bento', cost: 50, heal: 85, armor: 0, desc: '+85 Zdravie' },
                { name: 'Neon Surge Energy', cost: 65, heal: 60, armor: 25, desc: '+60 HP & +25 Vesta' },
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={() => onBuySnack(item.name, item.cost, item.heal, item.armor)}
                  className="p-3 rounded bg-slate-950/80 hover:bg-slate-800 border border-white/10 text-left flex justify-between items-center"
                >
                  <div>
                    <div className="font-semibold text-white">{item.name}</div>
                    <div className="text-slate-400">{item.desc}</div>
                  </div>
                  <span className="font-mono-num text-emerald-400 font-bold">${item.cost}</span>
                </button>
              ))}
            </div>
          )}

          {shop.category === 'customs' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onVehicleMod('repair')}
                  className="p-3 rounded bg-slate-950/80 hover:bg-slate-800 border border-white/10 text-left flex justify-between"
                >
                  <span className="font-semibold text-white">Oprava karosérie & motora</span>
                  <span className="font-mono-num text-emerald-400">$150</span>
                </button>
                <button
                  onClick={() => onVehicleMod('engine')}
                  className="p-3 rounded bg-slate-950/80 hover:bg-slate-800 border border-white/10 text-left flex justify-between"
                >
                  <span className="font-semibold text-white">
                    Tuning motora (Lv.{hud.vehicleUpgrades.engineLevel}/3)
                  </span>
                  <span className="font-mono-num text-emerald-400">
                    ${600 + hud.vehicleUpgrades.engineLevel * 350}
                  </span>
                </button>
                <button
                  onClick={() => onVehicleMod('turbo')}
                  className="p-3 rounded bg-slate-950/80 hover:bg-slate-800 border border-white/10 text-left flex justify-between"
                >
                  <span className="font-semibold text-white">
                    {hud.vehicleUpgrades.turboInstalled ? 'Twin-Turbo (Osadené)' : 'Inštalovať Twin-Turbo'}
                  </span>
                  <span className="font-mono-num text-emerald-400">$950</span>
                </button>
                <button
                  onClick={() => onVehicleMod('handling')}
                  className="p-3 rounded bg-slate-950/80 hover:bg-slate-800 border border-white/10 text-left flex justify-between"
                >
                  <span className="font-semibold text-white">
                    Podvozok & Brzdy (Lv.{hud.vehicleUpgrades.handlingLevel}/2)
                  </span>
                  <span className="font-mono-num text-emerald-400">
                    ${450 + hud.vehicleUpgrades.handlingLevel * 300}
                  </span>
                </button>
              </div>

              <div>
                <div className="text-slate-300 font-semibold mb-1.5">Metalický lak ($200)</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Flamingo Pink', hex: 0xff2a6d },
                    { name: 'Electric Cyan', hex: 0x05d9e8 },
                    { name: 'Solar Amber', hex: 0xf59e0b },
                    { name: 'Pearl White', hex: 0xf8fafc },
                    { name: 'Obsidian', hex: 0x1e293b },
                    { name: 'Ultraviolet', hex: 0x8b5cf6 },
                    { name: 'Emerald', hex: 0x10b981 },
                  ].map((c) => (
                    <button
                      key={c.name}
                      onClick={() => onVehicleMod('paint', c.hex)}
                      className="px-2.5 py-1.5 rounded bg-slate-950/80 hover:bg-slate-800 border border-white/10 flex items-center gap-1.5 text-slate-200"
                    >
                      <span
                        className="w-3 h-3 rounded-sm inline-block"
                        style={{ backgroundColor: `#${c.hex.toString(16).padStart(6, '0')}` }}
                      />
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-slate-300 font-semibold mb-1.5">Podsvietenie Neón ($350)</div>
                <div className="flex flex-wrap gap-2">
                  {(['off', 'cyan', 'pink', 'lime', 'amber'] as NeonColorId[]).map((n) => (
                    <button
                      key={n}
                      onClick={() => onVehicleMod('neon', n)}
                      className={`px-3 py-1.5 rounded border capitalize ${
                        hud.vehicleUpgrades.neonColor === n
                          ? 'bg-purple-500 text-white border-purple-300 font-semibold'
                          : 'bg-slate-950/80 text-slate-200 border-white/10 hover:bg-slate-800'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {shop.category === 'armory' && (
            <div className="space-y-3">
              <div className="p-2.5 rounded bg-amber-950/50 border border-amber-400/30 text-amber-200">
                Tip: V zadnej časti obchodu sa nachádza živá strelnica s pohyblivými terčmi! Strieľaj na ne pre tréning mušky a odmeny.
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => onBuyArmory('pistol')}
                  className="p-3 rounded bg-slate-950/80 hover:bg-slate-800 border border-white/10 text-left flex justify-between"
                >
                  <div>
                    <div className="font-semibold text-white">Viper 9mm</div>
                    <div className="text-slate-400">
                      {hud.unlockedWeapons.pistol ? 'Vlastnená · Doplniť' : 'Odomknúť pištoľ'}
                    </div>
                  </div>
                  <span className="font-mono-num text-emerald-400">$300</span>
                </button>
                <button
                  onClick={() => onBuyArmory('smg')}
                  className="p-3 rounded bg-slate-950/80 hover:bg-slate-800 border border-white/10 text-left flex justify-between"
                >
                  <div>
                    <div className="font-semibold text-white">Tide-9 SMG</div>
                    <div className="text-slate-400">
                      {hud.unlockedWeapons.smg ? 'Vlastnené · Doplniť' : 'Rýchlopalný samopal'}
                    </div>
                  </div>
                  <span className="font-mono-num text-emerald-400">$750</span>
                </button>
                <button
                  onClick={() => onBuyArmory('ammo_pistol')}
                  className="p-3 rounded bg-slate-950/80 hover:bg-slate-800 border border-white/10 text-left flex justify-between"
                >
                  <span className="font-semibold text-white">Náboje 9mm (Plný zásobník)</span>
                  <span className="font-mono-num text-emerald-400">$120</span>
                </button>
                <button
                  onClick={() => onBuyArmory('ammo_smg')}
                  className="p-3 rounded bg-slate-950/80 hover:bg-slate-800 border border-white/10 text-left flex justify-between"
                >
                  <span className="font-semibold text-white">Náboje SMG (Plný zásobník)</span>
                  <span className="font-mono-num text-emerald-400">$220</span>
                </button>
                <button
                  onClick={() => onBuyArmory('armor')}
                  className="p-3 rounded bg-slate-950/80 hover:bg-slate-800 border border-white/10 text-left flex justify-between"
                >
                  <div>
                    <div className="font-semibold text-white">Nepriestrelná vesta</div>
                    <div className="text-slate-400">Doplní vestu na 100%</div>
                  </div>
                  <span className="font-mono-num text-emerald-400">$350</span>
                </button>
                <button
                  onClick={() => onBuyArmory('parachute')}
                  className="p-3 rounded bg-slate-950/80 hover:bg-slate-800 border border-white/10 text-left flex justify-between"
                >
                  <div>
                    <div className="font-semibold text-white">Padák</div>
                    <div className="text-slate-400">
                      {hud.hasParachute ? 'Zbalený na chrbte' : 'Pre zoskoky z lietadiel & striech'}
                    </div>
                  </div>
                  <span className="font-mono-num text-emerald-400">$250</span>
                </button>
              </div>
            </div>
          )}

          {shop.category === 'clothing' && (
            <div className="space-y-3">
              <div>
                <div className="text-slate-300 font-semibold mb-1.5">Bundy & Saká ($120)</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Miami Cyan', hex: 0x06b6d4 },
                    { name: 'Flamingo Rose', hex: 0xf43f5e },
                    { name: 'Midnight Leather', hex: 0x0f172a },
                    { name: 'Ivory Linen', hex: 0xf1f5f9 },
                    { name: 'Sunset Gold', hex: 0xf59e0b },
                    { name: 'Emerald Bomber', hex: 0x10b981 },
                  ].map((item) => (
                    <button
                      key={item.name}
                      onClick={() => onUpdateStyle({ jacketColor: item.hex }, 120, item.name)}
                      className="px-2.5 py-1.5 rounded bg-slate-950/80 hover:bg-slate-800 border border-white/10 text-slate-100 flex items-center gap-1.5"
                    >
                      <span
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: `#${item.hex.toString(16).padStart(6, '0')}` }}
                      />
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-slate-300 font-semibold mb-1.5">Nohavice ($80)</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Tmavá bridlica', hex: 0x1e293b },
                    { name: 'Piesková béžová', hex: 0xd6d3d1 },
                    { name: 'Indigo Denim', hex: 0x1e3a8a },
                    { name: 'Čierna', hex: 0x09090b },
                  ].map((item) => (
                    <button
                      key={item.name}
                      onClick={() => onUpdateStyle({ pantsColor: item.hex }, 80, item.name)}
                      className="px-2.5 py-1.5 rounded bg-slate-950/80 hover:bg-slate-800 border border-white/10 text-slate-100"
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-slate-300 font-semibold mb-1.5">Okuliare ($60)</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Obsidian', hex: 0x0f172a },
                    { name: 'Zlatá', hex: 0xf59e0b },
                    { name: 'Neónová modrá', hex: 0x0284c7 },
                    { name: 'Ružová', hex: 0xe11d48 },
                  ].map((item) => (
                    <button
                      key={item.name}
                      onClick={() => onUpdateStyle({ shadesColor: item.hex }, 60, item.name)}
                      className="px-2.5 py-1.5 rounded bg-slate-950/80 hover:bg-slate-800 border border-white/10 text-slate-100"
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {shop.category === 'barber' && (
            <div className="space-y-3">
              <div>
                <div className="text-slate-300 font-semibold mb-1.5">Účesy ($75)</div>
                <div className="grid grid-cols-2 gap-2">
                  {(['fade', 'slick', 'waves', 'buzz'] as HairStyleId[]).map((h) => (
                    <button
                      key={h}
                      onClick={() => onUpdateStyle({ hairStyle: h }, 75, `Strih: ${h}`)}
                      className={`p-2.5 rounded border capitalize text-left ${
                        hud.customization.hairStyle === h
                          ? 'bg-amber-500 text-slate-950 font-semibold border-amber-300'
                          : 'bg-slate-950/80 text-slate-100 border-white/10 hover:bg-slate-800'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-slate-300 font-semibold mb-1.5">Brada ($50)</div>
                <div className="grid grid-cols-2 gap-2">
                  {(['clean', 'stubble', 'goatee', 'full'] as BeardStyleId[]).map((b) => (
                    <button
                      key={b}
                      onClick={() => onUpdateStyle({ beardStyle: b }, 50, `Brada: ${b}`, true)}
                      className={`p-2.5 rounded border capitalize text-left ${
                        hud.customization.beardStyle === b
                          ? 'bg-amber-500 text-slate-950 font-semibold border-amber-300'
                          : 'bg-slate-950/80 text-slate-100 border-white/10 hover:bg-slate-800'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-slate-300 font-semibold mb-1.5">Farba vlasov ($40)</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Čierna', hex: 0x171717 },
                    { name: 'Hnedá Espresso', hex: 0x3b2314 },
                    { name: 'Platinová', hex: 0xe2e8f0 },
                    { name: 'Neónová tyrkysová', hex: 0x06b6d4 },
                  ].map((c) => (
                    <button
                      key={c.name}
                      onClick={() => onUpdateStyle({ hairColor: c.hex }, 40, c.name)}
                      className="px-2.5 py-1.5 rounded bg-slate-950/80 hover:bg-slate-800 border border-white/10 text-slate-100"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {shop.category === 'tattoo' && (
            <div className="grid grid-cols-2 gap-2.5">
              {(
                [
                  { id: 'serpent', name: 'Neónový Had (Rukáv)', cost: 200 },
                  { id: 'compass', name: 'Kompas Coral Keys', cost: 180 },
                  { id: 'sunstate', name: 'Erb Sunstate', cost: 220 },
                  { id: 'none', name: 'Laserové odstránenie', cost: 100 },
                ] as Array<{ id: TattooStyleId; name: string; cost: number }>
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => onUpdateStyle({ tattooStyle: t.id }, t.cost, t.name, true)}
                  className={`p-3 rounded border text-left flex justify-between items-center ${
                    hud.customization.tattooStyle === t.id
                      ? 'bg-purple-950 border-purple-400 text-white'
                      : 'bg-slate-950/80 hover:bg-slate-800 border-white/10 text-slate-200'
                  }`}
                >
                  <span className="font-semibold">{t.name}</span>
                  <span className="font-mono-num text-emerald-400">${t.cost}</span>
                </button>
              ))}
            </div>
          )}

          {shop.category === 'bank' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 p-3 rounded bg-slate-950 border border-white/10">
                <div>
                  <div className="text-slate-400">Hotovosť pri sebe</div>
                  <div className="font-mono-num text-lg font-bold text-emerald-400">
                    ${hud.cash.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Účet Apex Trust</div>
                  <div className="font-mono-num text-lg font-bold text-sky-400">
                    ${hud.bankBalance.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onBankAction('deposit', 500)}
                  className="p-2.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-semibold"
                >
                  Vložiť $500
                </button>
                <button
                  onClick={() => onBankAction('withdraw', 500)}
                  className="p-2.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-semibold"
                >
                  Vybrať $500
                </button>
                <button
                  onClick={() => {
                    onBankAction('heist_job');
                    onClose();
                  }}
                  className="p-3 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold col-span-2"
                >
                  Spustiť Bankovú Lúpež — Zlatá horúčka (+$4,800)
                </button>
              </div>
            </div>
          )}

          {shop.category === 'dealership' && (
            <div className="space-y-2.5">
              {(['veloce', 'solstice', 'brawler', 'terramax', 'taxi', 'helicopter', 'plane'] as VehicleTypeId[]).map(
                (vId) => {
                  const spec = VEHICLE_SPECS[vId];
                  return (
                    <div
                      key={vId}
                      className="p-3 rounded bg-slate-950/80 border border-white/10 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-semibold text-white">{spec.name}</div>
                        <div className="text-slate-400">
                          {spec.category} · Max {Math.round(spec.maxSpeed * 3.6)} km/h
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            onDealershipVehicle(vId, false);
                            onClose();
                          }}
                          className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                        >
                          Vyskúšať
                        </button>
                        <button
                          onClick={() => {
                            onDealershipVehicle(vId, true);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono-num"
                        >
                          Kúpiť ${spec.price}
                        </button>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}

          {shop.category === 'safehouse' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => onSafehouseAction('rest')}
                  className="p-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  Oddych (100% HP & Bez polície)
                </button>
                <button
                  onClick={() => onSafehouseAction('save')}
                  className="p-3 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold"
                >
                  Uložiť hru
                </button>
              </div>
              <div>
                <div className="text-slate-300 font-semibold mb-1.5">Posunúť dennú dobu</div>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'dawn', label: 'Ráno' },
                      { id: 'noon', label: 'Poludnie' },
                      { id: 'golden', label: 'Podvečer' },
                      { id: 'night', label: 'Noc' },
                    ] as Array<{ id: TimePreset; label: string }>
                  ).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onSafehouseAction('time', p.id)}
                      className="p-2 rounded bg-slate-950/80 hover:bg-slate-800 border border-white/10 text-slate-100"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
